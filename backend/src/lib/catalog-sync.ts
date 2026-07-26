import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { readDataRows, writeStockCell } from "./google-sheets"

const PROMO_TAG = "promocion"

type CatalogRow = {
  sku: string
  title: string
  price: number | null
  stock: number | null
  /** Último stock que sincronizamos con la hoja (guardián anti-clobber). */
  syncedStock: number | null
  promo: boolean
  brand: string
  categories: string
  variantId: string
  productId: string
  inventoryItemId: string | null
}

/** Estado actual del catálogo, una fila por variante (SKU). */
export const buildCatalogRows = async (
  container: MedusaContainer
): Promise<CatalogRow[]> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const inventory = container.resolve(Modules.INVENTORY)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "product.id",
      "product.title",
      "product.collection.title",
      "product.categories.name",
      "product.tags.value",
      "prices.amount",
      "prices.currency_code",
    ],
  })

  const skus = variants.map((v: any) => v.sku).filter(Boolean)
  const items = await inventory.listInventoryItems({ sku: skus }, {})
  const levels = await inventory.listInventoryLevels(
    { inventory_item_id: items.map((i) => i.id) },
    {}
  )
  const stockByItem = new Map<string, number>()
  for (const lvl of levels) {
    stockByItem.set(
      lvl.inventory_item_id,
      (stockByItem.get(lvl.inventory_item_id) ?? 0) + Number(lvl.stocked_quantity)
    )
  }
  const itemBySku = new Map(items.map((i) => [i.sku, i]))

  return variants
    .filter((v: any) => v.sku)
    .map((v: any) => {
      const item = itemBySku.get(v.sku)
      const usd = (v.prices ?? []).find((p: any) => p.currency_code === "usd")
      const synced = (item?.metadata as any)?.sheet_stock
      return {
        sku: v.sku,
        title: v.product?.title ?? "",
        price: usd ? Number(usd.amount) : null,
        stock: item ? stockByItem.get(item.id) ?? 0 : null,
        syncedStock: synced != null ? Number(synced) : null,
        promo: (v.product?.tags ?? []).some((t: any) => t.value === PROMO_TAG),
        brand: v.product?.collection?.title ?? "",
        categories: (v.product?.categories ?? [])
          .map((c: any) => c.name)
          .join(", "),
        variantId: v.id,
        productId: v.product?.id,
        inventoryItemId: item?.id ?? null,
      }
    })
}

export const rowsForSheet = (rows: CatalogRow[]) =>
  rows.map((r) => [
    r.sku,
    r.title,
    r.price ?? "",
    r.stock ?? "",
    r.promo ? "SI" : "NO",
    r.brand,
    r.categories,
  ])

const parsePromo = (val: string | undefined) =>
  ["si", "sí", "yes", "true", "1", "x"].includes((val ?? "").trim().toLowerCase())

/** Coerce a número los campos numéricos de Medusa (pueden ser BigNumber). */
export const toNum = (v: any): number => {
  if (v == null) return 0
  if (typeof v === "object") return Number(v.value ?? v.numeric_ ?? v.bigNumber ?? 0)
  return Number(v)
}

/** Guarda en metadata del item el stock que dejamos escrito en la hoja. */
const rememberSyncedStock = async (
  container: MedusaContainer,
  inventoryItemId: string,
  value: number
) => {
  const inventory = container.resolve(Modules.INVENTORY)
  const [item] = await inventory.listInventoryItems({ id: inventoryItemId }, {})
  await inventory.updateInventoryItems([
    {
      id: inventoryItemId,
      metadata: { ...(item?.metadata ?? {}), sheet_stock: value },
    },
  ])
}

/** Deja constancia del stock sincronizado para todos (tras un export). */
export const rememberAllSyncedStock = async (container: MedusaContainer) => {
  const rows = await buildCatalogRows(container)
  for (const r of rows) {
    if (r.inventoryItemId && r.stock != null) {
      await rememberSyncedStock(container, r.inventoryItemId, r.stock)
    }
  }
}

/**
 * Aplica los cambios de la hoja (Precio, Stock, Promocion) sobre la BD.
 * El stock solo se aplica si la persona EDITÓ la celda (difiere del último
 * valor que nosotros sincronizamos) — así las ventas nunca se pisan.
 */
