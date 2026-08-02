import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { readDataRows, writeSkuCell, writeStockCell } from "./google-sheets"

const PROMO_TAG = "promocion"

type CatalogRow = {
  sku: string
  title: string
  price: number | null
  stock: number | null
  syncedStock: number | null
  promo: boolean
  description: string
  image: string
  brand: string
  categories: string
  active: boolean
  cost: number | null
  variantId: string
  productId: string
  inventoryItemId: string | null
}

/** Coerce a número los campos numéricos de Medusa (pueden ser BigNumber). */
export const toNum = (v: any): number => {
  if (v == null) return 0
  if (typeof v === "object") return Number(v.value ?? v.numeric_ ?? v.bigNumber ?? 0)
  return Number(v)
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const isImageUrl = (s: string) => /^https?:\/\/.+/i.test((s ?? "").trim())

const parsePromo = (val: string | undefined) =>
  ["si", "sí", "yes", "true", "1", "x"].includes((val ?? "").trim().toLowerCase())

const parseActive = (val: string | undefined) => {
  const v = (val ?? "").trim().toLowerCase()
  // Vacío = activo por defecto (para no ocultar sin querer)
  if (v === "") return true
  return !["no", "n", "false", "0", "inactivo", "oculto"].includes(v)
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
      "metadata",
      "product.id",
      "product.title",
      "product.description",
      "product.thumbnail",
      "product.status",
      "product.collection.title",
      "product.categories.name",
      "product.tags.value",
      "prices.amount",
      "prices.currency_code",
    ],
  })

  const skus = variants.map((v: any) => v.sku).filter(Boolean)
  const items = skus.length
    ? await inventory.listInventoryItems({ sku: skus }, {})
    : []
  const levels = items.length
    ? await inventory.listInventoryLevels(
        { inventory_item_id: items.map((i) => i.id) },
        {}
      )
    : []
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
        description: v.product?.description ?? "",
        image: v.product?.thumbnail ?? "",
        brand: v.product?.collection?.title ?? "",
        categories: (v.product?.categories ?? [])
          .map((c: any) => c.name)
          .join(", "),
        active: v.product?.status === "published",
        cost: v.metadata?.costo != null ? Number(v.metadata.costo) : null,
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
    r.description,
    r.image,
    r.brand,
    r.categories,
    r.active ? "SI" : "NO",
    r.cost ?? "",
  ])

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

export const rememberAllSyncedStock = async (container: MedusaContainer) => {
  const rows = await buildCatalogRows(container)
  for (const r of rows) {
    if (r.inventoryItemId && r.stock != null) {
      await rememberSyncedStock(container, r.inventoryItemId, r.stock)
    }
  }
}

/** Busca (o crea) una colección de marca por nombre. */
const resolveCollectionId = async (
  container: MedusaContainer,
  name: string
): Promise<string | undefined> => {
  const clean = (name ?? "").trim()
  if (!clean) return undefined
  const product = container.resolve(Modules.PRODUCT)
  const [existing] = await product.listProductCollections({ title: clean }, {})
  if (existing) return existing.id
  const [created] = await product.createProductCollections([{ title: clean }])
  return created.id
}

/** Convierte "A, B, C" en ids de categoría (creándolas si faltan). */
const resolveCategoryIds = async (
  container: MedusaContainer,
  csv: string
): Promise<string[]> => {
  const names = (csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!names.length) return []
  const product = container.resolve(Modules.PRODUCT)
  const ids: string[] = []
  for (const name of names) {
    const [existing] = await product.listProductCategories({ name }, {})
    if (existing) {
      ids.push(existing.id)
    } else {
      const [created] = await product.createProductCategories([
        { name, is_active: true },
      ])
      ids.push(created.id)
    }
  }
  return ids
}

const getPromoTagId = async (container: MedusaContainer) => {
  const product = container.resolve(Modules.PRODUCT)
  let [tag] = await product.listProductTags({ value: PROMO_TAG }, {})
  if (!tag) [tag] = await product.createProductTags([{ value: PROMO_TAG }])
  return tag.id
}

export type SheetRecord = {
  rowNumber: number
  sku: string
  title: string
  price: number | null
  stock: number | null
  promo: boolean
  description: string
  image: string
  brand: string
  categories: string
  active: boolean
  cost: number | null
}

