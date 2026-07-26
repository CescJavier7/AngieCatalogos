import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { restoreSaleToInventory, toNum } from "../lib/catalog-sync"

/**
 * Si un pedido se cancela, devuelve el stock al inventario y a la hoja.
 */
export default async function orderCanceledInventoryHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "items.*"],
      filters: { id: data.id },
    })
    const soldItems = (order?.items ?? [])
      .filter((i: any) => i.variant_sku)
      .map((i: any) => ({ sku: i.variant_sku, quantity: toNum(i.quantity ?? i.raw_quantity) }))
    if (soldItems.length) {
      await restoreSaleToInventory(container, soldItems)
      logger.info(`[inventory] Stock restaurado por cancelación del pedido.`)
    }
  } catch (e: any) {
    logger.error(`[inventory] Error restaurando venta: ${e.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
