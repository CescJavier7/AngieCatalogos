import { ExecArgs } from "@medusajs/framework/types"
import { applySheetToDb } from "../lib/catalog-sync"
import { sheetsEnabled } from "../lib/google-sheets"

/**
 * Sincronización manual inmediata: hoja → base de datos.
 * (La automática corre sola cada 5 minutos vía el job google-sheet-pull.)
 * Uso: npx medusa exec ./src/scripts/sheet-pull.ts
 */
export default async function sheetPullOnce({ container }: ExecArgs) {
  if (!sheetsEnabled()) {
    throw new Error("Faltan GOOGLE_SA_KEY_FILE y/o GOOGLE_SHEET_ID.")
  }
  const changes = await applySheetToDb(container)
  if (!changes.length) {
    console.log("✔ Sin cambios: la hoja y la tienda ya están alineadas.")
  } else {
    console.log(`✔ ${changes.length} cambios aplicados:`)
    for (const c of changes) console.log("  •", c)
  }
}
