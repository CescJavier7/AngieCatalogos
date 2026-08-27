import Medusa from "@medusajs/js-sdk"

let client: Medusa | null = null

export const useMedusa = () => {
  const config = useRuntimeConfig()

  if (!client) {
    client = new Medusa({
      baseUrl: config.public.medusaUrl,
      publishableKey: config.public.medusaPublishableKey,
    })
  }

  return client
}

/**
 * Región Ecuador (la única de la tienda), cacheada por sesión.
 *
 * El catálogo la espera antes de pedir los productos, así que sin caché cada
 * entrada a la tienda pagaba dos viajes al servidor en fila en vez de uno.
 */
export const useRegion = () => {
  return useAsyncData(
    "region",
    async () => {
      const medusa = useMedusa()
      const { regions } = await medusa.store.region.list()
      return regions[0]
    },
    {
      getCachedData: (key, nuxtApp, ctx) =>
        ctx.cause === "initial"
          ? nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
          : undefined,
    }
  )
}
