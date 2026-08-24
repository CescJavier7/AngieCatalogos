/**
 * Cabeceras de seguridad, aplicadas en tiempo de EJECUCIÓN.
 *
 * No pueden vivir en routeRules de nuxt.config: allí se evalúan al construir
 * la imagen, cuando NUXT_PUBLIC_MEDUSA_URL todavía no existe —solo se define
 * al arrancar el contenedor—, y la política acababa grabada con localhost.
 * El resultado era que el navegador bloqueaba toda llamada a la API: el
 * servidor pintaba la página, pero al navegar dentro del sitio quedaba vacía
 * y solo se arreglaba recargando.
 *
 * La política es permisiva con las imágenes a propósito: las fotos de
 * producto vienen de dominios que se escriben en la hoja de Google y no se
 * pueden enumerar de antemano.
 */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("render:response", (response, { event }) => {
    const api = useRuntimeConfig(event).public.medusaUrl || ""

    const politica = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
      `connect-src 'self' ${api} https://cloudflareinsights.com`.trim(),
      "form-action 'self' https://pay.payphonetodoesposible.com",
      "upgrade-insecure-requests",
    ].join("; ")

    const cabeceras = response.headers as Record<string, string | undefined>
    cabeceras["content-security-policy"] = politica
    cabeceras["strict-transport-security"] = "max-age=31536000; includeSubDomains"
    cabeceras["x-content-type-options"] = "nosniff"
    cabeceras["x-frame-options"] = "DENY"
    cabeceras["referrer-policy"] = "strict-origin-when-cross-origin"
    cabeceras["permissions-policy"] =
      "camera=(), microphone=(), geolocation=(), payment=()"
    // No anunciar el framework: solo orienta a quien busca fallos conocidos
    delete cabeceras["x-powered-by"]
  })
})
