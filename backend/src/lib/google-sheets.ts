import { readFileSync } from "fs"
import { JWT } from "google-auth-library"

/**
 * Cliente mínimo de Google Sheets (REST v4) con cuenta de servicio.
 * Config por env:
 *   GOOGLE_SA_KEY_FILE → ruta al JSON de la cuenta de servicio
 *   GOOGLE_SHEET_ID    → id de la hoja de cálculo
 * Si falta alguna, `sheetsEnabled()` devuelve false y los syncs no-opean.
 */

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

/** Pestaña y layout del inventario. Columnas editables: Precio, Stock, Promocion. */
export const SHEET_TAB = "Productos"
export const SHEET_HEADER = [
  "SKU",
  "Producto",
  "Precio",
  "Stock",
  "Promocion",
  "Marca",
  "Categorias",
]

let jwtClient: JWT | null = null

export const sheetsEnabled = () =>
  !!process.env.GOOGLE_SA_KEY_FILE && !!process.env.GOOGLE_SHEET_ID

const getClient = (): JWT => {
  if (!jwtClient) {
    const raw = JSON.parse(
      readFileSync(process.env.GOOGLE_SA_KEY_FILE!, "utf-8")
    )
    jwtClient = new JWT({
      email: raw.client_email,
      key: raw.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
  }
  return jwtClient
}

const authedFetch = async (url: string, init?: RequestInit) => {
  const { token } = await getClient().getAccessToken()
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    throw new Error(`Sheets API ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  return res.json()
}

const sheetId = () => process.env.GOOGLE_SHEET_ID!

/** Lee un rango (A1 notation). Devuelve matriz de strings. */
export const readRange = async (range: string): Promise<string[][]> => {
  const data = await authedFetch(
    `${SHEETS_API}/${sheetId()}/values/${encodeURIComponent(range)}`
  )
  return (data.values as string[][]) ?? []
}

/** Escribe un rango (A1 notation) con valores crudos. */
export const writeRange = async (range: string, values: unknown[][]) => {
  await authedFetch(
    `${SHEETS_API}/${sheetId()}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ range, values }) }
  )
}

/** Limpia y reescribe toda la pestaña de productos (header + filas). */
export const replaceAllRows = async (rows: unknown[][]) => {
  await authedFetch(
    `${SHEETS_API}/${sheetId()}/values/${encodeURIComponent(`${SHEET_TAB}!A1:Z10000`)}:clear`,
    { method: "POST", body: "{}" }
  )
  await writeRange(`${SHEET_TAB}!A1`, [SHEET_HEADER, ...rows])
}

/** Filas de datos (desde A2). */
export const readDataRows = () => readRange(`${SHEET_TAB}!A2:G`)

/** Escribe el stock (col D) de una fila concreta (1-indexed contando el header). */
export const writeStockCell = (rowNumber: number, stock: number) =>
  writeRange(`${SHEET_TAB}!D${rowNumber}`, [[stock]])
