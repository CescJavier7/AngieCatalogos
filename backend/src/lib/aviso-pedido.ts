import { codigoPedido } from "./factura"

/**
 * Aviso interno de pedido nuevo, para quien lo tiene que despachar.
 *
 * No es el comprobante de la clienta y no busca lo mismo. Aquí lo que importa
 * es despachar sin abrir el panel: qué empacar, a dónde va, a quién se llama
 * y si el dinero ya entró o hay que cobrarlo. Por eso el estado del pago va
 * arriba del todo y en color, y la dirección viene lista para copiarla en la
 * guía de la transportadora.
 */

const esc = (valor: unknown) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const dinero = (valor: unknown) => `$${Number(valor ?? 0).toFixed(2)}`

const SANS = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const TINTA = "#2a1e26"
const LINEA = "#eadfe6"
const APAGADO = "#8d7f88"

/** Celular a formato de enlace de WhatsApp, o nada si no se reconoce. */
const aWhatsApp = (valor: unknown) => {
  if (typeof valor !== "string") return undefined
  let d = valor.replace(/\D/g, "")
  if (d.startsWith("00593")) d = d.slice(5)
  else if (d.startsWith("593")) d = d.slice(3)
  if (/^9\d{8}$/.test(d)) d = `0${d}`
  return /^09\d{8}$/.test(d) ? `593${d.slice(1)}` : undefined
}

type Pedido = {
  id?: string
  display_id?: number
  email?: string
  total?: number
  item_subtotal?: number
  discount_total?: number
  shipping_total?: number
  items?: any[]
  shipping_address?: any
  metadata?: Record<string, any> | null
  payment_collections?: any[]
}

export const construirAviso = (pedido: Pedido) => {
  const codigo = codigoPedido(pedido.display_id)
  const meta = pedido.metadata ?? {}
  const dir = pedido.shipping_address ?? {}
  const esRetiro = meta.entrega === "retiro_bodega"

  const pagos = (pedido.payment_collections ?? []).flatMap(
    (pc: any) => pc.payments ?? []
  )
  const cobrado = pagos.some((p: any) => p.captured_at)
  const conTarjeta = pagos.some((p: any) =>
    (p.provider_id ?? "").toLowerCase().includes("payphone")
  )

  // Lo primero que hay que saber: ¿hay que cobrar o ya está cobrado?
  const estado = cobrado
    ? { texto: "PAGADO CON TARJETA", fondo: "#e8f5ee", borde: "#1f8a5b", color: "#14603d" }
    : { texto: "FALTA COBRAR — coordinar por WhatsApp", fondo: "#fdf6e8", borde: "#b98a2f", color: "#7a5a17" }

  const productos = (pedido.items ?? [])
    .map(
      (it: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINEA};font-family:${SANS};font-size:15px;color:${TINTA};">
          <strong style="font-size:17px;">${it.quantity} ×</strong>
          ${esc(it.product_title || it.title)}
          ${it.variant_title && it.variant_title !== it.title ? `<span style="color:${APAGADO};"> · ${esc(it.variant_title)}</span>` : ""}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINEA};font-family:${SANS};font-size:15px;color:${TINTA};white-space:nowrap;">
          ${dinero(it.total)}
        </td>
      </tr>`
    )
    .join("")

  const wa = aWhatsApp(dir.phone)

  const entrega = esRetiro
    ? [
        ["Modo", "RETIRO EN BODEGA"],
        ["Retira", meta.retira_nombre],
        ["Cédula", meta.retira_cedula],
      ]
    : [
        ["Modo", meta.entrega === "reparto_propio" ? "REPARTO PROPIO (Mejía)" : "TRANSPORTADORA"],
        ["Nombre", `${dir.first_name ?? ""} ${dir.last_name ?? ""}`.trim()],
        ["Cédula", meta.cedula],
        ["Dirección", dir.address_1],
        ["Referencia", dir.address_2],
        ["Sector", [meta.parroquia, meta.canton, meta.provincia].filter(Boolean).join(", ")],
        ["Teléfono", dir.phone],
      ]

  const filasEntrega = entrega
    .filter(([, v]) => v)
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:5px 14px 5px 0;font-family:${SANS};font-size:13px;color:${APAGADO};white-space:nowrap;vertical-align:top;">${esc(k)}</td>
        <td style="padding:5px 0;font-family:${SANS};font-size:15px;color:${TINTA};font-weight:600;">${esc(v)}</td>
      </tr>`
    )
    .join("")

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ee;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:620px;max-width:100%;background:#fff;border:1px solid ${LINEA};border-radius:12px;overflow:hidden;">

      <tr>
        <td style="background:${estado.fondo};border-bottom:3px solid ${estado.borde};padding:18px 24px;">
          <div style="font-family:${SANS};font-size:13px;font-weight:800;letter-spacing:1.5px;color:${estado.color};">
            ${esc(estado.texto)}
          </div>
          <div style="font-family:${SANS};font-size:26px;font-weight:800;color:${TINTA};padding-top:6px;">
            Pedido ${esc(codigo)} · ${dinero(pedido.total)}
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding:22px 24px 0;">
          <div style="font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:1.5px;color:${APAGADO};padding-bottom:4px;">
            QUÉ EMPACAR
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${productos}</table>
          <div style="font-family:${SANS};font-size:13px;color:${APAGADO};padding-top:10px;">
            Productos ${dinero(pedido.item_subtotal)}
            ${Number(pedido.discount_total ?? 0) > 0 ? ` · Descuento −${dinero(pedido.discount_total)}` : ""}
            · Envío ${Number(pedido.shipping_total ?? 0) > 0 ? dinero(pedido.shipping_total) : "gratis"}
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding:22px 24px 0;">
          <div style="font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:1.5px;color:${APAGADO};padding-bottom:8px;">
            A DÓNDE VA
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0">${filasEntrega}</table>
        </td>
      </tr>

      <tr>
        <td style="padding:22px 24px 26px;">
          ${
            wa
              ? `<a href="https://wa.me/${wa}" style="display:inline-block;background:#25d366;color:#fff;font-family:${SANS};font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:8px;">Escribir a la clienta por WhatsApp</a>`
              : `<div style="font-family:${SANS};font-size:14px;color:${APAGADO};">Sin teléfono válido: contactar por ${esc(pedido.email)}</div>`
          }
          <div style="font-family:${SANS};font-size:13px;color:${APAGADO};padding-top:12px;">
            ${esc(pedido.email)}
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>`

  return {
    asunto: `${cobrado ? "💳 PAGADO" : "⏳ POR COBRAR"} · Pedido ${codigo} · ${dinero(pedido.total)}`,
    html,
  }
}
