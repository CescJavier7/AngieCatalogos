/**
 * Sitemap generado al vuelo: las páginas fijas más una entrada por producto
 * publicado. Si Medusa no responde, se devuelven al menos las fijas.
 */
export default defineEventHandler(async (event) => {
  const { public: cfg } = useRuntimeConfig()
  const hoy = new Date().toISOString().slice(0, 10)

  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: cfg.siteUrl, priority: "1.0", changefreq: "weekly" },
    { loc: `${cfg.siteUrl}/catalogo`, priority: "0.9", changefreq: "daily" },
    { loc: `${cfg.siteUrl}/terminos`, priority: "0.3", changefreq: "yearly" },
    { loc: `${cfg.siteUrl}/privacidad`, priority: "0.3", changefreq: "yearly" },
  ]

  try {
    type Producto = {
      handle: string
      categories?: { name: string }[]
      collection?: { title: string } | null
    }
    const res = await $fetch<{ products: Producto[] }>(
      `${cfg.medusaUrl}/store/products`,
      {
        params: {
          limit: 500,
          fields: "handle,categories.name,collection.title",
        },
        headers: { "x-publishable-api-key": cfg.medusaPublishableKey },
      }
    )

    // Las páginas de categoría y marca salen del propio catálogo: una
    // categoría nueva en la hoja aparece aquí sola, sin tocar código
    const secciones = new Set<string>()

    for (const p of res.products ?? []) {
      urls.push({
        loc: `${cfg.siteUrl}/productos/${p.handle}`,
        priority: "0.7",
        changefreq: "weekly",
      })
      for (const c of p.categories ?? []) {
        if (c?.name) secciones.add(c.name)
      }
      if (p.collection?.title) secciones.add(p.collection.title)
    }

    for (const nombre of [...secciones].sort()) {
      urls.push({
        // Por encima de la ficha suelta: son las que se buscan en Google
        loc: `${cfg.siteUrl}/categoria/${aSlug(nombre)}`,
        priority: "0.8",
        changefreq: "weekly",
      })
    }
  } catch {
    // El sitemap sigue siendo válido con solo las páginas fijas
  }

  setHeader(event, "content-type", "application/xml; charset=utf-8")
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${hoy}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  )
  .join("\n")}
</urlset>
`
})
