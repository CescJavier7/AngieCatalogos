import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { pushStockToSheet } from "../lib/catalog-sync"
import { sheetsEnabled } from "../lib/google-sheets"

/**
 * Al confirmarse un pedido, baja el stock reflejado en la hoja de Google
 * para los SKUs vendidos.
 */
export default async function orderPlacedSheetHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!sheetsEnabled()) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "items.variant_sku"],
      filters: { id: data.id },
    })
    const skus = (order?.items ?? [])
      .map((i: any) => i.variant_sku)
      .filter(Boolean)
    if (skus.length) {
      await pushStockToSheet(container, skus)
      logger.info(`[sheet-sync] Stock actualizado en la hoja: ${skus.join(", ")}`)
    }
  } catch (e: any) {
    logger.error(`[sheet-sync] Error empujando stock: ${e.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
