export default defineNuxtConfig({
  compatibilityDate: "2026-07-24",
  devtools: { enabled: true },

  app: {
    head: {
      title: "Angie Catálogos | Belleza y Moda en Ecuador",
      htmlAttrs: { lang: "es" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Angie Catálogos — perfumes, protección solar, ropa y pijamas con envío a todo Ecuador.",
        },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Urbanist:wght@400;500;600;700;800&display=swap",
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
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
