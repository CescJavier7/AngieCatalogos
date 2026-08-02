import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../modules/analytics"
import type AnalyticsModuleService from "../../../modules/analytics/service"

type Body = { product_id?: string }

/**
 * Registra una visita a una ficha de producto. No recibe ni guarda nada de
 * quien visita, así que no necesita consentimiento de cookies.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const productId = (req.body?.product_id ?? "").trim()
  if (!productId.startsWith("prod_")) {
    res.status(400).json({ message: "product_id inválido." })
    return
  }

  const analytics: AnalyticsModuleService = req.scope.resolve(ANALYTICS_MODULE)
  await analytics.recordView(productId)
  res.status(204).send("")
}
