/**
 * Categorías reales del catálogo para el menú del encabezado.
 *
 * Se piden a Medusa y no se derivan de los productos a propósito: el menú
 * vive en el layout, o sea en TODAS las páginas, y traerse el catálogo
 * entero solo para pintar una lista de nombres saldría carísimo. La consulta
 * queda cacheada por sesión con la clave de useAsyncData.
 */
export const useCatalogoMenu = () => {
  return useAsyncData(
    "catalogo-menu",
    async () => {
      const medusa = useMedusa()
      const { product_categories } = await medusa.store.category.list({
        limit: 100,
        fields: "id,name",
      })

      const nombres = (product_categories ?? [])
        .map((c: any) => c.name)
        .filter(Boolean) as string[]

      return {
        // El orden de AUDIENCE_CATS es deliberado (Mujeres primero, es el grueso)
        publico: AUDIENCE_CATS.filter((c) => nombres.includes(c)),
        tipos: nombres
          .filter((n) => !AUDIENCE_CATS.includes(n))
          .sort((a, b) => a.localeCompare(b, "es")),
      }
    },
    {
      // El panel vive detrás de un clic, así que el servidor no necesita
      // esperarlo: pedirlo en SSR le sumaría una llamada a CADA página
      server: false,
      lazy: true,
      // Sin categorías el menú se pinta igual, solo que corto
      default: () => ({ publico: [] as string[], tipos: [] as string[] }),
    }
  )
}
