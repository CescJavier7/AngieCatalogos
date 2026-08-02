import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ANALYTICS_MODULE } from "../../../modules/analytics"
import type AnalyticsModuleService from "../../../modules/analytics/service"

const num = (v: any): number => {
  if (v == null) return 0
  if (typeof v === "object") return Number(v.value ?? v.numeric_ ?? 0)
  return Number(v) || 0
}

/**
 * Métricas del panel: margen, rotación y conversión por producto.
 *
 * Se calcula todo aquí y no en el navegador para que el panel cargue una sola
 * respuesta pequeña en vez de todo el catálogo y todos los pedidos.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventory = req.scope.resolve(Modules.INVENTORY)

  const dias = Math.min(Number(req.query.dias ?? 30) || 30, 365)
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)

  // ── Catálogo: precio, costo y stock ──
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "metadata",
      "product.id",
      "product.title",
      "product.status",
      "product.thumbnail",
      "product.collection.title",
      "prices.amount",
      "prices.currency_code",
    ],
  })

  const skus = variants.map((v: any) => v.sku).filter(Boolean)
  const items = skus.length ? await inventory.listInventoryItems({ sku: skus }, {}) : []
  const levels = items.length
    ? await inventory.listInventoryLevels(
        { inventory_item_id: items.map((i: any) => i.id) },
        {}
      )
    : []
  const stockPorItem = new Map<string, number>()
  for (const l of levels as any[]) {
    stockPorItem.set(
      l.inventory_item_id,
      (stockPorItem.get(l.inventory_item_id) ?? 0) + num(l.stocked_quantity)
    )
  }
  const itemPorSku = new Map(items.map((i: any) => [i.sku, i]))

  // ── Visitas: el módulo puede no estar migrado todavía ──
  let visitas = new Map<string, number>()
  let hayVisitas = true
  try {
    const analytics: AnalyticsModuleService = req.scope.resolve(ANALYTICS_MODULE)
    visitas = await analytics.viewsByProduct(dias)
  } catch {
    hayVisitas = false
  }

  // ── Ventas del periodo ──
  const { data: orders } = await query.graph({
    entity: "order",
    // items.* y no campos sueltos: pidiendo "items.quantity" explícitamente
    // la cantidad no viene, y el item no expone "total".
    fields: ["id", "created_at", "status", "items.*"],
  })

  const vendidasPorSku = new Map<string, { unidades: number; ingresos: number }>()
  const porSemana = new Map<string, { ingresos: number; unidades: number }>()
  let pedidos = 0
  let ingresosTotales = 0

  for (const o of orders as any[]) {
    const fecha = new Date(o.created_at)
    if (fecha < desde || o.status === "canceled") continue
    pedidos++
    // La clave se arma con la fecha local: pasar por toISOString corría el
    // día y partía una misma semana en dos.
    const lunes = new Date(fecha)
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
    const clave = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, "0")}-${String(lunes.getDate()).padStart(2, "0")}`

    for (const it of o.items ?? []) {
      const sku = it.variant_sku
      if (!sku) continue
      const unidades = num(it.quantity)
      const ingreso = num(it.unit_price) * unidades
      const acc = vendidasPorSku.get(sku) ?? { unidades: 0, ingresos: 0 }
      vendidasPorSku.set(sku, {
        unidades: acc.unidades + unidades,
        ingresos: acc.ingresos + ingreso,
      })
      const sem = porSemana.get(clave) ?? { ingresos: 0, unidades: 0 }
      porSemana.set(clave, {
        ingresos: sem.ingresos + ingreso,
        unidades: sem.unidades + unidades,
      })
      ingresosTotales += ingreso
    }
  }

  // ── Una fila por producto ──
  const semanas = Math.max(dias / 7, 1)
  const productos = variants
    .filter((v: any) => v.sku && v.product?.id)
    .map((v: any) => {
      const usd = (v.prices ?? []).find((p: any) => p.currency_code === "usd")
      const precio = usd ? num(usd.amount) : 0
      const costo = v.metadata?.costo != null ? Number(v.metadata.costo) : null
      const item = itemPorSku.get(v.sku)
      const stock = item ? stockPorItem.get(item.id) ?? 0 : 0
      const venta = vendidasPorSku.get(v.sku) ?? { unidades: 0, ingresos: 0 }
      const vistas = visitas.get(v.product.id) ?? 0
      const margen = costo != null ? precio - costo : null

      return {
        id: v.product.id,
        titulo: v.product.title,
        sku: v.sku,
        marca: v.product.collection?.title ?? "—",
        activo: v.product.status === "published",
        precio,
        costo,
        margen,
        margenPct: margen != null && precio > 0 ? (margen / precio) * 100 : null,
        unidades: venta.unidades,
        ingresos: venta.ingresos,
        utilidad: margen != null ? margen * venta.unidades : null,
        stock,
        capital: costo != null ? costo * stock : null,
        // Semanas que duraría el stock al ritmo actual de venta
        cobertura:
          venta.unidades > 0 ? stock / (venta.unidades / semanas) : null,
        visitas: vistas,
        conversion: vistas > 0 ? (venta.unidades / vistas) * 100 : null,
      }
    })

  const conCosto = productos.filter((p) => p.costo != null)

  res.json({
    dias,
    hayVisitas,
    resumen: {
      pedidos,
      ingresos: ingresosTotales,
      unidades: [...vendidasPorSku.values()].reduce((a, b) => a + b.unidades, 0),
      ticket: pedidos > 0 ? ingresosTotales / pedidos : 0,
      utilidad: conCosto.reduce((a, p) => a + (p.utilidad ?? 0), 0),
      capital: conCosto.reduce((a, p) => a + (p.capital ?? 0), 0),
      productos: productos.length,
      sinCosto: productos.length - conCosto.length,
      sinFoto: variants.filter((v: any) => !v.product?.thumbnail).length,
      visitasTotales: [...visitas.values()].reduce((a, b) => a + b, 0),
    },
    productos,
    semanas: [...porSemana.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([semana, v]) => ({ semana, ...v })),
  })
}
