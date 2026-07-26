import { ExecArgs } from "@medusajs/framework/types"
import {
  buildCatalogRows,
  rememberAllSyncedStock,
  rowsForSheet,
} from "../lib/catalog-sync"
import { replaceAllRows, sheetsEnabled } from "../lib/google-sheets"

/**
 * Exportación inicial: vuelca todo el catálogo a la hoja de Google
 * y recuerda el stock sincronizado (para el guardián anti-clobber).
 * Uso: npx medusa exec ./src/scripts/sheet-export.ts
 */
export default async function sheetExport({ container }: ExecArgs) {
  if (!sheetsEnabled()) {
    throw new Error(
      "Faltan GOOGLE_SA_KEY_FILE y/o GOOGLE_SHEET_ID en el entorno."
    )
  }
  const rows = await buildCatalogRows(container)
  await replaceAllRows(rowsForSheet(rows))
  await rememberAllSyncedStock(container)
  console.log(`✔ ${rows.length} productos exportados a la hoja.`)
}
