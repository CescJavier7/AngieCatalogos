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
  telefono?: string
  documento?: string
}

export type PrepareRespuesta = {
  paymentId: string
  payWithCard: string
  payWithPayPhone: string
}

/** Crea la transacción y devuelve los enlaces de pago (tarjeta y app/QR). */
export const prepararPago = async (p: PreparePago) => {
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
  if (p.correo) cuerpo.email = p.correo
  if (p.telefono) cuerpo.phoneNumber = p.telefono
  if (p.documento) cuerpo.documentId = p.documento
  // storeId se omite: el token ya trae su tienda

  const suma =
    (cuerpo.amountWithoutTax as number) +
    (cuerpo.amountWithTax as number) +
    (cuerpo.tax as number)
  if (suma !== p.totalCentavos) {
    throw new Error(
      `El desglose no cuadra: las partes suman ${suma} y el total es ${p.totalCentavos} centavos.`
    )
  }

  const r = await pedir<PrepareRespuesta>("/api/button/Prepare", cuerpo)
  if (r.status === 200 && r.datos?.paymentId) return r.datos
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
