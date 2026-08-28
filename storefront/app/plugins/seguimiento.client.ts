/**
 * Píxel de Meta (Facebook e Instagram).
 *
 * Sin `NUXT_PUBLIC_META_PIXEL_ID` no carga nada: ni script, ni cookie, ni una
 * sola petición a Facebook. Mismo criterio que PayPhone y el login de Google
 * — una integración a medias no debe dejar rastro en la tienda.
 *
 * Existe por una razón concreta: si se paga publicidad sin enviar el evento
 * de compra, Meta optimiza a ciegas. Muestra los anuncios a quien hace clic,
 * no a quien compra, y la mayor parte del presupuesto se va en curiosos. El
 * evento `Purchase` con su valor es lo que convierte el gasto en aprendizaje.
 */
export default defineNuxtPlugin(() => {
  const id = useRuntimeConfig().public.metaPixelId
  if (!id) return

  const w = window as any
  if (w.fbq) return

  /* Fragmento oficial de Meta, con la cola de eventos previa a la carga */
  const fbq: any = (...args: any[]) => {
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args)
  }
  w.fbq = fbq
  w._fbq = w._fbq || fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.queue = []

  const s = document.createElement("script")
  s.async = true
  s.src = "https://connect.facebook.net/en_US/fbevents.js"
  document.head.appendChild(s)

  fbq("init", id)
  fbq("track", "PageView")

  // Una compra recorre varias vistas sin recargar: cada una es una página
  const router = useRouter()
  router.afterEach(() => fbq("track", "PageView"))
})
