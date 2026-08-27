import { urlTienda } from "./payphone"

/**
 * Comprobante de compra en HTML, listo para enviar por correo.
 *
 * Está escrito con tablas y estilos en línea, que es lo único que Outlook y
 * Gmail respetan de verdad: cualquier flexbox, grid u hoja de estilos externa
 * se descarta y el diseño se desmorona.
 *
 * Tampoco lleva imágenes. Casi todos los clientes de correo las bloquean por
 * defecto, así que un comprobante apoyado en fotos llega lleno de huecos
 * grises. Todo el peso visual está en la tipografía y el color, que siempre
 * se ven.
 */

/** Escapa el texto que viene del catálogo: un "&" suelto rompe el correo. */
const esc = (valor: unknown) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const dinero = (valor: unknown) => `$${Number(valor ?? 0).toFixed(2)}`

/** El mismo código que ve la clienta en la pantalla de confirmación. */
export const codigoPedido = (displayId: unknown) =>
  `AC-${String(displayId ?? 0).padStart(4, "0")}`

const FECHA = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Guayaquil",
})

/* ── Paleta de la marca, repetida aquí porque el correo no hereda nada ── */
const BERRY = "#9b1b60"
const ORO = "#b98a2f"
const TINTA = "#2a1e26"
const MARFIL = "#fdfaf7"
const LINEA = "#eadfe6"
const APAGADO = "#8d7f88"

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

type Pedido = {
  display_id?: number
  created_at?: string | Date
  email?: string
  currency_code?: string
  items?: any[]
  item_subtotal?: number
  discount_total?: number
  shipping_total?: number
  total?: number
  shipping_address?: any
  metadata?: Record<string, any> | null
  payment_collections?: any[]
}

/** Fila del desglose de totales. */
const fila = (etiqueta: string, valor: string, opciones: { color?: string; fuerte?: boolean } = {}) => `
  <tr>
    <td style="padding:7px 0;font-family:${SANS};font-size:14px;color:${opciones.color ?? APAGADO};${opciones.fuerte ? "font-weight:700;" : ""}">${esc(etiqueta)}</td>
    <td align="right" style="padding:7px 0;font-family:${SANS};font-size:14px;color:${opciones.color ?? TINTA};${opciones.fuerte ? "font-weight:700;" : ""}">${valor}</td>
  </tr>`

/**
 * Cómo se pagó, dicho en una línea. De la tarjeta salen la marca y los
 * últimos dígitos porque es lo que la clienta reconoce al revisar su estado
 * de cuenta.
 */
const lineaDePago = (pedido: Pedido) => {
  const pagos = (pedido.payment_collections ?? []).flatMap(
    (pc: any) => pc.payments ?? []
  )
  const tarjeta = pagos.find((p: any) =>
    (p.provider_id ?? "").toLowerCase().includes("payphone")
  )

  if (tarjeta) {
    const d = (tarjeta.data ?? {}) as any
    const c = d.confirmacion ?? {}
    const marca = c.cardBrand ? esc(c.cardBrand) : "tarjeta"
    const digitos = c.lastDigits ? ` ···· ${esc(c.lastDigits)}` : ""
    return `Pagado con ${marca}${digitos}`
  }
  return "Pago confirmado"
}

