import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Manda un correo de prueba por el mismo camino que los comprobantes.
 *
 * Existe porque el fallo de correo es callado: si la clave de SendGrid está
 * mal, el pedido se crea igual y el error queda enterrado en el log. Descubrir
 * eso semanas después, cuando una clienta pregunte por su comprobante, es
 * tarde. Esto lo dice en diez segundos.
 *
 *   npx medusa exec ./src/scripts/correo-prueba.ts
 */
export default async function correoPrueba({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const destino = process.env.TIENDA_EMAIL?.trim()

  const clave = process.env.SENDGRID_API_KEY?.trim()
  const smtpHost = process.env.SMTP_HOST?.trim()
  const smtpUser = process.env.SMTP_USER?.trim()
  const smtpPass = process.env.SMTP_PASSWORD?.trim()
  const smtpFrom = process.env.SMTP_FROM?.trim()
  const smtpListo = !!(smtpHost && smtpUser && smtpPass && smtpFrom)

  console.log("\n── Configuración ──")
  console.log(`TIENDA_EMAIL:  ${destino || "(vacío) ← sin esto no se avisa de los pedidos"}`)

  if (smtpListo) {
    console.log(`Proveedor:     SMTP → ${smtpHost}:${process.env.SMTP_PORT ?? 587}`)
    console.log(`Remitente:     ${smtpFrom}`)
  } else if (smtpHost || smtpUser || smtpPass || smtpFrom) {
    console.log("Proveedor:     SMTP a medias ← faltan variables, se ignora entero")
    for (const [k, v] of [["SMTP_HOST", smtpHost], ["SMTP_USER", smtpUser],
                          ["SMTP_PASSWORD", smtpPass], ["SMTP_FROM", smtpFrom]]) {
      if (!v) console.log(`               falta ${k}`)
    }
  } else if (clave) {
    console.log("Proveedor:     SendGrid")
    console.log(`Remitente:     ${process.env.SENDGRID_FROM?.trim() || "(vacío)"}`)
    console.log(
      `Clave:         ${
        clave.startsWith("SG.") && clave.length > 20
          ? `presente (${clave.length} caracteres)`
          : `«${clave}» ← eso no parece una clave real`
      }`
    )
  } else {
    console.log("Proveedor:     local → los correos se escriben en el log, no se envían")
  }

  if (!destino) {
    console.log("\n✗ Falta TIENDA_EMAIL: no hay a dónde enviar la prueba.")
    return
  }

  console.log(`\nEnviando prueba a ${destino}…\n`)

  try {
    const notificaciones = container.resolve(Modules.NOTIFICATION)
    await notificaciones.createNotifications([
      {
        to: destino,
        channel: "email",
        // Con la hora dentro, se puede repetir la prueba las veces que haga falta
        idempotency_key: `prueba-${Date.now()}`,
        content: {
          subject: "Prueba de correo · Angie Catálogos",
          html:
            "<p style=\"font-family:sans-serif;font-size:16px\">Si estás leyendo esto, " +
            "los comprobantes de compra y los avisos de pedido ya salen de la tienda.</p>",
        },
        trigger_type: "prueba",
      },
    ])

    if (!smtpListo && !clave) {
      console.log("✓ Aceptado por el proveedor local: el correo está escrito en")
      console.log("  el log del backend, no se envió. Configura SMTP o SendGrid")
      console.log("  para que salga de verdad.")
    } else {
      console.log(`✓ Aceptado. Revisa la bandeja de ${destino}`)
      console.log("  (y la carpeta de spam la primera vez).")
    }
  } catch (e: any) {
    console.log(`✗ No se pudo enviar: ${e.message}\n`)
    console.log("Lo más común, por orden:")
    console.log("  · La clave o la contraseña SMTP no son válidas")
    console.log("  · El remitente no está verificado en el proveedor")
    console.log("  · El puerto es 465 pero falta SMTP_SECURE=true (o al revés)")
    logger.error(e)
  }
}
