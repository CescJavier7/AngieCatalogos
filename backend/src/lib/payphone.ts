import https from "node:https"

/**
 * Cliente de PayPhone.
 *
 * Va sobre `node:https` a propósito, NO sobre fetch. Su servidor (IIS/.NET
 * tras un WAF) responde 500 con una página HTML de "Runtime Error" a las
 * peticiones de undici —el motor detrás del fetch de Node— mientras que curl,
 * Python y el módulo https nativo reciben JSON correcto. Se comprobó con el
 * mismo token, el mismo cuerpo y las mismas cabeceras: lo único que cambia es
 * el cliente. Cambiar esto por fetch rompe la integración entera.
 *
 * Otras dos reglas suyas que cuestan caro de descubrir:
 *  · Los montos van en CENTAVOS enteros y `amount` debe ser exactamente la
 *    suma de amountWithoutTax + amountWithTax + tax + service + tip.
 *  · El storeId se OMITE cuando el comercio tiene una sola tienda: el token
 *    ya trae la suya. No basta con dejarlo vacío, la clave no debe existir.
 *  · phoneNumber NO se manda. Es opcional para ellos pero lo validan, y
 *    cuando no les cuadra rechazan la transacción ENTERA con "Validaciones
 *    fallidas". Se probó con 0980441321 —un celular ecuatoriano correcto, en
 *    el formato de diez dígitos— y lo rechazó igual. Un campo opcional que
 *    tumba ventas no vale lo que cuesta: el correo ya identifica a quien
 *    paga. Si algún día PayPhone documenta el formato que espera, este es el
 *    sitio donde vuelve a entrar.
 */

const HOST = "pay.payphonetodoesposible.com"

export const payphoneEnabled = () => !!process.env.PAYPHONE_TOKEN

const pedir = <T>(ruta: string, cuerpo: unknown): Promise<{ status: number; datos: T | null; crudo: string }> => {
  const json = JSON.stringify(cuerpo)
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOST,
        path: ruta,
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYPHONE_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(json),
        },
        timeout: 20000,
      },
      (res) => {
        let d = ""
        res.on("data", (c) => (d += c))
        res.on("end", () => {
          let datos: T | null = null
          try {
            datos = JSON.parse(d)
          } catch {
            /* HTML: error interno suyo */
          }
          resolve({ status: res.statusCode ?? 0, datos, crudo: d })
        })
      }
    )
    req.on("error", reject)
    req.on("timeout", () => req.destroy(new Error("PayPhone no respondió en 20s")))
    req.write(json)
    req.end()
  })
}

export type PreparePago = {
  /** Total en centavos: debe ser la suma exacta de las partes. */
  totalCentavos: number
  /** Base sin impuesto, en centavos. */
  sinImpuestoCentavos: number
  /** Base gravada, en centavos. */
  gravadoCentavos?: number
  /** Impuesto, en centavos. */
  impuestoCentavos?: number
  /** Identificador único nuestro: con él se confirma después. */
  referenciaInterna: string
  descripcion: string
  urlRespuesta: string
  urlCancelacion?: string
  /** Datos reales del titular: su normativa los exige, nada ficticio. */
  correo?: string
  documento?: string
}

export type PrepareRespuesta = {
  paymentId: string
  payWithCard: string
  payWithPayPhone: string
}

/**
 * Crea la transacción y devuelve los enlaces de pago (tarjeta y app/QR).
 *
 * Los datos del titular van en un segundo plato: si PayPhone los rechaza, se
 * reintenta SIN ellos antes de darse por vencido. Su validador tumba la
 * transacción entera por un campo opcional que no le gusta, y perder una
 * venta por adornar el registro de otro es un mal negocio. El aviso queda en
 * el error de la segunda vuelta si esa también falla.
 */
