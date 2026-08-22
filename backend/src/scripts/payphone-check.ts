import { ExecArgs } from "@medusajs/framework/types"

/**
 * Comprueba las credenciales de PayPhone antes de tocar el checkout.
 *
 * Su documentación no aclara cuál de los identificadores del panel es el
 * storeId, así que se puede pasar uno distinto como argumento para probarlos
 * sin editar el .env:
 *
 *   medusa exec ./src/scripts/payphone-check.js               (usa el del .env)
 *   medusa exec ./src/scripts/payphone-check.js OTRO_STORE_ID
 *
 * Nunca imprime el token.
 */
const API = "https://pay.payphonetodoesposible.com/api/button/Prepare"

export default async function payphoneCheck({ args }: ExecArgs) {
  const token = process.env.PAYPHONE_TOKEN
  const storeId = args?.[0] || process.env.PAYPHONE_STORE_ID

  if (!token || !storeId) {
    console.log("✗ Falta configuración:")
    console.log(`   PAYPHONE_TOKEN    ${token ? "presente" : "AUSENTE"}`)
    console.log(`   PAYPHONE_STORE_ID ${storeId || "AUSENTE"}`)
    return
  }

  console.log(`Token: presente (${token.length} caracteres)`)
  console.log(`Store: ${storeId}${args?.[0] ? "  (pasado por argumento)" : "  (del .env)"}`)

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
    reference: "Prueba de credenciales",
    responseUrl: "https://tienda.cescjavier.dev/pedido/confirmacion",
    cancellationUrl: "https://tienda.cescjavier.dev/checkout",
  }

  console.log("\nEnviando Prepare de prueba por $1.00…\n")

  let res: Response
  try {
    res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
    })
  } catch (e: any) {
    console.log(`✗ No se pudo contactar con PayPhone: ${e.message}`)
    return
  }

  const texto = await res.text()
  let datos: any
  try {
    datos = JSON.parse(texto)
  } catch {
    datos = null
  }

  if (res.ok && datos?.paymentId) {
    console.log("✓ CREDENCIALES CORRECTAS")
    console.log(`   storeId válido: ${storeId}`)
    console.log(`   paymentId: ${datos.paymentId}`)
    console.log(`   Pagar con tarjeta:  ${datos.payWithCard}`)
    console.log(`   Pagar con PayPhone: ${datos.payWithPayPhone}`)
    console.log("\n   Ábrelos en el navegador: el primero es el formulario de")
    console.log("   tarjeta y el segundo el pago por app/QR. Caducan en 10 min.")
    if (args?.[0]) {
      console.log(`\n   → Pon este valor en PAYPHONE_STORE_ID del .env.prod`)
    }
    return
  }

  console.log(`✗ PayPhone respondió ${res.status} ${res.statusText}`)
  const esHtml = texto.trim().startsWith("<")
  if (datos) {
    console.log(JSON.stringify(datos, null, 2).slice(0, 900))
  } else {
    console.log(`   (respuesta HTML, no JSON — ${texto.length} caracteres)`)
  }

  console.log("\nDiagnóstico:")
  if (res.status === 401) {
    console.log("   El token no es válido o no corresponde a esta aplicación.")
    console.log("   Cópialo de nuevo desde PayPhone Developer → Credenciales.")
  } else if (res.status === 400 && datos?.errorCode === 800) {
    console.log("   Validación rechazada: revisa el detalle de arriba.")
    console.log("   Si menciona storeId, prueba con el otro identificador.")
  } else if (res.status === 500 || esHtml) {
    console.log("   Error interno de PayPhone, no un rechazo de validación.")
    console.log("   La causa más probable es que el storeId no sea el correcto:")
    console.log("   su servidor revienta en vez de responder un error limpio.")
    console.log("\n   Prueba con el otro identificador del panel:")
    console.log("     medusa exec ./src/scripts/payphone-check.js EL_OTRO_ID")
    console.log("\n   Y confirma en PayPhone Developer que exista una pestaña")
    console.log("   'Credenciales' con un campo llamado StoreID: puede ser un")
    console.log("   valor distinto a los de la pantalla de configuración.")
  } else {
    console.log("   Respuesta inesperada. Guarda esta salida para soporte.")
  }
}
