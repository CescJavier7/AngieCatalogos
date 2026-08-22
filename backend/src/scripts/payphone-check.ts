import { ExecArgs } from "@medusajs/framework/types"

/**
 * Comprueba que las credenciales de PayPhone funcionan, antes de tocar el
 * checkout. Hace un Prepare real de $1.00 contra el ambiente configurado en
 * el panel de PayPhone y dice si el token y el storeId son correctos.
 *
 * No imprime el token en ningún momento.
 *
 * Uso: npx medusa exec ./src/scripts/payphone-check.ts
 */
const API = "https://pay.payphonetodoesposible.com/api/button/Prepare"

export default async function payphoneCheck(_: ExecArgs) {
  const token = process.env.PAYPHONE_TOKEN
  const storeId = process.env.PAYPHONE_STORE_ID

  if (!token || !storeId) {
    console.log("✗ Faltan variables en el entorno:")
    console.log(`   PAYPHONE_TOKEN    ${token ? "presente" : "AUSENTE"}`)
    console.log(`   PAYPHONE_STORE_ID ${storeId ? storeId : "AUSENTE"}`)
    return
  }

  console.log(`Token: presente (${token.length} caracteres)`)
  console.log(`Store: ${storeId}`)

  // $1.00 = 100 centavos. Sin impuesto: amount = amountWithoutTax
  const cuerpo = {
    amount: 100,
    amountWithoutTax: 100,
    amountWithTax: 0,
    tax: 0,
    service: 0,
    tip: 0,
    clientTransactionId: `PRUEBA-${Date.now()}`,
    storeId,
    currency: "USD",
    reference: "Prueba de credenciales — Angie Catálogos",
    responseUrl: "https://tienda.cescjavier.dev/pedido/confirmacion",
    cancellationUrl: "https://tienda.cescjavier.dev/checkout",
  }

  console.log("\nEnviando Prepare de prueba por $1.00…\n")

  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
  })

  const texto = await res.text()
  let datos: any
  try {
    datos = JSON.parse(texto)
  } catch {
    datos = texto
  }

  if (res.ok && datos?.paymentId) {
    console.log("✓ CREDENCIALES CORRECTAS")
    console.log(`   paymentId: ${datos.paymentId}`)
    console.log(`   Enlace con tarjeta: ${datos.payWithCard}`)
    console.log("\n   Ábrelo en el navegador para ver la pasarela real.")
    console.log("   El enlace caduca en 10 minutos y no se cobrará nada")
    console.log("   mientras la aplicación esté en ambiente de PRUEBAS.")
    return
  }

  console.log(`✗ PayPhone respondió ${res.status}`)
  console.log(`   ${JSON.stringify(datos, null, 2).slice(0, 700)}`)
  console.log("\nQué suele significar:")
  console.log("   401 → el token no es válido o no corresponde a esta tienda")
  console.log("   800 → los montos no suman, o el storeId no existe")
  console.log("   Si menciona el dominio, prueba a registrarlo sin https:// ni barra final")
}
