import { ExecArgs } from "@medusajs/framework/types"
import { buildCatalogRows, rowsForSheet } from "../lib/catalog-sync"

/**
 * Vista previa de lo que se exportaría a la hoja (no toca Google).
 * Uso: npx medusa exec ./src/scripts/sheet-preview.ts
 */
export default async function sheetPreview({ container }: ExecArgs) {
  const rows = rowsForSheet(await buildCatalogRows(container))
  for (const r of rows) {
    console.log(r.join(" | "))
  }
  console.log(`— ${rows.length} filas`)
}
