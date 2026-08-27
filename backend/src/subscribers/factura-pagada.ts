import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { construirFactura, codigoPedido } from "../lib/factura"

/**
 * Envía el comprobante cuando el dinero ya entró. Nunca antes.
 *
 * Hacen falta DOS eventos porque el cobro llega por dos caminos distintos:
 *
 *  · Tarjeta: Medusa captura dentro del propio cierre del carrito, sin pasar
 *    por el flujo de captura del admin, así que ahí NO se emite
 *    `payment.captured`. El aviso que sí llega es `order.placed`, y para
 *    entonces el cobro de PayPhone ya está confirmado.
 *  · Transferencia o contra entrega: el pedido nace sin cobrar y la captura
 *    la hace Angie a mano desde el admin. Eso sí emite `payment.captured`,
 *    a veces días después.
 *
 * En los dos casos se comprueba `captured_at` antes de enviar: el evento es
 * la señal para mirar, no la prueba de que hay dinero.
 *
 * El envío no se duplica gracias a la clave de idempotencia del módulo de
 * notificaciones, que además reintenta si un envío quedó fallido.
 */
export default async function facturaPagadaHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const pedidoId =
      event.name === "order.placed"
        ? event.data.id
        : await pedidoDelPago(query, event.data.id)

    if (!pedidoId) return

    const {
      data: [pedido],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "created_at",
        "email",
        "currency_code",
        "item_subtotal",
        "discount_total",
        "shipping_total",
        "total",
        "metadata",
        "items.title",
        "items.product_title",
        "items.variant_title",
        "items.quantity",
        "items.unit_price",
        "items.total",
        "shipping_address.*",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.data",
      ],
      filters: { id: pedidoId },
    })

    if (!pedido?.email) return

    const pagos = (pedido.payment_collections ?? []).flatMap(
      (pc: any) => pc.payments ?? []
    )
    // El evento solo invita a mirar; quien decide es la fecha de captura
    if (!pagos.some((p: any) => p.captured_at)) return

    const { asunto, html } = construirFactura(pedido as any)
    const notificaciones = container.resolve(Modules.NOTIFICATION)

    await notificaciones.createNotifications([
      {
        to: pedido.email,
        channel: "email",
        // Un comprobante por pedido, pase lo que pase con los eventos
        idempotency_key: `factura-${pedido.id}`,
        content: { subject: asunto, html },
        resource_id: pedido.id,
        resource_type: "order",
        trigger_type: "factura_pagada",
      },
    ])

    logger.info(
      `[factura] Comprobante ${codigoPedido(pedido.display_id)} enviado a ${pedido.email}.`
    )
  } catch (e: any) {
    // Un correo que no sale no puede tumbar el pedido ni la captura
    logger.error(`[factura] No se pudo enviar el comprobante: ${e.message}`)
  }
}

/** Del pago al pedido, saltando por el enlace que los une. */
const pedidoDelPago = async (query: any, pagoId: string) => {
  const {
    data: [pago],
  } = await query.graph({
    entity: "payment",
    fields: ["id", "payment_collection_id"],
    filters: { id: pagoId },
  })
  if (!pago?.payment_collection_id) return undefined

  const {
    data: [enlace],
  } = await query.graph({
    entity: "order_payment_collection",
    fields: ["order_id"],
    filters: { payment_collection_id: pago.payment_collection_id },
  })
  return enlace?.order_id as string | undefined
}

export const config: SubscriberConfig = {
  event: ["order.placed", "payment.captured"],
}
