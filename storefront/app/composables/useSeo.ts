/**
 * Etiquetas de SEO por página: título, descripción, canónica y tarjetas
 * sociales. Los valores por defecto viven en nuxt.config; aquí solo se
 * sobrescribe lo que cambia en cada página.
 */
export const useSeo = (opts: {
  title: string
  description: string
  /** Ruta canónica si no es la actual (útil en páginas con parámetros). */
  path?: string
  image?: string
  noindex?: boolean
}) => {
  const { public: cfg } = useRuntimeConfig()
  const route = useRoute()
  const url = `${cfg.siteUrl}${opts.path ?? route.path}`.replace(/\/$/, "") || cfg.siteUrl
  const image = opts.image || `${cfg.siteUrl}/og-image.jpg`
  // El <title> recibe el sufijo del titleTemplate; las tarjetas sociales no
  const tituloCompleto = `${opts.title} | Angie Catálogos`

  useHead({
    title: opts.title,
    link: [{ rel: "canonical", href: url }],
    meta: [
      { name: "description", content: opts.description },
      { name: "robots", content: opts.noindex ? "noindex, nofollow" : "index, follow" },
      { property: "og:title", content: tituloCompleto },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { name: "twitter:title", content: tituloCompleto },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: image },
    ],
  })
}

/** Inserta un bloque JSON-LD (datos estructurados de Google). */
export const useJsonLd = (data: Record<string, unknown>) => {
  useHead({
    script: [{ type: "application/ld+json", innerHTML: JSON.stringify(data) }],
  })
}
