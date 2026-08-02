import { MedusaService } from "@medusajs/framework/utils"
import ProductView from "./models/product-view"

class AnalyticsModuleService extends MedusaService({
  ProductView,
}) {
  /** Suma una visita al contador del día. */
  async recordView(productId: string) {
    const day = new Date().toISOString().slice(0, 10)
    const [fila] = await this.listProductViews(
      { product_id: productId, day },
      {}
    )
    if (fila) {
      await this.updateProductViews([{ id: fila.id, views: fila.views + 1 }])
      return
    }
    await this.createProductViews([{ product_id: productId, day, views: 1 }])
  }

  /** Visitas por producto en los últimos `dias` días. */
  async viewsByProduct(dias = 30) {
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)
    const day = desde.toISOString().slice(0, 10)

    const filas = await this.listProductViews({ day: { $gte: day } } as any, {})
    const total = new Map<string, number>()
    for (const f of filas) {
      total.set(f.product_id, (total.get(f.product_id) ?? 0) + f.views)
    }
    return total
  }
}

export default AnalyticsModuleService