const parseSheetRow = (row: string[], rowNumber: number): SheetRecord => {
  const price = parseFloat((row[2] ?? "").replace(",", "."))
  const stock = parseInt(row[3] ?? "", 10)
  const cost = parseFloat((row[10] ?? "").replace(",", "."))
  return {
    rowNumber,
    sku: (row[0] ?? "").trim(),
    title: (row[1] ?? "").trim(),
    price: isNaN(price) ? null : price,
    stock: isNaN(stock) ? null : stock,
    promo: parsePromo(row[4]),
    description: (row[5] ?? "").trim(),
    image: (row[6] ?? "").trim(),
    brand: (row[7] ?? "").trim(),
    categories: (row[8] ?? "").trim(),
    active: parseActive(row[9]),
    cost: isNaN(cost) ? null : cost,
  }
}

/** Crea un producto nuevo a partir de una fila de la hoja. */
export const createProductFromSheet = async (
  container: MedusaContainer,
  rec: SheetRecord,
  ctx: {
    salesChannelId: string
    shippingProfileId: string
    locationId: string
  }
) => {
  const inventory = container.resolve(Modules.INVENTORY)
  const handle = slugify(rec.title)
  const sku = rec.sku || handle.toUpperCase().replace(/-/g, "_")
  const collectionId = await resolveCollectionId(container, rec.brand)
  const categoryIds = await resolveCategoryIds(container, rec.categories)
  const tagIds = rec.promo ? [await getPromoTagId(container)] : []

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: rec.title,
          description: rec.description || undefined,
          handle,
          status: rec.active ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
          shipping_profile_id: ctx.shippingProfileId,
          collection_id: collectionId,
          category_ids: categoryIds,
          tag_ids: tagIds,
          images: isImageUrl(rec.image) ? [{ url: rec.image }] : undefined,
          thumbnail: isImageUrl(rec.image) ? rec.image : undefined,
          options: [{ title: "Presentación", values: ["Único"] }],
          variants: [
            {
              title: "Único",
              sku,
              options: { Presentación: "Único" },
              prices: [{ amount: rec.price ?? 0, currency_code: "usd" }],
              // El costo vive en la variante: es lo que permite el margen
              metadata: rec.cost != null ? { costo: rec.cost } : undefined,
            },
          ],
          sales_channels: [{ id: ctx.salesChannelId }],
        },
      ],
    },
  })

  // Nivel de inventario inicial
  const createdSku = result[0]?.variants?.[0]?.sku
  if (createdSku) {
    const [item] = await inventory.listInventoryItems({ sku: createdSku }, {})
    if (item) {
      await inventory.createInventoryLevels([
        {
          inventory_item_id: item.id,
          location_id: ctx.locationId,
          stocked_quantity: rec.stock ?? 0,
        },
      ])
      await rememberSyncedStock(container, item.id, rec.stock ?? 0)
    }
  }
  return sku
}

/**
 * Sincroniza la hoja → la tienda: crea productos nuevos, actualiza los
 * existentes (precio, stock, promo, descripción, imagen, marca, categorías,
 * activo) y oculta (archiva) los que ya no están en la hoja.
 */
