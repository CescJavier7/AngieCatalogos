import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  aCentavos,
  anularPago,
  confirmarPago,
  desglosarImpuesto,
  payphoneEnabled,
  prepararPago,
  urlTienda,
  type ConfirmRespuesta,
} from "../../lib/payphone"

/**
 * Pasarela PayPhone (Cajita de Pago) como proveedor de pagos de Medusa.
 *
 * El flujo tiene tres tiempos y el dinero solo se cobra en el último:
 *
 *  1. `initiatePayment` → Prepare. PayPhone devuelve un enlace; la tienda
 *     manda ahí a la clienta y ella pone su tarjeta en el sitio de PayPhone.
 *     Nosotros nunca vemos ni tocamos el número de la tarjeta.
 *  2. Al volver, la tienda avisa a /store/payphone/confirmar, que guarda el
 *     id de la transacción dentro de la sesión de pago. Todavía no hay cobro:
 *     el dinero está retenido y PayPhone lo reversa solo si nadie confirma en
 *     5 minutos.
 *  3. Al completar el carrito, Medusa llama a `authorizePayment` y recién ahí
 *     va el Confirm, que es el que cobra de verdad. Eso deja la validación de
 *     stock ANTES del cobro: si el pedido no se puede armar, no se cobra.
 *
 * Ese orden es el motivo de que el id de la transacción tenga que viajar por
 * la sesión: `authorizePayment` no recibe nada del navegador.
 */

/** Lo que guardamos en la sesión de pago. Es público: nada sensible aquí. */
type DatosSesion = {
  /** clientTransactionId con el que se abrió la transacción en PayPhone. */
  referencia?: string
  /** Identificador de la Cajita, útil para rastrear en su panel. */
  paymentId?: string
  /** Enlace al formulario de tarjeta. */
  payWithCard?: string
  /** Enlace equivalente para pagar desde la app de PayPhone o por QR. */
  payWithPayPhone?: string
  /** Total en centavos con el que se abrió: se compara al confirmar. */
  totalCentavos?: number
  /** Carrito al que vuelve la clienta tras pagar. */
  cart_id?: string
  /** Id numérico que PayPhone entrega en el regreso. Lo pone la ruta de la tienda. */
  transaccionId?: number
  /** Respuesta del Confirm, ya cobrada. */
  confirmacion?: ConfirmRespuesta
}

/** Lo que la tienda manda al crear la sesión. La cédula no se guarda. */
type EntradaTienda = DatosSesion & {
  session_id?: string
  documento?: string
  telefono?: string
}

class PayphoneProviderService extends AbstractPaymentProvider {
  static identifier = "payphone"

  protected readonly logger_: Logger

  constructor(container: { logger: Logger }, options: Record<string, unknown>) {
    super(container, options)
    this.logger_ = container.logger
  }

