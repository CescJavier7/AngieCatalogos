<script setup lang="ts">
const medusa = useMedusa()
const { data: region } = await useRegion()
const { addItem, busy } = useCart()

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
  const map = new Map<string, { name: string; items: NonNullable<typeof products.value> }>()
  for (const p of products.value ?? []) {
    const cat = p.categories?.[0]?.name ?? "Otros"
    if (!map.has(cat)) map.set(cat, { name: cat, items: [] })
    map.get(cat)!.items.push(p)
  }
  return [...map.values()]
})

const price = (p: any) =>
  formatMoney(p.variants?.[0]?.calculated_price?.calculated_amount)

const added = ref<string | null>(null)

const quickAdd = async (p: any) => {
  const variantId = p.variants?.[0]?.id
  if (!variantId) return
  await addItem(variantId)
  added.value = p.id
  setTimeout(() => (added.value = null), 1600)
}
</script>

<template>
  <div>
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__text">
          <span class="eyebrow">Venta por catálogo en Ecuador</span>
          <h1>La belleza que <em>realza</em> quién eres</h1>
          <p>
            Perfumes de autor, protección solar y moda seleccionada con asesoría
            personalizada. Compra y ahorra — o emprende y gana con nosotros.
          </p>
          <div class="hero__actions">
            <a href="#catalogo" class="btn">Descubrir el catálogo</a>
            <a
              href="https://wa.me/593980441321"
              target="_blank"
              rel="noopener"
              class="btn btn--gold"
            >
              Asesoría por WhatsApp
            </a>
          </div>
          <ul class="hero__trust">
            <li><strong>1–3 días</strong><span>envío nacional</span></li>
            <li><strong>100%</strong><span>productos originales</span></li>
            <li><strong>+9 marcas</strong><span>de catálogo</span></li>
          </ul>
        </div>
        <div class="hero__media">
          <img src="/img/header-bg.webp" alt="Venta por catálogo en Ecuador" />
        </div>
      </div>
    </section>

    <section id="catalogo" class="catalog container">
      <template v-for="cat in categories" :key="cat.name">
        <div v-if="cat.items.length" class="catalog__section">
          <div class="catalog__head">
            <span class="eyebrow">Colección</span>
            <h2>{{ cat.name }}</h2>
          </div>

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
                <NuxtLink :to="`/productos/${p.handle}`">
                  <h3>{{ p.title }}</h3>
                </NuxtLink>
                <p class="card__price">{{ price(p) }}</p>
                <button
                  class="btn card__add"
                  :disabled="busy"
                  @click="quickAdd(p)"
                >
                  {{ added === p.id ? "Agregado ✓" : "Agregar al carrito" }}
                </button>
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
  background:
    radial-gradient(60% 90% at 85% 20%, rgba(230, 201, 136, 0.22) 0%, transparent 60%),
    linear-gradient(150deg, var(--blush) 0%, var(--bg) 70%);
  border-bottom: 1px solid var(--line);
}

.hero__inner {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  gap: 3rem;
  padding-block: 4.5rem;
}

.hero__text h1 {
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  line-height: 1.08;
  margin: 0.9rem 0 1rem;
}

.hero__text h1 em {
  color: var(--primary);
  font-style: italic;
}

.hero__text > p {
  color: var(--muted);
  font-size: 1.08rem;
  margin-bottom: 1.75rem;
  max-width: 48ch;
}

.hero__actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2.25rem;
}

.hero__trust {
  list-style: none;
  display: flex;
  gap: 2.5rem;
  flex-wrap: wrap;
}

.hero__trust li {
  display: grid;
  line-height: 1.3;
}

.hero__trust strong {
  font-family: "Cormorant Garamond", serif;
  font-size: 1.45rem;
  color: var(--primary);
}

.hero__trust span {
  color: var(--muted);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

.hero__media {
  position: relative;
}

.hero__media::before {
  content: "";
  position: absolute;
  inset: 1.25rem -1.25rem -1.25rem 1.25rem;
  border: 1px solid var(--gold-light);
  border-radius: 1.5rem;
  z-index: 0;
}

.hero__media img {
  position: relative;
  z-index: 1;
  border-radius: 1.5rem;
  box-shadow: 0 24px 60px rgba(155, 27, 96, 0.18);
}

.catalog {
  padding-top: 3.5rem;
}

.catalog__section {
  margin-bottom: 3.5rem;
}

.catalog__head {
  margin-bottom: 1.5rem;
}

.catalog__head h2 {
  font-size: 2.1rem;
  margin-top: 0.35rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
  gap: 1.5rem;
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.card:hover {
  transform: translateY(-5px);
  border-color: var(--gold-light);
  box-shadow: 0 18px 40px rgba(42, 30, 38, 0.12);
}

.card__media {
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

.card__body {
  padding: 1rem 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  text-align: center;
}

.card__body h3 {
  font-size: 1.15rem;
  font-weight: 600;
}

.card__body h3:hover {
  color: var(--primary);
}

.card__price {
  color: var(--gold);
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.03em;
}

.card__add {
  margin-top: auto;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
}

@media (max-width: 820px) {
  .hero__inner {
    grid-template-columns: 1fr;
    padding-block: 2.5rem;
    gap: 2rem;
  }

  .hero__media {
    order: -1;
  }

  .hero__trust {
    gap: 1.5rem;
  }
}
</style>