export const applySheetToDb = async (container: MedusaContainer) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
  const inventory = container.resolve(Modules.INVENTORY)
  const salesChannel = container.resolve(Modules.SALES_CHANNEL)
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const productModule = container.resolve(Modules.PRODUCT)

  const [sheetRaw, dbRows] = await Promise.all([
    readDataRows(),
    buildCatalogRows(container),
  ])
  const dbBySku = new Map(dbRows.map((r) => [r.sku, r]))
  const [location] = await stockLocation.listStockLocations({}, {})
  const [channel] = await salesChannel.listSalesChannels({ name: "Tienda Online" }, {})
  const [profile] = await fulfillment.listShippingProfiles({ type: "default" }, {})

  const changes: string[] = []
  const seenSkus = new Set<string>()

  for (let i = 0; i < sheetRaw.length; i++) {
    const rec = parseSheetRow(sheetRaw[i], i + 2)
    if (!rec.title) continue // fila vacía

    // ── Producto NUEVO ──
    if (!rec.sku || !dbBySku.has(rec.sku)) {
      if (!location || !channel || !profile) continue
      try {
        const newSku = await createProductFromSheet(container, rec, {
          salesChannelId: channel.id,
          shippingProfileId: profile.id,
          locationId: location.id,
        })
        seenSkus.add(newSku)
        if (!rec.sku) await writeSkuCell(rec.rowNumber, newSku) // devolver el SKU generado
        changes.push(`NUEVO: ${rec.title} (${newSku})`)
      } catch (e: any) {
        logger.error(`[sheet-sync] No se pudo crear "${rec.title}": ${e.message}`)
      }
      continue
    }

    const db = dbBySku.get(rec.sku)!
    seenSkus.add(rec.sku)

    // ── Precio ──
    if (rec.price != null && rec.price > 0 && rec.price !== db.price) {
      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: db.variantId },
          update: { prices: [{ amount: rec.price, currency_code: "usd" }] },
        },
      })
      changes.push(`${rec.sku}: precio ${db.price} → ${rec.price}`)
    }

    // ── Stock: solo si la persona editó la celda ──
    const editedByHuman = db.syncedStock == null || rec.stock !== db.syncedStock
    if (
      rec.stock != null &&
      rec.stock >= 0 &&
      db.inventoryItemId &&
      rec.stock !== db.stock &&
      editedByHuman &&
      location
    ) {
      await inventory.updateInventoryLevels([
        {
          inventory_item_id: db.inventoryItemId,
          location_id: location.id,
          stocked_quantity: rec.stock,
        },
      ])
      await rememberSyncedStock(container, db.inventoryItemId, rec.stock)
      changes.push(`${rec.sku}: stock ${db.stock} → ${rec.stock}`)
    }

    // ── Costo (columna K): base del margen que se ve en el panel ──
    if (rec.cost != null && rec.cost >= 0 && rec.cost !== db.cost) {
      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: db.variantId },
          update: { metadata: { costo: rec.cost } },
        },
      })
      changes.push(`${rec.sku}: costo ${db.cost ?? "—"} → ${rec.cost}`)
    }

    // ── Campos de producto (descripción, imagen, marca, categorías, activo, promo) ──
    const update: any = {}
    if (rec.description && rec.description !== db.description) {
      update.description = rec.description
    }
    if (isImageUrl(rec.image) && rec.image !== db.image) {
      update.images = [{ url: rec.image }]
      update.thumbnail = rec.image
    }
    if (rec.brand && rec.brand !== db.brand) {
      update.collection_id = await resolveCollectionId(container, rec.brand)
    }
    if (rec.categories && rec.categories !== db.categories) {
      update.category_ids = await resolveCategoryIds(container, rec.categories)
    }
    if (rec.active !== db.active) {
      update.status = rec.active ? ProductStatus.PUBLISHED : ProductStatus.DRAFT
    }
    if (rec.promo !== db.promo) {
      const tagId = await getPromoTagId(container)
      const [product] = await productModule.listProducts(
        { id: db.productId },
        { relations: ["tags"] }
      )
      const current = (product?.tags ?? []).map((t: any) => t.id)
      update.tag_ids = rec.promo
        ? [...new Set([...current, tagId])]
        : current.filter((id: string) => id !== tagId)
    }
    if (Object.keys(update).length) {
      await updateProductsWorkflow(container).run({
        input: { selector: { id: db.productId }, update },
      })
      changes.push(`${rec.sku}: ${Object.keys(update).join(", ")}`)
    }
  }

  // ── Ocultar productos que ya no están en la hoja (archivar, no borrar) ──
  for (const db of dbRows) {
    if (!seenSkus.has(db.sku) && db.active) {
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: db.productId },
          update: { status: ProductStatus.DRAFT },
        },
      })
      changes.push(`${db.sku}: oculto (ya no está en la hoja)`)
    }
  }

  if (changes.length) {
    logger.info(`[sheet-sync] ${changes.length} cambios: ${changes.join(" | ")}`)
  }
  return changes
}

/**
 * Aplica una venta al inventario de forma definitiva y la espeja en la hoja.
 */
export const applySaleToInventory = async (
  container: MedusaContainer,
  soldItems: { lineItemId: string; sku: string; quantity: number }[]
) => {
  const inventory = container.resolve(Modules.INVENTORY)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
  const [location] = await stockLocation.listStockLocations({}, {})
  if (!location) return

  const lineItemIds = soldItems.map((i) => i.lineItemId).filter(Boolean)
  if (lineItemIds.length) {
    await inventory.deleteReservationItemsByLineItem(lineItemIds)
  }

  const bySku = new Map<string, number>()
  for (const it of soldItems) {
    if (it.sku) bySku.set(it.sku, (bySku.get(it.sku) ?? 0) + it.quantity)
  }
  const items = await inventory.listInventoryItems({ sku: [...bySku.keys()] }, {})
  for (const item of items) {
    const qty = bySku.get(item.sku!) ?? 0
    if (qty > 0) {
      await inventory.adjustInventory([
        { inventoryItemId: item.id, locationId: location.id, adjustment: -qty },
      ])
    }
  }

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
