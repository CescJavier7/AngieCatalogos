import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { applySaleToInventory, toNum } from "../lib/catalog-sync"

/**
 * Al confirmarse un pedido: descuenta el stock real de forma definitiva
 * (sin depender de que se marque "enviado") y lo espeja en la hoja de Google.
 */
export default async function orderPlacedInventoryHandler({
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
      fields: ["id", "items.id", "items.variant_sku", "items.raw_quantity"],
      filters: { id: data.id },
    })

    const soldItems = (order?.items ?? [])
      .filter((i: any) => i.variant_sku)
      .map((i: any) => ({
        lineItemId: i.id,
        sku: i.variant_sku,
        quantity: toNum(i.raw_quantity),
      }))

    if (soldItems.length) {
      await applySaleToInventory(container, soldItems)
      logger.info(
        `[inventory] Venta aplicada: ${soldItems
          .map((i) => `${i.sku} -${i.quantity}`)
          .join(", ")}`
      )
    }
  } catch (e: any) {
    logger.error(`[inventory] Error aplicando venta: ${e.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
