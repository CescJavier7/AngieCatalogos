/** robots.txt con el sitemap anunciado. Las páginas de compra quedan fuera. */
export default defineEventHandler((event) => {
  const { public: cfg } = useRuntimeConfig()
  setHeader(event, "content-type", "text/plain; charset=utf-8")
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /checkout",
    "Disallow: /cuenta",
    "Disallow: /pedido",
    "",
    `Sitemap: ${cfg.siteUrl}/sitemap.xml`,
    "",
  ].join("\n")
})
