<script setup lang="ts">
const medusa = useMedusa()
const { data: region } = await useRegion()
const { addItem, busy } = useCart()

const { data: products } = await useAsyncData(
  "catalog-products",
  async () => {
    const { products } = await medusa.store.product.list({
      limit: 100,
      region_id: region.value?.id,
      fields:
        "id,title,handle,thumbnail,*images,*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,*categories,*collection,*tags",
    })
    return products
  },
  { watch: [region] }
)

/* ── Helpers ── */
const priceOf = (p: any): number =>
  p.variants?.[0]?.calculated_price?.calculated_amount ?? 0

const stockOf = (p: any): number | null => {
  const v = p.variants?.[0]
  if (!v || v.manage_inventory === false) return null
  return v.inventory_quantity ?? null
}
const soldOut = (p: any) => {
  const q = stockOf(p)
  return q !== null && q <= 0
}
const lowStock = (p: any) => {
  const q = stockOf(p)
  return q !== null && q > 0 && q <= 5
}
const isPromo = (p: any) => p.tags?.some((t: any) => t.value === "promocion")

/* ── Estado de filtros ── */
const allBrands = computed(() => {
  const set = new Set<string>()
  for (const p of products.value ?? []) if (p.collection?.title) set.add(p.collection.title)
  return [...set].sort()
})

/**
 * Las categorías viven en dos grupos que se cruzan entre sí: a quién va dirigido
 * y qué tipo de producto es. Cualquier categoría nueva que llegue desde la hoja
 * (Cremas, Desodorantes, Ropa, Maquillaje…) cae sola en "tipo de producto".
 */
const AUDIENCE_CATS = ["Hombres", "Mujeres", "Niños", "Unisex"]

const usedCategories = computed(() => {
  const set = new Set<string>()
  for (const p of products.value ?? [])
    for (const c of p.categories ?? []) set.add(c.name)
  return set
})

const audienceCats = computed(() =>
  AUDIENCE_CATS.filter((c) => usedCategories.value.has(c))
)
const typeCats = computed(() =>
  [...usedCategories.value].filter((c) => !AUDIENCE_CATS.includes(c)).sort()
)

const priceBounds = computed(() => {
  const prices = (products.value ?? []).map(priceOf)
  if (!prices.length) return { min: 0, max: 100 }
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
})

const selectedBrands = ref<string[]>([])
const selectedAudience = ref<string[]>([])
const selectedTypes = ref<string[]>([])
const onlyPromos = ref(false)
const priceMin = ref(0)
const priceMax = ref(100)
const filtersOpen = ref(false)

watch(
  priceBounds,
  (b) => {
    priceMin.value = b.min
    priceMax.value = b.max
  },
  { immediate: true }
)

// Los dos deslizadores no pueden cruzarse
watch(priceMin, (v) => { if (v > priceMax.value) priceMin.value = priceMax.value })
watch(priceMax, (v) => { if (v < priceMin.value) priceMax.value = priceMin.value })

const activeFilters = computed(
  () =>
    selectedBrands.value.length +
    selectedAudience.value.length +
    selectedTypes.value.length +
    (onlyPromos.value ? 1 : 0) +
    (priceMin.value > priceBounds.value.min || priceMax.value < priceBounds.value.max ? 1 : 0)
)

const clearFilters = () => {
  selectedBrands.value = []
  selectedAudience.value = []
  selectedTypes.value = []
  onlyPromos.value = false
  priceMin.value = priceBounds.value.min
  priceMax.value = priceBounds.value.max
}

/**
 * Dentro de un grupo las opciones suman (Hombres o Niños); entre grupos se
 * cruzan (Perfumes y además Hombres). Sin nada marcado, el grupo no filtra.
 */
const matchesGroup = (p: any, selected: string[]) =>
  !selected.length || (p.categories ?? []).some((c: any) => selected.includes(c.name))

