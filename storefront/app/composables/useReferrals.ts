/**
 * Plan "Invita y gana": código propio, progreso y canje de códigos ajenos.
 *
 * Va por `medusa.client.fetch` a propósito: el SDK guarda el token de sesión
 * en localStorage, no en cookies, así que un $fetch normal saldría sin
 * autenticar y el backend devolvería 401.
 */
export const useReferrals = () => {
  const medusa = useMedusa()

  const resumen = () =>
    medusa.client.fetch<{
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
    }>("/store/referrals/me")

  const canjear = (code: string) =>
    medusa.client.fetch<{ ok: boolean; bono: number; message: string }>(
      "/store/referrals/claim",
      { method: "POST", body: { code } }
    )

  const marketing = (accepts: boolean) =>
    medusa.client.fetch<{ accepts_marketing: boolean }>(
      "/store/referrals/marketing",
      { method: "POST", body: { accepts } }
    )

  return { resumen, canjear, marketing }
}
