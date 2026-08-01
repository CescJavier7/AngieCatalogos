/** Plan "Invita y gana": código propio, progreso y canje de códigos ajenos. */
export const useReferrals = () => {
  const { public: cfg } = useRuntimeConfig()

  const pedir = <T>(ruta: string, init?: any) =>
    $fetch<T>(`${cfg.medusaUrl}/store/referrals${ruta}`, {
      credentials: "include",
      headers: { "x-publishable-api-key": cfg.medusaPublishableKey },
      ...init,
    })

  const resumen = () =>
    pedir<{
      code: string
      balance: number
      redeemed: number
      qualified_count: number
      accepts_marketing: boolean
      tope: number
      progreso: {
        meta: number | null
        faltan: number
        porcentaje: number
        premio: number
      }
      amigos: { status: string; reward: number; created_at: string }[]
    }>("/me")

  const canjear = (code: string) =>
    pedir<{ ok: boolean; bono: number; message: string }>("/claim", {
      method: "POST",
      body: { code },
    })

  const marketing = (accepts: boolean) =>
    pedir<{ accepts_marketing: boolean }>("/marketing", {
      method: "POST",
      body: { accepts },
    })

  return { resumen, canjear, marketing }
}
