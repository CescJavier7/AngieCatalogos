<script setup lang="ts">
/**
 * Página propia por categoría y por marca: /categoria/perfumes, /categoria/yanbal.
 *
 * Existe por una razón concreta de buscadores. El catálogo filtra con
 * parámetros (?tipo=Perfumes) y Google no trata eso como una página distinta:
 * no le pone título propio, no la lista aparte y no la posiciona por "perfumes".
 * Una URL de verdad, con su H1, su texto y su listado, sí.
 *
 * No repite el panel de filtros a propósito. Quien llega aquí desde una
 * búsqueda quiere ver perfumes, no configurar una vista; para eso está el
 * catálogo completo, enlazado abajo.
 */
const route = useRoute()
const { addItem, busy } = useCart()
const { public: cfg } = useRuntimeConfig()

const { data: products } = await useCatalogo()

const slug = computed(() => String(route.params.slug ?? ""))

/**
 * El slug puede ser una categoría (Perfumes) o una marca (Yanbal). Se resuelve
 * contra el propio catálogo en vez de contra una lista aparte, así una
 * categoría nueva de la hoja tiene página desde el primer producto.
 */
const vista = computed(() => {
  const lista = products.value ?? []

  for (const p of lista) {
    for (const c of p.categories ?? []) {
      if (aSlug(c.name) === slug.value) {
        return { tipo: "categoria" as const, nombre: c.name as string }
      }
    }
    const marca = p.collection?.title
    if (marca && aSlug(marca) === slug.value) {
      return { tipo: "marca" as const, nombre: marca as string }
    }
  }
  return null
})

if (!vista.value) {
  throw createError({ statusCode: 404, statusMessage: "Categoría no encontrada" })
}

const precioDe = (p: any): number =>
  p.variants?.[0]?.calculated_price?.calculated_amount ?? 0

const agotado = (p: any) => {
  const v = p.variants?.[0]
  if (!v || v.manage_inventory === false) return false
  return (v.inventory_quantity ?? 0) <= 0
}

const items = computed(() => {
  const v = vista.value
  if (!v) return []
  return (products.value ?? [])
    .filter((p: any) =>
      v.tipo === "marca"
        ? p.collection?.title === v.nombre
        : (p.categories ?? []).some((c: any) => c.name === v.nombre)
    )
    // Lo disponible primero, y dentro de eso lo más barato: es lo que se mira
    .sort(
      (a: any, b: any) =>
        Number(agotado(a)) - Number(agotado(b)) || precioDe(a) - precioDe(b)
    )
})

/** Marcas presentes en esta categoría, para nombrarlas en el texto. */
const marcas = computed(() => {
  const set = new Set<string>()
  for (const p of items.value) {
    if (p.collection?.title) set.add(p.collection.title)
  }
  return [...set].sort()
})

const titulo = computed(() => {
  const v = vista.value!
  if (v.tipo === "marca") return `${v.nombre} Ecuador`
  const conMarcas = marcas.value.slice(0, 3).join(", ")
  return conMarcas ? `${v.nombre} de ${conMarcas}` : v.nombre
})

const intro = computed(() => {
  const v = vista.value!
  const n = items.value.length
  const cuantos = n === 1 ? "1 producto" : `${n} productos`
  const listaMarcas = marcas.value.length
    ? ` de ${marcas.value.join(", ")}`
    : ""
  return v.tipo === "marca"
    ? `${cuantos} originales de ${v.nombre} disponibles en Ecuador. Envío a todo el país en 1 a 3 días hábiles y retiro gratis en Machachi.`
    : `${cuantos}${listaMarcas} en nuestra tienda. Compra en línea con tarjeta o coordina por WhatsApp: enviamos a todo el Ecuador y en Machachi retiras sin costo.`
})

const desde = computed(() => {
  const precios = items.value.map(precioDe).filter((p) => p > 0)
  return precios.length ? Math.min(...precios) : null
})

useSeo({
  title: titulo.value,
  description: `${intro.value} Precios desde ${
    desde.value ? `$${desde.value.toFixed(2)}` : "precios de catálogo"
  }.`.slice(0, 300),
})

// Migas: Google las pinta en el resultado en vez de la URL cruda
useJsonLd({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: cfg.siteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Catálogo",
      item: `${cfg.siteUrl}/catalogo`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: vista.value!.nombre,
      item: `${cfg.siteUrl}/categoria/${slug.value}`,
    },
  ],
})

