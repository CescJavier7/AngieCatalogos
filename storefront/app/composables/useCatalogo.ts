/**
 * El catálogo completo, pedido UNA vez y compartido.
 *
 * La página del catálogo y las sugerencias de cada ficha necesitan exactamente
 * la misma lista: los mismos productos con los mismos campos. Tenían cada una
 * su consulta, así que abrir tres fichas seguidas bajaba trescientos productos
 * para mostrar ocho. Con la clave compartida, la segunda ya no viaja.
 *
 * Los campos se piden uno por uno y no con `*`: de las imágenes solo se usa la
 * url, de las categorías el nombre, de la colección el título y de las
 * etiquetas el valor. Pedir las relaciones enteras bajaba todas sus columnas
 * —fechas, metadatos, rangos— de los 100 productos.
 */
const CAMPOS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "images.url",
  "*variants.calculated_price",
  "+variants.inventory_quantity",
  "+variants.manage_inventory",
  "categories.name",
  "collection.title",
  "tags.value",
].join(",")

export const useCatalogo = () => {
  const medusa = useMedusa()
  const { data: region } = useRegion()

  return useAsyncData(
    "catalogo",
    async () => {
      const { products } = await medusa.store.product.list({
        limit: 100,
        region_id: region.value?.id,
        fields: CAMPOS,
      })
      return products
    },
    {
      watch: [region],
      /*
        Solo al montar: un refresco explícito sigue yendo al servidor, y si lo
        guardado viniera vacío se vuelve a pedir en vez de mostrar un catálogo
        en blanco.
      */
      getCachedData: (key, nuxtApp, ctx) => {
        if (ctx.cause !== "initial") return undefined
        const guardado = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
        return guardado?.length ? guardado : undefined
      },
    }
  )
}
