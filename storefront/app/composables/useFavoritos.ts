/**
 * Favoritos de la clienta, guardados en su propio dispositivo.
 *
 * No viajan al servidor ni identifican a nadie, así que no hacen falta cookies
 * de seguimiento ni consentimiento: es almacenamiento local, como una lista
 * de deseos en el bolsillo.
 */
const CLAVE = "angie_favoritos"

export const useFavoritos = () => {
  const ids = useState<string[]>("favoritos", () => [])
  const listo = useState<boolean>("favoritos-listo", () => false)

  const cargar = () => {
    if (listo.value || !import.meta.client) return
    try {
      ids.value = JSON.parse(localStorage.getItem(CLAVE) ?? "[]")
    } catch {
      ids.value = []
    }
    listo.value = true
  }

  const guardar = () => {
    if (import.meta.client) {
      localStorage.setItem(CLAVE, JSON.stringify(ids.value))
    }
  }

  const esFavorito = (id: string) => ids.value.includes(id)

  const alternar = (id: string) => {
    ids.value = esFavorito(id)
      ? ids.value.filter((x) => x !== id)
      : [...ids.value, id]
    guardar()
  }

  return { ids, cargar, esFavorito, alternar, total: computed(() => ids.value.length) }
}