  static validateOptions() {
    if (!payphoneEnabled()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "PayPhone está registrado como proveedor pero falta PAYPHONE_TOKEN en el entorno."
      )
    }
  }

  /**
   * Referencia única de cada intento. PayPhone rechaza repetir una que ya usó,
   * así que lleva la hora pegada: reintentar el pago del mismo carrito abre
   * una transacción nueva. El prefijo del id de Medusa sobra —lo que sirve para
   * rastrear es el ULID— y así la cadena queda corta para su campo.
   */
  private referencia(semilla: string) {
    return `${semilla.replace(/^[a-z_]+_/, "")}-${Date.now().toString(36)}`
  }

  private centavos(monto: InitiatePaymentInput["amount"]) {
    return aCentavos(new BigNumber(monto).numeric)
  }

  /** La cédula solo se manda si de verdad son 10 dígitos: su API la valida. */
  private documento(valor: unknown) {
    return typeof valor === "string" && /^\d{10}$/.test(valor) ? valor : undefined
  }

  /**
   * Teléfono en el formato que PayPhone acepta, o nada.
   *
   * Es un campo opcional para ellos pero validado: un número guardado como
   * "098 044 1321" o "+593 98 044 1321" hace que rechacen el Prepare entero.
   * Como cada clienta escribió el suyo a su manera, se normaliza a 09XXXXXXXX
   * y, si no se reconoce, se omite: mejor sin teléfono que sin pago.
   */
  private telefono(valor: unknown) {
    if (typeof valor !== "string") return undefined
    let d = valor.replace(/\D/g, "")
    // Quita el código de país escrito de cualquier manera: +593, 00593, 593
    if (d.startsWith("00593")) d = d.slice(5)
    else if (d.startsWith("593")) d = d.slice(3)
    // Con el país delante, el 0 inicial suele desaparecer: 98... en vez de 098...
    if (/^9\d{8}$/.test(d)) d = `0${d}`
    return /^09\d{8}$/.test(d) ? d : undefined
  }

  /**
   * Deja pasar el motivo real de PayPhone hasta la tienda.
   *
   * Medusa convierte en "An unknown error occurred" cualquier excepción que
   * no sea un MedusaError con tipo conocido, así que un Error corriente
   * —por detallado que venga— llega al navegador convertido en nada. Esto lo
   * vuelve a envolver como INVALID_DATA para que el mensaje sobreviva, y
   * deja el detalle completo en el log del servidor.
   */
  private async conMotivo<T>(que: string, accion: () => Promise<T>): Promise<T> {
    try {
      return await accion()
    } catch (e: any) {
      const motivo = String(e?.message ?? e)
      this.logger_.error(`[payphone] Falló al ${que}: ${motivo}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No pudimos ${que}. PayPhone respondió: ${motivo.slice(0, 240)}`
      )
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    if (input.currency_code?.toLowerCase() !== "usd") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayPhone solo cobra en dólares."
      )
    }

    const entrada = (input.data ?? {}) as EntradaTienda
    const carrito = entrada.cart_id
    // El id llega desde el navegador y termina dentro de una URL: se acepta
    // solo con la forma exacta que Medusa genera
    if (!carrito || !/^cart_[A-Za-z0-9]+$/.test(carrito)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Falta el carrito: sin él PayPhone no sabe a dónde devolver a la clienta."
      )
    }

    const totalCentavos = this.centavos(input.amount)
    const referencia = this.referencia(carrito)
    const regreso = `${urlTienda()}/pedido/pagando/${carrito}`

    const respuesta = await this.conMotivo(
      "abrir el pago con tarjeta",
      () =>
        prepararPago({
          totalCentavos,
          ...desglosarImpuesto(totalCentavos),
          referenciaInterna: referencia,
          descripcion: "Angie Catálogos",
          urlRespuesta: regreso,
          // El mismo destino: sin id en la query, la página lo lee como cancelado
          urlCancelacion: regreso,
          correo: input.context?.customer?.email,
          // El del checkout manda: el de la ficha puede llevar años sin tocarse
          telefono:
            this.telefono(entrada.telefono) ??
            this.telefono(input.context?.customer?.phone),
          documento: this.documento(entrada.documento),
        })
    )

    const datos: DatosSesion = {
      referencia,
      paymentId: respuesta.paymentId,
      payWithCard: respuesta.payWithCard,
      payWithPayPhone: respuesta.payWithPayPhone,
      totalCentavos,
      cart_id: carrito,
    }
    return { id: referencia, data: datos as Record<string, unknown> }
  }

  /**
   * Lo único que actualiza esta sesión es la ruta de regreso, que le pega el
   * id de la transacción. Cuando cambia el total del carrito, Medusa borra la
   * sesión y crea otra en vez de actualizarla, así que aquí no hace falta
   * volver a preparar nada; si aun así llegara un monto distinto al que se
   * preparó, frenamos: cobrar otra cifra sería peor que fallar.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const previo = (input.data ?? {}) as DatosSesion
    const total = this.centavos(input.amount)
    if (previo.totalCentavos != null && previo.totalCentavos !== total) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "El total cambió después de preparar el pago en PayPhone. " +
          "Vuelve a elegir el método de pago para abrir una transacción nueva."
      )
    }
    return { data: previo as Record<string, unknown> }
  }

  /**
   * Confirma con PayPhone y con eso queda cobrado. Devolver "captured" hace
   * que Medusa marque la sesión autorizada y registre la captura de una vez,
   * que es lo que corresponde: aquí no existe el paso de capturar aparte.
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const datos = (input.data ?? {}) as DatosSesion

    // Ya hubo un Confirm: no se vuelve a preguntar, se repite su veredicto.
    // Ojo con el rechazo, que también queda guardado: darlo por cobrado en el
    // reintento sería regalar el pedido.
    if (datos.confirmacion) {
      return {
        data: datos as Record<string, unknown>,
        status:
          datos.confirmacion.statusCode === 3
            ? PaymentSessionStatus.CAPTURED
            : PaymentSessionStatus.CANCELED,
      }
    }

    if (!datos.transaccionId || !datos.referencia) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "El pago con tarjeta todavía no vuelve de PayPhone."
      )
    }

    const confirmacion = await this.conMotivo("confirmar el pago", () =>
      confirmarPago(datos.transaccionId!, datos.referencia!)
    )

    // 3 = aprobada. Cualquier otra cosa es un pago que no ocurrió
    if (confirmacion.statusCode !== 3) {
      this.logger_.warn(
        `PayPhone no aprobó la transacción ${datos.transaccionId}: ` +
          `${confirmacion.transactionStatus} (statusCode ${confirmacion.statusCode})`
      )
      return {
        data: { ...datos, confirmacion } as Record<string, unknown>,
        status: PaymentSessionStatus.CANCELED,
      }
    }

    // No debería pasar nunca: el monto se fija al preparar y no se puede
    // cambiar desde el navegador. Si pasa, es mejor frenar y revisarlo a mano.
    if (
      typeof datos.totalCentavos === "number" &&
      confirmacion.amount !== datos.totalCentavos
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `PayPhone cobró ${confirmacion.amount} centavos y el pedido era de ` +
          `${datos.totalCentavos}. Revisa la transacción ${datos.transaccionId} en su panel.`
      )
    }

    return {
      data: { ...datos, confirmacion } as Record<string, unknown>,
      status: PaymentSessionStatus.CAPTURED,
    }
  }

  /** El Confirm ya cobró: no hay una segunda captura que hacer. */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const datos = (input.data ?? {}) as DatosSesion
    const id = datos.confirmacion?.transactionId ?? datos.transaccionId
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Ese pago no tiene transacción de PayPhone que devolver."
      )
    }
    // PayPhone solo reversa el total; una devolución parcial va a mano
    const total = datos.confirmacion?.amount ?? datos.totalCentavos
    const pedido = aCentavos(new BigNumber(input.amount).numeric)
    if (typeof total === "number" && pedido !== total) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayPhone solo devuelve el monto completo. Para una devolución parcial, " +
          "hazla desde su panel y registra aquí el ajuste."
      )
    }
    await anularPago(id)
    return { data: input.data ?? {} }
  }

  /**
   * Medusa cancela el pago cuando algo falla después de autorizarlo. Como el
   * Confirm ya cobró, cancelar aquí significa devolver el dinero.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const datos = (input.data ?? {}) as DatosSesion
    const id = datos.confirmacion?.transactionId
    if (!id) {
      // Nunca se llegó a cobrar: PayPhone suelta la retención solo
      return { data: input.data ?? {} }
    }
    await anularPago(id)
    return { data: input.data ?? {} }
  }

  /**
   * Una transacción preparada y no pagada caduca sola en PayPhone, así que
   * cambiar de método de pago no exige avisarles nada.
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const datos = (input.data ?? {}) as DatosSesion
    if (datos.confirmacion?.statusCode === 3) {
      return { status: PaymentSessionStatus.CAPTURED }
    }
    if (datos.confirmacion) {
      return { status: PaymentSessionStatus.CANCELED }
    }
    return { status: PaymentSessionStatus.PENDING }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  /** La Cajita de Pago no manda webhooks: todo pasa por el regreso del navegador. */
  async getWebhookActionAndData(): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default PayphoneProviderService
