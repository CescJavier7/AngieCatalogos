import { ExecArgs } from "@medusajs/framework/types"
import { prepararPago, payphoneEnabled } from "../lib/payphone"

/**
 * Comprueba las credenciales de PayPhone antes de tocar el checkout.
 * Usa el mismo cliente que usará la tienda, así que si esto pasa, el
 * checkout también.  Nunca imprime el token.
 */
export default async function payphoneCheck(_: ExecArgs) {
  if (!payphoneEnabled()) {
    console.log("✗ Falta PAYPHONE_TOKEN en el entorno.")
    return
  }
  const token = process.env.PAYPHONE_TOKEN!
  console.log(`Token: presente (${token.length} caracteres)`)
  console.log("Cliente: node:https (el fetch de Node hace que su servidor devuelva HTML)")
  console.log("storeId: omitido (el token ya trae su tienda)\n")
  console.log("Enviando Prepare de prueba por $1.00…\n")

  try {
    const r = await prepararPago({
      totalCentavos: 100,
      sinImpuestoCentavos: 100,
      referenciaInterna: `PRUEBA-${Date.now()}`,
      descripcion: "Prueba de credenciales",
      urlRespuesta: "https://tienda.cescjavier.dev/pedido/confirmacion",
      urlCancelacion: "https://tienda.cescjavier.dev/checkout",
    })
    console.log("✓ CREDENCIALES CORRECTAS")
    console.log(`   paymentId: ${r.paymentId}`)
    console.log(`   Pagar con tarjeta:  ${r.payWithCard}`)
    console.log(`   Pagar con PayPhone: ${r.payWithPayPhone}`)
    console.log("\n   Ábrelos en el navegador. El segundo es el pago por app y")
    console.log("   QR: sale del mismo llamado. Caducan en 10 minutos.")
  } catch (e: any) {
    console.log(`✗ ${e.message}`)
    console.log("\nSi el mensaje viene en JSON, es PayPhone explicando qué le")
    console.log("molesta y ya podemos actuar. Pégamelo.")
  }
}
