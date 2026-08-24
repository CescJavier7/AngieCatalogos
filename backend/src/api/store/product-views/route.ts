import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createHash } from "node:crypto"
import { ANALYTICS_MODULE } from "../../../modules/analytics"
import type AnalyticsModuleService from "../../../modules/analytics/service"

type Body = { product_id?: string }

/**
 * Registra una visita a una ficha de producto.
 *
 * Es un endpoint público que escribe, así que lleva freno: sin él, cualquiera
 * puede inflar las métricas que Angie usa para decidir qué reponer y qué
 * rebajar. Se recuerda quién vio qué durante una ventana corta y las visitas
 * repetidas se descartan en silencio.
 *
 * De la persona que visita no se guarda nada: la huella es un hash con sal
 * que vive solo en memoria y se descarta al reiniciar, así que sigue sin
 * haber dato personal ni necesidad de consentimiento.
 */
const VENTANA_MS = 10 * 60 * 1000
const MAX_HUELLAS = 20_000
const vistas = new Map<string, number>()
const SAL = createHash("sha256")
  .update(process.env.COOKIE_SECRET ?? String(Math.random()))
  .digest("hex")

const yaContada = (huella: string) => {
  const ahora = Date.now()
  const previa = vistas.get(huella)
  if (previa && ahora - previa < VENTANA_MS) return true

  // Limpieza perezosa: no dejar que el mapa crezca sin límite
  if (vistas.size > MAX_HUELLAS) {
    for (const [k, t] of vistas) {
      if (ahora - t > VENTANA_MS) vistas.delete(k)
    }
    if (vistas.size > MAX_HUELLAS) vistas.clear()
  }

  vistas.set(huella, ahora)
  return false
}

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const productId = (req.body?.product_id ?? "").trim()
  if (!productId.startsWith("prod_") || productId.length > 64) {
    res.status(400).json({ message: "product_id inválido." })
    return
  }

  const origen =
    (req.headers["cf-connecting-ip"] as string) ??
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.ip ??
    "sin-origen"

  const huella = createHash("sha256")
    .update(`${SAL}:${origen}:${productId}`)
    .digest("hex")

  // Se responde igual haya contado o no: quien lo intente no aprende nada
  if (!yaContada(huella)) {
    const analytics: AnalyticsModuleService = req.scope.resolve(ANALYTICS_MODULE)
    await analytics.recordView(productId)
  }

  res.status(204).send("")
}
