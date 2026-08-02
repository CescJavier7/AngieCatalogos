import { model } from "@medusajs/framework/utils"

/**
 * Visitas a una ficha de producto, agregadas por día.
 *
 * A propósito no se guarda nada de quien visita: ni IP, ni identificador, ni
 * sesión. Solo un contador por producto y día, que es lo único que hace falta
 * para saber qué se mira y qué no. Al no haber dato personal, no requiere
 * consentimiento de cookies.
 */
const ProductView = model.define("product_view", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  /** Fecha en formato YYYY-MM-DD. */
  day: model.text(),
  views: model.number().default(0),
})

export default ProductView