export const applySheetToDb = async (container: MedusaContainer) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
  const inventory = container.resolve(Modules.INVENTORY)
  const productModule = container.resolve(Modules.PRODUCT)

  const [sheetRows, dbRows] = await Promise.all([
    readDataRows(),
    buildCatalogRows(container),
  ])
  const dbBySku = new Map(dbRows.map((r) => [r.sku, r]))
  const [location] = await stockLocation.listStockLocations({}, {})

  const changes: string[] = []

  for (const row of sheetRows) {
    const [sku, , priceRaw, stockRaw, promoRaw] = row
    const db = sku ? dbBySku.get(sku.trim()) : undefined
    if (!db) continue

    // ── Precio (la hoja manda) ──
    const price = parseFloat((priceRaw ?? "").replace(",", "."))
    if (!isNaN(price) && price > 0 && price !== db.price) {
      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: db.variantId },
          update: { prices: [{ amount: price, currency_code: "usd" }] },
        },
      })
      changes.push(`${sku}: precio ${db.price} → ${price}`)
    }

    // ── Stock: solo si la persona editó la celda (≠ último sincronizado) ──
    const stock = parseInt(stockRaw ?? "", 10)
    const editedByHuman = db.syncedStock == null || stock !== db.syncedStock
    if (
      !isNaN(stock) &&
      stock >= 0 &&
      db.inventoryItemId &&
      stock !== db.stock &&
      editedByHuman &&
      location
    ) {
      await inventory.updateInventoryLevels([
        {
          inventory_item_id: db.inventoryItemId,
          location_id: location.id,
          stocked_quantity: stock,
        },
      ])
      await rememberSyncedStock(container, db.inventoryItemId, stock)
      changes.push(`${sku}: stock ${db.stock} → ${stock} (restock manual)`)
    }

    // ── Promoción (la hoja manda) ──
    const promo = parsePromo(promoRaw)
    if (promo !== db.promo) {
      let [tag] = await productModule.listProductTags({ value: PROMO_TAG }, {})
      if (!tag) {
        ;[tag] = await productModule.createProductTags([{ value: PROMO_TAG }])
      }
      const [product] = await productModule.listProducts(
        { id: db.productId },
        { relations: ["tags"] }
      )
      const currentTagIds = (product?.tags ?? []).map((t: any) => t.id)
      const nextTagIds = promo
        ? [...new Set([...currentTagIds, tag.id])]
        : currentTagIds.filter((id: string) => id !== tag.id)
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: db.productId },
          update: { tag_ids: nextTagIds },
        },
      })
      changes.push(`${sku}: promo → ${promo ? "SI" : "NO"}`)
    }
  }

  if (changes.length) {
    logger.info(`[sheet-sync] Cambios aplicados: ${changes.join(" | ")}`)
  }
  return changes
}

/**
 * Aplica una venta al inventario de forma definitiva:
 *  - elimina la reserva que crea Medusa (evita doble conteo)
 *  - descuenta el stock real (stocked_quantity)
 *  - espeja el nuevo stock en la hoja y recuerda el valor (anti-clobber)
 */
export const applySaleToInventory = async (
  container: MedusaContainer,
  soldItems: { lineItemId: string; sku: string; quantity: number }[]
) => {
  const inventory = container.resolve(Modules.INVENTORY)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
  const [location] = await stockLocation.listStockLocations({}, {})
  if (!location) return

  // 1. Soltar reservas de esas líneas (Medusa ya reservó al confirmar el carrito)
  const lineItemIds = soldItems.map((i) => i.lineItemId).filter(Boolean)
  if (lineItemIds.length) {
    await inventory.deleteReservationItemsByLineItem(lineItemIds)
  }

  // 2. Descontar stock real por SKU
  const bySku = new Map<string, number>()
  for (const it of soldItems) {
    if (it.sku) bySku.set(it.sku, (bySku.get(it.sku) ?? 0) + it.quantity)
  }
  const items = await inventory.listInventoryItems(
    { sku: [...bySku.keys()] },
    {}
  )
  for (const item of items) {
    const qty = bySku.get(item.sku!) ?? 0
    if (qty > 0) {
      await inventory.adjustInventory([
        {
          inventoryItemId: item.id,
          locationId: location.id,
          adjustment: -qty,
        },
      ])
    }
  }

  // 3. Espejar el nuevo stock a la hoja + recordar el valor sincronizado
  await pushStockToSheet(container, [...bySku.keys()])
}

/** Refleja en la hoja el stock actual de los SKUs dados y lo recuerda. */
export const pushStockToSheet = async (
  container: MedusaContainer,
  skus: string[]
) => {
  const dbRows = await buildCatalogRows(container)
  const dbBySku = new Map(dbRows.map((r) => [r.sku, r]))
  const sheetRows = await readDataRows()

  for (let i = 0; i < sheetRows.length; i++) {
    const sku = (sheetRows[i][0] ?? "").trim()
    if (sku && skus.includes(sku)) {
      const db = dbBySku.get(sku)
      if (db && db.stock !== null && db.inventoryItemId) {
        // +2: fila 1 es el header y el rango empieza en A2
        await writeStockCell(i + 2, db.stock)
        await rememberSyncedStock(container, db.inventoryItemId, db.stock)
      }
    }
  }
}

/** Restaura stock si un pedido se cancela. */
export const restoreSaleToInventory = async (
  container: MedusaContainer,
  soldItems: { sku: string; quantity: number }[]
) => {
  const inventory = container.resolve(Modules.INVENTORY)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
  const [location] = await stockLocation.listStockLocations({}, {})
  if (!location) return

  const bySku = new Map<string, number>()
  for (const it of soldItems) {
    if (it.sku) bySku.set(it.sku, (bySku.get(it.sku) ?? 0) + it.quantity)
  }
  const items = await inventory.listInventoryItems({ sku: [...bySku.keys()] }, {})
  for (const item of items) {
    const qty = bySku.get(item.sku!) ?? 0
    if (qty > 0) {
      await inventory.adjustInventory([
        { inventoryItemId: item.id, locationId: location.id, adjustment: qty },
      ])
    }
  }
  await pushStockToSheet(container, [...bySku.keys()])
}
