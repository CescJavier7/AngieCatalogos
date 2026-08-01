/**
 * Las categorías del catálogo viven en dos grupos que se cruzan: a quién va
 * dirigido el producto y qué tipo de producto es. Cualquier categoría nueva
 * que llegue desde la hoja cae sola en "tipo de producto".
 */
export const AUDIENCE_CATS = ["Hombres", "Mujeres", "Niños", "Unisex"]

/** Categorías de público de un producto. */
export const publicoDe = (p: any): string[] =>
  (p?.categories ?? [])
    .map((c: any) => c.name)
    .filter((n: string) => AUDIENCE_CATS.includes(n))

/** Categorías de tipo de producto (todo lo que no es público). */
export const tipoDe = (p: any): string[] =>
  (p?.categories ?? [])
    .map((c: any) => c.name)
    .filter((n: string) => !AUDIENCE_CATS.includes(n))

/**
 * ¿Este producto le sirve a quien mira uno dirigido a `publico`?
 * Un artículo de hombre nunca se sugiere en una ficha de mujer, pero lo
 * unisex y lo que aún no tiene público asignado sí pasan.
 */
export const mismoPublico = (candidato: any, publico: string[]) => {
  if (!publico.length) return true
  const suyo = publicoDe(candidato)
  if (!suyo.length || suyo.includes("Unisex")) return true
  return suyo.some((n) => publico.includes(n))
}
