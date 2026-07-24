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

/** Región Ecuador (la única de la tienda), cacheada por sesión. */
export const useRegion = () => {
  return useAsyncData("region", async () => {
    const medusa = useMedusa()
    const { regions } = await medusa.store.region.list()
    return regions[0]
  })
}