const filtered = computed(() =>
  (products.value ?? []).filter((p) => {
    if (selectedBrands.value.length && !selectedBrands.value.includes(p.collection?.title ?? ""))
      return false
    if (!matchesGroup(p, selectedAudience.value)) return false
    if (!matchesGroup(p, selectedTypes.value)) return false
    if (onlyPromos.value && !isPromo(p)) return false
    const price = priceOf(p)
    return price >= priceMin.value && price <= priceMax.value
  })
)

/** Agrupado por marca — las marcas encabezan el catálogo */
const byBrand = computed(() => {
  const map = new Map<string, any[]>()
  for (const p of filtered.value) {
    const brand = p.collection?.title ?? "Otras marcas"
    if (!map.has(brand)) map.set(brand, [])
    map.get(brand)!.push(p)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

const added = ref<string | null>(null)
const quickAdd = async (p: any) => {
  const variantId = p.variants?.[0]?.id
  if (!variantId || soldOut(p)) return
  await addItem(variantId)
  added.value = p.id
  setTimeout(() => (added.value = null), 1600)
}

useSeo({
  title: "Catálogo de perfumes, cuidado personal y moda",
  description:
    "Explora el catálogo completo: perfumes de Yanbal, Cyzone y Avon, protección solar, cremas y moda. Filtra por marca, categoría y precio. Envío a todo Ecuador.",
})
</script>

<template>
  <div class="container catalog-page">
    <header class="catalog-page__head">
      <div>
        <span class="eyebrow">Nuestro catálogo</span>
        <h1>Explora por marca</h1>
      </div>
      <button
        class="btn btn--ghost catalog-page__toggle"
        @click="filtersOpen = !filtersOpen"
      >
        Filtros <span v-if="activeFilters">({{ activeFilters }})</span>
      </button>
    </header>

    <div class="catalog-page__layout">
      <!-- ── Sidebar de filtros ── -->
      <aside class="filters" :class="{ 'filters--open': filtersOpen }">
        <div class="filters__head">
          <strong>Filtrar</strong>
          <button v-if="activeFilters" class="filters__clear" @click="clearFilters">
            Limpiar ({{ activeFilters }})
          </button>
        </div>

        <button
          class="promo-toggle"
          :class="{ 'promo-toggle--on': onlyPromos }"
          @click="onlyPromos = !onlyPromos"
        >
          🏷️ {{ onlyPromos ? "Viendo promociones" : "Ver promociones" }}
        </button>

        <fieldset class="filters__group">
          <legend>Marca</legend>
          <label v-for="b in allBrands" :key="b" class="check">
            <input v-model="selectedBrands" type="checkbox" :value="b" />
            <span>{{ b }}</span>
          </label>
        </fieldset>

        <fieldset v-if="audienceCats.length" class="filters__group">
          <legend>Para quién</legend>
          <label v-for="c in audienceCats" :key="c" class="check">
            <input v-model="selectedAudience" type="checkbox" :value="c" />
            <span>{{ c }}</span>
          </label>
        </fieldset>

        <fieldset v-if="typeCats.length" class="filters__group">
          <legend>Tipo de producto</legend>
          <label v-for="c in typeCats" :key="c" class="check">
            <input v-model="selectedTypes" type="checkbox" :value="c" />
            <span>{{ c }}</span>
          </label>
        </fieldset>

        <fieldset class="filters__group">
          <legend>Precio: ${{ priceMin }} — ${{ priceMax }}</legend>
          <div class="range">
            <input
              v-model.number="priceMin"
              type="range"
              :min="priceBounds.min"
              :max="priceBounds.max"
              step="1"
              aria-label="Precio mínimo"
            />
            <input
              v-model.number="priceMax"
              type="range"
              :min="priceBounds.min"
              :max="priceBounds.max"
              step="1"
              aria-label="Precio máximo"
            />
          </div>
        </fieldset>
      </aside>

      <!-- ── Resultados agrupados por marca ── -->
      <div class="results">
        <p v-if="!filtered.length" class="results__empty">
          Ningún producto coincide con esos filtros.
          <button class="filters__clear" @click="clearFilters">Limpiar filtros</button>
        </p>

        <section v-for="[brand, items] in byBrand" :key="brand" class="brand-section">
          <h2 class="brand-section__title">
            {{ brand }} <span>({{ items.length }})</span>
          </h2>
          <div class="grid">
            <article v-for="p in items" :key="p.id" class="card">
              <NuxtLink :to="`/productos/${p.handle}`" class="card__media">
                <img
                  :src="p.thumbnail || p.images?.[0]?.url"
                  :alt="p.title"
                  loading="lazy"
                  :class="{ 'img--soldout': soldOut(p) }"
                />
                <span v-if="soldOut(p)" class="badge badge--out">Agotado</span>
                <span v-else-if="isPromo(p)" class="badge badge--promo">Promo</span>
                <span v-else-if="lowStock(p)" class="badge badge--low">
                  ¡Últimas {{ stockOf(p) }}!
                </span>
              </NuxtLink>
              <div class="card__body">
                <NuxtLink :to="`/productos/${p.handle}`">
                  <h3>{{ p.title }}</h3>
                </NuxtLink>
                <p class="card__price">{{ formatMoney(priceOf(p)) }}</p>
                <button
                  class="btn card__add"
                  :disabled="busy || soldOut(p)"
                  @click="quickAdd(p)"
                >
                  {{ soldOut(p) ? "Agotado" : added === p.id ? "Agregado ✓" : "Agregar al carrito" }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.catalog-page {
  padding-top: 2rem;
}

.catalog-page__head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.catalog-page__head h1 {
  font-size: clamp(1.9rem, 4vw, 2.7rem);
  margin-top: 0.3rem;
}

.catalog-page__toggle {
  display: none;
}

.catalog-page__layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2.5rem;
  align-items: start;
}

/* ── Filtros ── */
.filters {
  position: sticky;
  top: 120px;
  display: grid;
  gap: 1.4rem;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.25rem;
}

.filters__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filters__clear {
  border: none;
  background: none;
  color: var(--primary);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}

.promo-toggle {
  border: 1.5px dashed var(--gold);
  background: rgba(230, 201, 136, 0.12);
  color: var(--gold);
  border-radius: 0.7rem;
  padding: 0.65rem;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.promo-toggle--on,
.promo-toggle:hover {
  background: var(--gold);
  color: #fff;
  border-style: solid;
}

.filters__group {
  border: none;
  display: grid;
  gap: 0.45rem;
}

.filters__group legend {
  font-weight: 800;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  margin-bottom: 0.6rem;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.check input {
  width: auto;
  accent-color: var(--primary);
}

.check:hover span {
  color: var(--primary);
}

/* Doble range = rango de precio */
.range {
  display: grid;
  gap: 0.4rem;
}

.range input[type="range"] {
  width: 100%;
  padding: 0;
  border: none;
  accent-color: var(--primary);
  background: transparent;
}

/* ── Resultados ── */
.results {
  min-width: 0;
}

.results__empty {
  color: var(--muted);
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  padding-block: 2rem;
}

.brand-section {
  margin-bottom: 2.75rem;
}

.brand-section__title {
  font-size: 1.9rem;
  margin-bottom: 1.1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--gold-light);
}

.brand-section__title span {
  color: var(--muted);
  font-size: 1.05rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: 1.4rem;
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
  position: relative;
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
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.badge--out {
  background: var(--ink);
  color: #fff;
}

.badge--low {
  background: var(--gold);
  color: #fff;
}

.badge--promo {
  background: var(--primary);
  color: #fff;
}

.card__body {
  padding: 0.9rem 0.9rem 1.05rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  text-align: center;
}

.card__body h3 {
  font-size: 1.08rem;
}

.card__body h3:hover {
  color: var(--primary);
}

.card__price {
  color: var(--gold);
  font-weight: 800;
}

.card__add {
  margin-top: auto;
  padding: 0.55rem 0.9rem;
  font-size: 0.82rem;
}

/* ── Móvil / tablet ── */
@media (max-width: 900px) {
  .catalog-page__layout {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .catalog-page__toggle {
    display: inline-flex;
  }

  .filters {
    display: none;
    position: static;
  }

  .filters--open {
    display: grid;
  }
}
</style>