export const prepararPago = async (p: PreparePago) => {
  const armar = (conTitular: boolean) => {
    const cuerpo: Record<string, unknown> = {
      amount: p.totalCentavos,
      amountWithoutTax: p.sinImpuestoCentavos,
      amountWithTax: p.gravadoCentavos ?? 0,
      tax: p.impuestoCentavos ?? 0,
      service: 0,
      tip: 0,
      currency: "USD",
      clientTransactionId: p.referenciaInterna,
      reference: p.descripcion,
      responseUrl: p.urlRespuesta,
    }
    if (p.urlCancelacion) cuerpo.cancellationUrl = p.urlCancelacion
    if (conTitular && p.correo) cuerpo.email = p.correo
    if (conTitular && p.documento) cuerpo.documentId = p.documento
    // storeId se omite: el token ya trae su tienda
    // phoneNumber tampoco se manda: ver la nota de arriba
    return cuerpo
  }

  const suma =
    p.sinImpuestoCentavos + (p.gravadoCentavos ?? 0) + (p.impuestoCentavos ?? 0)
  if (suma !== p.totalCentavos) {
    throw new Error(
      `El desglose no cuadra: las partes suman ${suma} y el total es ${p.totalCentavos} centavos.`
    )
  }

  const intentar = (conTitular: boolean) =>
    pedir<PrepareRespuesta>("/api/button/Prepare", armar(conTitular))

  let r = await intentar(true)
  if (r.status === 200 && r.datos?.paymentId) return r.datos

  // Segunda vuelta desnuda, solo si había algo opcional que quitar
  if (p.correo || p.documento) {
    const sinTitular = await intentar(false)
    if (sinTitular.status === 200 && sinTitular.datos?.paymentId) {
      return sinTitular.datos
    }
    r = sinTitular
  }

  throw new Error(
    `PayPhone rechazó el Prepare (${r.status}): ${
      r.datos ? JSON.stringify(r.datos) : r.crudo.slice(0, 200)
    }`
  )
}

export type ConfirmRespuesta = {
  statusCode: number
  transactionStatus: string
  transactionId: number
  clientTransactionId: string
  authorizationCode?: string
  amount: number
  cardBrand?: string
  cardType?: string
  lastDigits?: string
}

/**
 * Confirma la transacción. Hay que llamarlo dentro de los 5 minutos
 * siguientes al pago o PayPhone lo reversa automáticamente.
 * statusCode 3 = aprobada, 2 = cancelada.
 */
export const confirmarPago = async (id: number, referenciaInterna: string) => {
  const r = await pedir<ConfirmRespuesta>("/api/button/V2/Confirm", {
    id,
    clientTxId: referenciaInterna,
  })
  if (r.status === 200 && r.datos) return r.datos
  throw new Error(
    `PayPhone rechazó el Confirm (${r.status}): ${
      r.datos ? JSON.stringify(r.datos) : r.crudo.slice(0, 200)
    }`
  )
}

/**
 * Desglose de impuestos según el régimen del comercio.
 *
 * PAYPHONE_IVA=0   → sin impuesto (RIMPE Negocio Popular, notas de venta)
 * PAYPHONE_IVA=15  → los precios YA incluyen IVA y se separa la base
 *
 * Cambiar de régimen es cambiar esa variable, no el código. PayPhone rechaza
 * la transacción si las partes no suman exactamente el total, así que el
 * redondeo se hace en centavos y la base absorbe la diferencia.
 */
export const desglosarImpuesto = (totalCentavos: number) => {
  const tasa = Number(process.env.PAYPHONE_IVA ?? 0)
  if (!tasa || tasa <= 0) {
    return { sinImpuestoCentavos: totalCentavos, gravadoCentavos: 0, impuestoCentavos: 0 }
  }
  const gravado = Math.round(totalCentavos / (1 + tasa / 100))
  return {
    sinImpuestoCentavos: 0,
    gravadoCentavos: gravado,
    // La resta garantiza que la suma cuadre al centavo
    impuestoCentavos: totalCentavos - gravado,
  }
}

/** Convierte dólares a centavos enteros sin errores de coma flotante. */
export const aCentavos = (dolares: number) => Math.round(dolares * 100)

/**
 * Anula/reversa una transacción ya confirmada. PayPhone no distingue entre
 * anular y devolver: la misma llamada sirve para las dos cosas y siempre es
 * por el total, nunca parcial.
 *
 * Si esto falla, el dinero sigue cobrado: hay que devolverlo a mano desde el
 * panel de PayPhone. Por eso el error viaja con esa instrucción dentro.
 */
export const anularPago = async (id: number) => {
  const r = await pedir<{ message?: string }>("/api/Sale/Cancel", { id })
  if (r.status === 200) return
  throw new Error(
    `PayPhone no pudo anular la transacción ${id} (${r.status}): ${
      r.datos ? JSON.stringify(r.datos) : r.crudo.slice(0, 200)
    }. Devuelve el dinero a mano desde el panel de PayPhone.`
  )
}

/**
 * Dirección pública de la tienda, para armar las URLs a las que PayPhone
 * devuelve al cliente. Si no se define, se toma el primer origen de STORE_CORS
 * porque ese ya apunta a la tienda en cualquier despliegue.
 */
export const urlTienda = () => {
  const explicita = process.env.STOREFRONT_URL?.trim()
  if (explicita) return explicita.replace(/\/$/, "")
  const primerCors = process.env.STORE_CORS?.split(",")[0]?.trim()
  if (primerCors) return primerCors.replace(/\/$/, "")
  return "http://localhost:8000"
}
