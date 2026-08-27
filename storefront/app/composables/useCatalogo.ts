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

  return useAsyncData(
    "catalogo",
    async () => {
      /*
        La región se resuelve AQUÍ DENTRO, no fuera.

        Fuera hacía falta un `await` para tener su id a tiempo, y un `await`
        en mitad de un composable le quita a Nuxt el contexto del componente
        (NUXT_E1001). Sin `await`, en el servidor la región llegaba vacía, la
        consulta salía sin `region_id`, Medusa rechazaba los precios
        calculados y el catálogo se pintaba sin un solo producto. En el
        navegador no se notaba porque después se volvía a pedir — pero
        Googlebot solo lee lo que sirve el servidor, y veía una tienda vacía.

        Dentro del handler el `await` es libre y el orden queda garantizado.
      */
      const { regions } = await medusa.store.region.list()

      const { products } = await medusa.store.product.list({
        limit: 100,
        region_id: regions[0]?.id,
        fields: CAMPOS,
      })
      return products
    },
    {
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