// El listado con precios: es lo que habilita el carrusel de productos
useJsonLd({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: titulo.value,
  numberOfItems: items.value.length,
  itemListElement: items.value.slice(0, 30).map((p: any, i: number) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Product",
      name: p.title,
      url: `${cfg.siteUrl}/productos/${p.handle}`,
      image: p.thumbnail || p.images?.[0]?.url,
      brand: p.collection?.title
        ? { "@type": "Brand", name: p.collection.title }
        : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: precioDe(p),
        availability: agotado(p)
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      },
    },
  })),
})

const added = ref<string | null>(null)
const agregar = async (p: any) => {
  const variantId = p.variants?.[0]?.id
  if (!variantId || agotado(p)) return
  await addItem(variantId)
  added.value = p.id
  setTimeout(() => (added.value = null), 1600)
}
</script>

<template>
  <div class="container cat">
    <nav class="cat__migas" aria-label="Ruta">
      <NuxtLink to="/">Inicio</NuxtLink>
      <span>/</span>
      <NuxtLink to="/catalogo">Catálogo</NuxtLink>
      <span>/</span>
      <strong>{{ vista?.nombre }}</strong>
    </nav>

    <header class="cat__head">
      <span class="eyebrow">
        {{ vista?.tipo === "marca" ? "Marca" : "Categoría" }}
      </span>
      <h1>{{ titulo }}</h1>
      <p class="cat__intro">{{ intro }}</p>
    </header>

    <div class="grid">
      <article v-for="p in items" :key="p.id" class="card">
        <NuxtLink :to="`/productos/${p.handle}`" class="card__media">
          <img
            :src="p.thumbnail || p.images?.[0]?.url"
            :alt="`${p.title}${p.collection?.title ? ' — ' + p.collection.title : ''}`"
            loading="lazy"
            :class="{ 'img--soldout': agotado(p) }"
          />
          <span v-if="agotado(p)" class="badge">Agotado</span>
        </NuxtLink>
        <div class="card__body">
          <small v-if="p.collection?.title" class="card__marca">
            {{ p.collection.title }}
          </small>
          <NuxtLink :to="`/productos/${p.handle}`">
            <h2>{{ p.title }}</h2>
          </NuxtLink>
          <p class="card__price">{{ formatMoney(precioDe(p)) }}</p>
          <button
            class="btn card__add"
            :disabled="busy || agotado(p)"
            @click="agregar(p)"
          >
            {{ added === p.id ? "¡Agregado!" : agotado(p) ? "Agotado" : "Agregar" }}
          </button>
        </div>
      </article>
    </div>

    <NuxtLink to="/catalogo" class="cat__todo">
      Ver el catálogo completo con filtros →
    </NuxtLink>
  </div>
</template>

<style scoped>
.cat {
  padding-top: 1.5rem;
}

.cat__migas {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: var(--muted);
  margin-bottom: 1.25rem;
}

.cat__migas a:hover {
  color: var(--primary);
}

.cat__migas strong {
  color: var(--ink);
  font-weight: 600;
}

.cat__head {
  max-width: 62ch;
  margin-bottom: 2rem;
}

.cat__head h1 {
  font-size: clamp(2rem, 4.5vw, 3rem);
  margin: 0.35rem 0 0.6rem;
}

.cat__intro {
  color: var(--muted);
  line-height: 1.65;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: 1.4rem;
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radio-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--sombra-sutil);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.card:hover {
  transform: translateY(-5px);
  border-color: var(--gold-light);
  box-shadow: var(--sombra-alta);
}

.card__media {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--blush);
}

.card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s ease;
}

.card:hover .card__media img {
  transform: scale(1.05);
}

.img--soldout {
  filter: grayscale(0.9) opacity(0.6);
}

.badge {
  position: absolute;
  top: 0.7rem;
  left: 0.7rem;
  padding: 0.28rem 0.75rem;
  border-radius: var(--radio-full);
  background: var(--ink);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.card__body {
  padding: 0.9rem 0.9rem 1.05rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  text-align: center;
}

.card__marca {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.card__body h2 {
  font-size: 1.08rem;
}

.card__body h2:hover {
  color: var(--primary);
}

.card__price {
  color: var(--gold);
  font-weight: 800;
  font-size: 1.05rem;
}

.card__add {
  margin-top: auto;
  padding: 0.55rem 0.9rem;
  font-size: 0.82rem;
}

.cat__todo {
  display: inline-block;
  margin-top: 2.5rem;
  font-weight: 700;
  color: var(--primary);
}

.cat__todo:hover {
  text-decoration: underline;
}
</style>
