<script setup lang="ts">
const medusa = useMedusa()
const { data: region } = await useRegion()

const { data: products } = await useAsyncData(
  "home-products",
  async () => {
    const { products } = await medusa.store.product.list({
      limit: 100,
      region_id: region.value?.id,
      fields: "id,title,handle,thumbnail,*images,*variants.calculated_price,*categories",
    })
    return products
  },
  { watch: [region] }
)

const categories = computed(() => {
  const map = new Map<string, { name: string; items: typeof products.value }>()
  for (const p of products.value ?? []) {
    const cat = p.categories?.[0]?.name ?? "Otros"
    if (!map.has(cat)) map.set(cat, { name: cat, items: [] })
    map.get(cat)!.items!.push(p)
  }
  return [...map.values()]
})

const price = (p: any) => {
  const amount = p.variants?.[0]?.calculated_price?.calculated_amount
  return amount != null ? `$${Number(amount).toFixed(2)}` : ""
}

const whatsapp = (p: any) => {
  const msg = `Hola, estoy interesad@ en el producto: ${p.title} (${price(p)}), me gustaría obtener información.`
  return `https://wa.me/593980441321?text=${encodeURIComponent(msg)}`
}
</script>

<template>
  <div>
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__text">
          <h1>¿Quieres <span>generar ganancias?</span></h1>
          <p>
            Perfumes, protección solar y moda con la mejor asesoría en venta por
            catálogo del Ecuador. Compra y ahorra, o emprende y gana.
          </p>
          <div class="hero__actions">
            <a href="#catalogo" class="btn">Ver catálogo</a>
            <a
              href="https://wa.me/593980441321"
              target="_blank"
              rel="noopener"
              class="btn btn--ghost"
            >
              Contáctame
            </a>
          </div>
        </div>
        <img src="/img/header-bg.webp" alt="Venta por catálogo en Ecuador" class="hero__img" />
      </div>
    </section>

    <section id="catalogo" class="catalog container">
      <template v-for="cat in categories" :key="cat.name">
        <div v-if="cat.items?.length" class="catalog__section">
          <h2>{{ cat.name }}</h2>
          <div class="grid">
            <article v-for="p in cat.items" :key="p.id" class="card">
              <NuxtLink :to="`/productos/${p.handle}`" class="card__media">
                <img
                  :src="p.thumbnail || p.images?.[0]?.url"
                  :alt="p.title"
                  loading="lazy"
                />
              </NuxtLink>
              <div class="card__body">
                <h3>{{ p.title }}</h3>
                <p class="card__price">{{ price(p) }}</p>
                <div class="card__actions">
                  <NuxtLink :to="`/productos/${p.handle}`" class="btn">Ver detalle</NuxtLink>
                  <a :href="whatsapp(p)" target="_blank" rel="noopener" class="btn btn--ghost">
                    WhatsApp
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: linear-gradient(135deg, #fff5fb 0%, #fff8ea 100%);
  border-bottom: 1px solid var(--line);
}

.hero__inner {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: 2rem;
  padding-block: 3.5rem;
}

.hero__text h1 {
  font-size: clamp(2rem, 4.5vw, 3.2rem);
  line-height: 1.15;
  margin-bottom: 1rem;
}

.hero__text h1 span {
  color: var(--primary);
}

.hero__text p {
  color: var(--muted);
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  max-width: 46ch;
}

.hero__actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero__img {
  border-radius: 1.5rem;
  box-shadow: 0 20px 50px rgba(210, 42, 140, 0.18);
}

.catalog {
  padding-top: 3rem;
}

.catalog__section {
  margin-bottom: 3rem;
}

.catalog__section h2 {
  font-size: 1.8rem;
  margin-bottom: 1.25rem;
  position: relative;
  padding-left: 0.9rem;
}

.catalog__section h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.35rem;
  bottom: 0.35rem;
  width: 5px;
  border-radius: 3px;
  background: var(--accent);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 34px rgba(43, 32, 40, 0.12);
}

.card__media {
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #faf5f8;
}

.card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.card__body h3 {
  font-size: 1.05rem;
}

.card__price {
  color: var(--primary);
  font-weight: 800;
  font-size: 1.2rem;
}

.card__actions {
  margin-top: auto;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card__actions .btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

@media (max-width: 760px) {
  .hero__inner {
    grid-template-columns: 1fr;
  }

  .hero__img {
    order: -1;
  }
}
</style>
