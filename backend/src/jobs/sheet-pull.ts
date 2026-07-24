import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { applySheetToDb } from "../lib/catalog-sync"
import { sheetsEnabled } from "../lib/google-sheets"

/**
 * Cada 5 minutos: lee la hoja de Google y aplica cambios de
 * Precio / Stock / Promocion a la base de datos.
 */
export default async function sheetPullJob(container: MedusaContainer) {
  if (!sheetsEnabled()) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const changes = await applySheetToDb(container)
    if (changes.length) {
      logger.info(`[sheet-sync] ${changes.length} cambios desde la hoja.`)
    }
  } catch (e: any) {
    logger.error(`[sheet-sync] Error sincronizando: ${e.message}`)
  }
}

export const config = {
  name: "google-sheet-pull",
  schedule: "*/5 * * * *",
}
