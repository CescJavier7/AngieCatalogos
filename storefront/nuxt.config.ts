/** Dominio público: base de las URL canónicas, del sitemap y de las imágenes sociales. */
const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || "https://tienda.cescjavier.dev"
/** Origen de la API: la política de contenido debe permitirlo explícitamente. */
const SITE_API = process.env.NUXT_PUBLIC_MEDUSA_URL || "http://localhost:9000"

export default defineNuxtConfig({
  compatibilityDate: "2026-07-24",
  devtools: { enabled: true },

  app: {
    head: {
      title: "Belleza y moda por catálogo en Ecuador",
      // Cadena, no función: nuxt.config se serializa y una función no sobrevive
      titleTemplate: "%s | Angie Catálogos",
      htmlAttrs: { lang: "es-EC" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Perfumes, protección solar, cremas y moda de catálogo — Yanbal, Cyzone, Avon y más marcas originales. Envío a todo Ecuador y retiro gratis en Machachi.",
        },
        { name: "theme-color", content: "#9b1b60" },
        { name: "author", content: "Angie Catálogos" },
        { name: "robots", content: "index, follow" },
        { property: "og:site_name", content: "Angie Catálogos" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "es_EC" },
        { property: "og:image", content: `${SITE_URL}/og-image.jpg` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: `${SITE_URL}/og-image.jpg` },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Urbanist:wght@400;500;600;700;800&display=swap",
        },
      ],
    },
  },

  /**
   * Cabeceras de seguridad. La tienda no enviaba ninguna: sin ellas el sitio
   * puede embeberse en un iframe ajeno para engañar a la clienta, el navegador
   * adivina tipos de contenido, y la URL completa viaja como referente a
   * terceros.
   *
   * La política de contenido es permisiva con las imágenes a propósito: las
   * fotos de producto vienen de dominios que se escriben en la hoja de Google
   * y no se pueden enumerar de antemano.
   */
  routeRules: {
    "/**": {
      headers: {
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
        "Content-Security-Policy": [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "img-src 'self' data: https:",
          "font-src 'self' https://fonts.gstatic.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
          `connect-src 'self' ${SITE_API} https://cloudflareinsights.com`,
          "form-action 'self' https://pay.payphonetodoesposible.com",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: SITE_URL,
      medusaUrl: process.env.NUXT_PUBLIC_MEDUSA_URL || "http://localhost:9000",
      medusaPublishableKey: process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      // Muestra el botón "Continuar con Google" cuando el backend lo tiene activo.
      // En runtime se sobreescribe con NUXT_PUBLIC_GOOGLE_AUTH_ENABLED.
      googleAuthEnabled:
        process.env.NUXT_PUBLIC_GOOGLE_AUTH === "true" ||
        process.env.NUXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
    },
  },
})
