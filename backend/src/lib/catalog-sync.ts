import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  updateInventoryLevelsWorkflow,
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
      return {
        sku: v.sku,
        title: v.product?.title ?? "",
        price: usd ? Number(usd.amount) : null,
        stock: item ? stockByItem.get(item.id) ?? 0 : null,
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

/**
 * Aplica los cambios de la hoja (Precio, Stock, Promocion) sobre la BD.
 * Devuelve un resumen de cambios aplicados.
 */
export const applySheetToDb = async (container: MedusaContainer) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
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

    // ── Precio ──
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

    // ── Stock ──
    const stock = parseInt(stockRaw ?? "", 10)
    if (!isNaN(stock) && stock >= 0 && db.inventoryItemId && stock !== db.stock && location) {
      await updateInventoryLevelsWorkflow(container).run({
        input: {
          updates: [
            {
              inventory_item_id: db.inventoryItemId,
              location_id: location.id,
              stocked_quantity: stock,
            },
          ],
        },
      })
      changes.push(`${sku}: stock ${db.stock} → ${stock}`)
    }

    // ── Promoción ──
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

/** Tras una venta: refleja en la hoja el stock actual de los SKUs afectados. */
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
      if (db && db.stock !== null) {
        // +2: la fila 1 es el header y el rango empieza en A2
        await writeStockCell(i + 2, db.stock)
      }
    }
  }
}
