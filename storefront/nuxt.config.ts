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
    },
  },

  runtimeConfig: {
    public: {
      medusaUrl: process.env.NUXT_PUBLIC_MEDUSA_URL || "http://localhost:9000",
      medusaPublishableKey: process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
    },
  },
})
