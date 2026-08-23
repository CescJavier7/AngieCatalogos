import { ExecArgs } from "@medusajs/framework/types"

/**
 * Comprueba las credenciales de PayPhone antes de tocar el checkout.
 *
 * Dos aprendizajes que costaron caro:
 *
 *  · Su API vive tras un WAF delante de IIS/.NET. Sin un User-Agent de
 *    navegador responde HTML en vez de JSON, y el error real queda oculto.
 *
 *  · El storeId se OMITE cuando el comercio tiene una sola tienda: el token
 *    ya trae la suya. Enviar uno que no le corresponde hace que su servidor
 *    reviente en lugar de devolver un error legible.
 *
 *   medusa exec ./src/scripts/payphone-check.js            (sin storeId)
 *   medusa exec ./src/scripts/payphone-check.js ID1 ID2    (además, con cada uno)
 *
 * Nunca imprime el token.
 */
const API = "https://pay.payphonetodoesposible.com/api/button/Prepare"

const cabeceras = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  // Imprescindible: su WAF bloquea agentes que no parecen navegador
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
})

/** El desglose completo con ceros: amount debe ser la suma exacta. */
const cuerpo = (storeId?: string) => {
  const base: Record<string, unknown> = {
    amount: 100,
    amountWithoutTax: 100,
    amountWithTax: 0,
    tax: 0,
    service: 0,
    tip: 0,
    currency: "USD",
    clientTransactionId: `PRUEBA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reference: "Prueba de credenciales",
    responseUrl: "https://tienda.cescjavier.dev/pedido/confirmacion",
  }
  // La clave no debe existir si no hay storeId, no basta con dejarla vacía
  if (storeId) base.storeId = storeId
  return base
}

const probar = async (token: string, storeId?: string) => {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: cabeceras(token),
      body: JSON.stringify(cuerpo(storeId)),
    })
    const texto = await res.text()
    let datos: any = null
    try {
      datos = JSON.parse(texto)
    } catch {
      /* HTML: el WAF o un error interno */
    }
    return { status: res.status, datos, esHtml: texto.trim().startsWith("<") }
  } catch (e: any) {
    return { status: 0, datos: { message: e.message }, esHtml: false }
  }
}

export default async function payphoneCheck({ args }: ExecArgs) {
  const token = process.env.PAYPHONE_TOKEN
  if (!token) {
    console.log("✗ Falta PAYPHONE_TOKEN en el entorno.")
    return
  }
  console.log(`Token: presente (${token.length} caracteres)`)
  console.log("User-Agent de navegador: sí (obligatorio por su WAF)\n")

  // Sin storeId primero: es el camino correcto con una sola tienda
  const intentos: { etiqueta: string; storeId?: string }[] = [
    { etiqueta: "SIN storeId (recomendado)" },
    ...(args ?? []).map((a) => ({ etiqueta: String(a), storeId: String(a) })),
  ]

  let ganador: { etiqueta: string; storeId?: string; datos: any } | null = null

  for (const intento of intentos) {
    process.stdout.write(`  ${intento.etiqueta.padEnd(34)} `)
    const r = await probar(token, intento.storeId)

    if (r.status === 200 && r.datos?.paymentId) {
      console.log("✓ FUNCIONA")
      ganador = { ...intento, datos: r.datos }
      break
    }
    if (r.esHtml) {
      console.log(`${r.status} — respuesta HTML (WAF o error interno)`)
    } else {
      const m =
        r.datos?.errors?.[0]?.errorDescriptions?.[0] ??
        r.datos?.message ??
        JSON.stringify(r.datos ?? {}).slice(0, 60)
      console.log(`${r.status} — ${String(m).slice(0, 62)}`)
    }
  }

  if (!ganador) {
    console.log("\n✗ Ningún intento funcionó.")
    console.log("\nSi ahora ves un error en JSON en vez de HTML, ya es progreso:")
    console.log("significa que el User-Agent resolvió lo del WAF y PayPhone")
    console.log("por fin está explicando qué le molesta. Pégame ese mensaje.")
    return
  }

  console.log(`\n✓ PREPARE CORRECTO — ${ganador.etiqueta}`)
  console.log(`   paymentId: ${ganador.datos.paymentId}`)
  console.log(`   Pagar con tarjeta:  ${ganador.datos.payWithCard}`)
  console.log(`   Pagar con PayPhone: ${ganador.datos.payWithPayPhone}`)
  console.log("\n   El segundo es el pago por app y QR: sale del mismo llamado,")
  console.log("   no hay que integrar nada aparte. Caducan en 10 minutos.")
  if (!ganador.storeId) {
    console.log("\n   → Deja PAYPHONE_STORE_ID vacío en .env.prod: con una sola")
    console.log("     tienda, el token ya sabe cuál es.")
  } else {
    console.log(`\n   → PAYPHONE_STORE_ID=${ganador.storeId}`)
  }
}