/** Dónde y cómo se entrega: es la duda número uno después de pagar. */
const bloqueEntrega = (pedido: Pedido) => {
  const meta = pedido.metadata ?? {}
  const dir = pedido.shipping_address ?? {}
  const esRetiro = meta.entrega === "retiro_bodega"

  const titulo = esRetiro ? "Retiro en Machachi" : "Envío a domicilio"
  const cuerpo = esRetiro
    ? [
        "Av. Fernández Salvador y L Vía Tesalia, Machachi",
        meta.retira_nombre ? `Retira: ${meta.retira_nombre}` : "",
        meta.retira_cedula ? `Cédula: ${meta.retira_cedula}` : "",
      ]
    : [
        `${dir.first_name ?? ""} ${dir.last_name ?? ""}`.trim(),
        dir.address_1 ?? "",
        dir.address_2 ? `Ref: ${dir.address_2}` : "",
        [dir.city, dir.province].filter(Boolean).join(", "),
        dir.phone ?? "",
      ]

  const lineas = cuerpo
    .filter(Boolean)
    .map(
      (l) =>
        `<div style="font-family:${SANS};font-size:14px;line-height:1.6;color:${TINTA};">${esc(l)}</div>`
    )
    .join("")

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:${MARFIL};border:1px solid ${LINEA};border-radius:10px;">
    <tr>
      <td style="padding:18px 22px;">
        <div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${ORO};padding-bottom:8px;">${esc(titulo)}</div>
        ${lineas}
      </td>
    </tr>
  </table>`
}

export const construirFactura = (pedido: Pedido) => {
  const codigo = codigoPedido(pedido.display_id)
  const fecha = FECHA.format(
    pedido.created_at ? new Date(pedido.created_at) : new Date()
  )

  const productos = (pedido.items ?? [])
    .map((it: any) => {
      const nombre = esc(it.product_title || it.title)
      const variante =
        it.variant_title && it.variant_title !== it.title
          ? `<div style="font-size:12px;color:${APAGADO};padding-top:2px;">${esc(it.variant_title)}</div>`
          : ""
      return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${LINEA};font-family:${SANS};font-size:14px;color:${TINTA};">
          <strong style="font-weight:600;">${nombre}</strong>${variante}
          <div style="font-size:12px;color:${APAGADO};padding-top:3px;">${it.quantity} × ${dinero(it.unit_price)}</div>
        </td>
        <td align="right" valign="top" style="padding:14px 0;border-bottom:1px solid ${LINEA};font-family:${SANS};font-size:14px;font-weight:600;color:${TINTA};white-space:nowrap;">
          ${dinero(it.total)}
        </td>
      </tr>`
    })
    .join("")

  const descuento = Number(pedido.discount_total ?? 0)
  const envio = Number(pedido.shipping_total ?? 0)

  const totales = [
    fila("Subtotal", dinero(pedido.item_subtotal)),
    descuento > 0
      ? fila("Bono de bienvenida", `− ${dinero(descuento)}`, { color: "#1f8a5b" })
      : "",
    fila("Envío", envio > 0 ? dinero(envio) : "Gratis"),
  ].join("")

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:${MARFIL};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${LINEA};border-radius:16px;overflow:hidden;">

        <!-- Cabecera -->
        <tr>
          <td align="center" style="background:${BERRY};padding:30px 24px 26px;">
            <div style="font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#ffffff;">
              Angie Catálogos
            </div>
            <div style="font-family:${SERIF};font-size:19px;font-style:italic;color:#e6c988;padding-top:6px;">
              Belleza que llega a tu puerta
            </div>
          </td>
        </tr>

        <!-- Confirmación -->
        <tr>
          <td align="center" style="padding:34px 32px 6px;">
            <div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${ORO};">
              Pago recibido
            </div>
            <div style="font-family:${SERIF};font-size:30px;line-height:1.2;color:${TINTA};padding:10px 0 6px;">
              ¡Gracias por tu compra!
            </div>
            <div style="font-family:${SANS};font-size:14px;color:${APAGADO};">
              ${esc(lineaDePago(pedido))}
            </div>
          </td>
        </tr>

        <!-- Pedido y fecha -->
        <tr>
          <td style="padding:24px 32px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MARFIL};border:1px solid ${LINEA};border-radius:10px;">
              <tr>
                <td style="padding:14px 20px;font-family:${SANS};font-size:13px;color:${APAGADO};">
                  Pedido
                  <div style="font-size:16px;font-weight:700;color:${BERRY};letter-spacing:1px;padding-top:2px;">${esc(codigo)}</div>
                </td>
                <td align="right" style="padding:14px 20px;font-family:${SANS};font-size:13px;color:${APAGADO};">
                  Fecha
                  <div style="font-size:14px;font-weight:600;color:${TINTA};padding-top:2px;">${esc(fecha)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Detalle -->
        <tr>
          <td style="padding:28px 32px 0;">
            <div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${ORO};padding-bottom:6px;">
              Tu compra
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${productos}
            </table>
          </td>
        </tr>

        <!-- Totales -->
        <tr>
          <td style="padding:16px 32px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${totales}
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${TINTA};margin-top:10px;">
              <tr>
                <td style="padding:14px 0 0;font-family:${SERIF};font-size:20px;color:${TINTA};">Total pagado</td>
                <td align="right" style="padding:14px 0 0;font-family:${SERIF};font-size:26px;font-weight:700;color:${BERRY};">${dinero(pedido.total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Entrega -->
        <tr>
          <td style="padding:0 32px;">
            ${bloqueEntrega(pedido)}
          </td>
        </tr>

        <!-- Ayuda -->
        <tr>
          <td align="center" style="padding:30px 32px 34px;">
            <div style="font-family:${SANS};font-size:14px;line-height:1.65;color:${APAGADO};padding-bottom:18px;">
              ¿Alguna duda con tu pedido? Escríbenos y te respondemos el mismo día.
            </div>
            <a href="https://wa.me/593980441321" style="display:inline-block;background:${BERRY};color:#ffffff;font-family:${SANS};font-size:14px;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:999px;">
              Escribirnos por WhatsApp
            </a>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td align="center" style="background:${TINTA};padding:24px 32px;">
            <div style="font-family:${SANS};font-size:12px;line-height:1.7;color:#d9ccd4;">
              Machachi — Av. Fernández Salvador y L Vía Tesalia<br />
              <a href="${urlTienda()}" style="color:#e6c988;text-decoration:none;">${esc(urlTienda().replace(/^https?:\/\//, ""))}</a>
            </div>
            <div style="font-family:${SANS};font-size:11px;line-height:1.6;color:#8d7f88;padding-top:12px;">
              Este comprobante detalla tu compra y no reemplaza a la factura
              electrónica del SRI.
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`

  return {
    asunto: `Comprobante de tu compra ${codigo} · Angie Catálogos`,
    html,
  }
}
