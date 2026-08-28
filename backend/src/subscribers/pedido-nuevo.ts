import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { construirAviso } from "../lib/aviso-pedido"

/**
 * Avisa a la tienda de cada pedido nuevo, en cuanto se hace.
 *
 * A diferencia del comprobante de la clienta, este NO espera a que el dinero
 * entre: los pedidos por transferencia o contra entrega nacen sin cobrar y
 * son precisamente los que necesitan que alguien los vea y llame. Un pedido
 * que nadie mira es una venta perdida, no un pedido pendiente.
 *
 * Sin `TIENDA_EMAIL` no hace nada. Ese es el único interruptor.
 */
export default async function pedidoNuevoHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const destino = process.env.TIENDA_EMAIL?.trim()
  if (!destino) return

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [pedido],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "item_subtotal",
        "discount_total",
        "shipping_total",
        "metadata",
        "items.title",
        "items.product_title",
        "items.variant_title",
        "items.quantity",
        "items.total",
        "shipping_address.*",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
      ],
      filters: { id: event.data.id },
    })

    if (!pedido) return

    const { asunto, html } = construirAviso(pedido as any)
    const notificaciones = container.resolve(Modules.NOTIFICATION)

    await notificaciones.createNotifications([
      {
        to: destino,
        channel: "email",
        // Un aviso por pedido, aunque el evento se reintente
        idempotency_key: `aviso-${pedido.id}`,
        content: { subject: asunto, html },
        resource_id: pedido.id,
        resource_type: "order",
        trigger_type: "pedido_nuevo",
      },
    ])

    logger.info(`[pedidos] Aviso del pedido ${pedido.display_id} enviado a ${destino}.`)
  } catch (e: any) {
    // Que falle el aviso no puede tumbar el pedido
    logger.error(`[pedidos] No se pudo avisar del pedido nuevo: ${e.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
