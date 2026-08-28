import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import nodemailer, { type Transporter } from "nodemailer"

/**
 * Correo por SMTP, que es el único protocolo que hablan todos.
 *
 * Existe para no quedar atados a un proveedor. SendGrid retiró su plan
 * gratuito permanente —ahora son 60 días y después $19.95 al mes, más caro
 * que el propio servidor— y cambiar de servicio no debería costar un
 * despliegue de código. Con esto, mudarse a Brevo, Amazon SES, Mailgun o al
 * correo del hosting es cambiar cuatro variables de entorno.
 *
 * Lo que cada uno pide:
 *   Brevo       smtp-relay.brevo.com:587    usuario = el correo de la cuenta
 *   Amazon SES  email-smtp.<región>.amazonaws.com:587
 *   Gmail       smtp.gmail.com:587          contraseña de aplicación, no la real
 */

type Opciones = {
  host: string
  port: number
  user: string
  password: string
  from: string
  /** true solo en el puerto 465; en 587 la conexión se cifra con STARTTLS. */
  secure?: boolean
}

class CorreoSmtpService extends AbstractNotificationProviderService {
  static identifier = "correo-smtp"

  static validateOptions(opciones: Record<string, unknown>) {
    for (const clave of ["host", "user", "password", "from"]) {
      if (!opciones[clave]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_ARGUMENT,
          `Falta SMTP_${clave.toUpperCase()} para enviar correo por SMTP.`
        )
      }
    }
  }

  protected readonly logger_: Logger
  protected readonly opciones_: Opciones
  protected transporte_: Transporter | null = null

  constructor(container: { logger: Logger }, opciones: Opciones) {
    super()
    this.logger_ = container.logger
    this.opciones_ = opciones
  }

  /**
   * El transporte se crea la primera vez que hace falta, no al arrancar: si el
   * servidor SMTP está caído, que falle el correo y no el arranque de la
   * tienda entera.
   */
  private transporte() {
    if (this.transporte_) return this.transporte_
    const o = this.opciones_
    this.transporte_ = nodemailer.createTransport({
      host: o.host,
      port: o.port,
      // El 465 va cifrado desde el saludo; el 587 empieza en claro y sube a TLS
      secure: o.secure ?? o.port === 465,
      auth: { user: o.user, pass: o.password },
    })
    return this.transporte_
  }

  async send(
    notificacion: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const contenido = notificacion.content
    if (!contenido?.html && !contenido?.text) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Este proveedor envía HTML directo: no usa plantillas del servicio."
      )
    }

    try {
      const info = await this.transporte().sendMail({
        from: notificacion.from?.trim() || this.opciones_.from,
        to: notificacion.to,
        subject: contenido.subject ?? "",
        html: contenido.html,
        text: contenido.text,
        attachments: (notificacion.attachments ?? []).map((a) => ({
          filename: a.filename,
          content: a.content,
          encoding: "base64",
          contentType: a.content_type,
        })),
      })
      return { id: info.messageId }
    } catch (e: any) {
      // El motivo del servidor SMTP suele decir exactamente qué falta
      this.logger_.error(`[smtp] No se pudo enviar a ${notificacion.to}: ${e.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `El servidor de correo rechazó el envío: ${e.message}`
      )
    }
  }
}

export default CorreoSmtpService
