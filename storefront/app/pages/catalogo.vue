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
 * Los dos grupos de categorías —público y tipo de producto— viven en
 * utils/catalogo.ts, compartidos con las sugerencias de la ficha.
 */
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

const { cargar: cargarFavoritos, esFavorito, alternar, total: totalFavoritos } =
  useFavoritos()
onMounted(cargarFavoritos)

const ORDENES = [
  { id: "destacados", label: "Destacados" },
  { id: "precio-asc", label: "Precio: de menor a mayor" },
  { id: "precio-desc", label: "Precio: de mayor a menor" },
  { id: "favoritos", label: "Mis favoritos primero" },
  { id: "nombre", label: "Nombre A–Z" },
]
const orden = ref("destacados")

const selectedBrands = ref<string[]>([])
const selectedAudience = ref<string[]>([])
const selectedTypes = ref<string[]>([])
const onlyPromos = ref(false)
const onlyFavoritos = ref(false)
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
    (onlyFavoritos.value ? 1 : 0) +
    (orden.value !== "destacados" ? 1 : 0) +
    (priceMin.value > priceBounds.value.min || priceMax.value < priceBounds.value.max ? 1 : 0)
)

const clearFilters = () => {
  selectedBrands.value = []
  selectedAudience.value = []
  selectedTypes.value = []
  onlyPromos.value = false
  onlyFavoritos.value = false
  orden.value = "destacados"
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
    if (onlyFavoritos.value && !esFavorito(p.id)) return false
    const price = priceOf(p)
    return price >= priceMin.value && price <= priceMax.value
  })
)

/** Aplica el criterio de ordenamiento elegido. */
const ordenar = (lista: any[]) => {
  const copia = [...lista]
  switch (orden.value) {
    case "precio-asc":
      return copia.sort((a, b) => priceOf(a) - priceOf(b))
    case "precio-desc":
      return copia.sort((a, b) => priceOf(b) - priceOf(a))
    case "nombre":
      return copia.sort((a, b) => a.title.localeCompare(b.title, "es"))
    case "favoritos":
      return copia.sort(
        (a, b) => Number(esFavorito(b.id)) - Number(esFavorito(a.id))
      )
    default:
      // Destacados: promociones primero, y lo agotado al final
      return copia.sort(
        (a, b) =>
          Number(soldOut(a)) - Number(soldOut(b)) ||
          Number(isPromo(b)) - Number(isPromo(a))
      )
  }
}

/** Agrupado por marca — las marcas encabezan el catálogo */
const byBrand = computed(() => {
  const map = new Map<string, any[]>()
  for (const p of filtered.value) {
    const brand = p.collection?.title ?? "Otras marcas"
    if (!map.has(brand)) map.set(brand, [])
    map.get(brand)!.push(p)
  }
  for (const [, items] of map) items.splice(0, items.length, ...ordenar(items))
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

// Con la hoja abierta, el fondo no debe desplazarse: era lo que hacía que
// los productos parecieran mezclarse con el panel.
watch(filtersOpen, (abierto) => {
  if (import.meta.client) {
    document.body.style.overflow = abierto ? "hidden" : ""
  }
})
onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ""
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
    </header>

    <div class="catalog-page__layout">
      <!-- ── Sidebar de filtros ── -->
      <aside class="filters" :class="{ 'filters--open': filtersOpen }">
        <div class="hoja__barra">
          <span class="hoja__asa" />
        </div>
        <div class="filters__head">
          <strong>Filtrar y ordenar</strong>
          <button v-if="activeFilters" class="filters__clear" @click="clearFilters">
            Limpiar ({{ activeFilters }})
          </button>
        </div>

        <label class="orden">
          Ordenar por
          <select v-model="orden">
            <option v-for="o in ORDENES" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </label>

        <button
          class="promo-toggle"
          :class="{ 'promo-toggle--on': onlyPromos }"
          @click="onlyPromos = !onlyPromos"
        >
          🏷️ {{ onlyPromos ? "Viendo promociones" : "Ver promociones" }}
        </button>

        <button
          class="promo-toggle fav-toggle"
          :class="{ 'promo-toggle--on': onlyFavoritos }"
          @click="onlyFavoritos = !onlyFavoritos"
        >
          ♥ {{ onlyFavoritos ? "Viendo tus favoritos" : `Mis favoritos (${totalFavoritos})` }}
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
        <!-- Salida evidente: en móvil no basta con volver a tocar la isla -->
        <div class="hoja__pie">
          <button class="btn hoja__ver" @click="filtersOpen = false">
            Ver {{ filtered.length }}
            {{ filtered.length === 1 ? "producto" : "productos" }}
          </button>
        </div>
      </aside>

      <transition name="fondo">
        <div v-if="filtersOpen" class="hoja__fondo" @click="filtersOpen = false" />
      </transition>

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
                <button
                  class="fav"
                  :class="{ 'fav--on': esFavorito(p.id) }"
                  :aria-label="esFavorito(p.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'"
                  @click.prevent.stop="alternar(p.id)"
                >
                  {{ esFavorito(p.id) ? "♥" : "♡" }}
                </button>
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

    <!-- Isla flotante: filtrar desde cualquier punto del scroll -->
    <div class="isla" :class="{ 'isla--abierta': filtersOpen }">
      <button class="isla__btn" @click="filtersOpen = true">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        <span>Filtrar y ordenar</span>
        <span v-if="activeFilters" class="isla__badge">{{ activeFilters }}</span>
      </button>
      <span class="isla__count">
        {{ filtered.length }}
        <small>{{ filtered.length === 1 ? "artículo" : "artículos" }}</small>
      </span>
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
/* ── Orden y favoritos ── */
.orden {
  display: grid;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted);
  text-transform: uppercase;
}

.orden select {
  font-size: 0.9rem;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}

.fav-toggle {
  font-size: 0.9rem;
}

.fav {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  z-index: 2;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 8px rgba(42, 30, 38, 0.12);
  transition: transform 0.15s ease, color 0.15s ease;
}

.fav:hover {
  transform: scale(1.12);
  color: var(--primary);
}

.fav--on {
  color: var(--primary);
}

/* ── Isla flotante de filtros ── */
.isla {
  display: none;
  position: fixed;
  left: 50%;
  top: 5.4rem;
  transform: translateX(-50%);
  z-index: 60;
  align-items: center;
  gap: 0.4rem;
  background: rgba(42, 30, 38, 0.93);
  backdrop-filter: blur(14px);
  border-radius: 999px;
  padding: 0.3rem 0.3rem 0.3rem 0.45rem;
  box-shadow: 0 8px 28px rgba(42, 30, 38, 0.3);
  animation: isla-entra 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
  transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

/* Con la hoja abierta la isla se retira: su función la asume el panel */
.isla--abierta {
  opacity: 0;
  transform: translateX(-50%) translateY(-0.6rem) scale(0.85);
  pointer-events: none;
}

@keyframes isla-entra {
  from { opacity: 0; transform: translateX(-50%) translateY(-1rem) scale(0.9); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

.isla__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: none;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  white-space: nowrap;
}

.isla__btn:active {
  transform: scale(0.96);
}

.isla__badge {
  background: var(--primary);
  color: #fff;
  border-radius: 999px;
  min-width: 20px;
  height: 20px;
  padding-inline: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.isla__count {
  display: grid;
  place-items: center;
  line-height: 1;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 800;
}

.isla__count small {
  font-size: 0.58rem;
  font-weight: 600;
  opacity: 0.7;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ── Hoja de filtros (solo móvil) ── */
.hoja__barra,
.hoja__pie {
  display: none;
}

.hoja__fondo {
  position: fixed;
  inset: 0;
  z-index: 65;
  background: rgba(42, 30, 38, 0.5);
  backdrop-filter: blur(2px);
}

.fondo-enter-active,
.fondo-leave-active {
  transition: opacity 0.25s ease;
}

.fondo-enter-from,
.fondo-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .catalog-page__layout {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .isla {
    display: flex;
  }

  /* El panel deja de vivir en la rejilla: pasa a ser una hoja sobre todo lo
     demás. Antes era sticky y los productos se le desplazaban por encima. */
  .filters {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    z-index: 70;
    max-height: 88vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: 1.4rem 1.4rem 0 0;
    border: none;
    padding: 0 1.25rem 0;
    gap: 1.2rem;
    box-shadow: 0 -12px 40px rgba(42, 30, 38, 0.28);
    transform: translateY(100%);
    transition: transform 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.08);
    display: grid;
  }

  .filters--open {
    transform: translateY(0);
  }

  /* Asa superior, como las hojas del sistema */
  .hoja__barra {
    display: grid;
    place-items: center;
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fff;
    padding: 0.7rem 0 0.2rem;
  }

  .hoja__asa {
    width: 42px;
    height: 4px;
    border-radius: 999px;
    background: var(--line);
  }

  .filters__head {
    position: sticky;
    top: 2.2rem;
    z-index: 2;
    background: #fff;
    padding-bottom: 0.6rem;
    font-size: 1.05rem;
  }

  /* Salida evidente: un botón que dice exactamente qué va a pasar */
  .hoja__pie {
    display: block;
    position: sticky;
    bottom: 0;
    background: linear-gradient(to top, #fff 72%, rgba(255, 255, 255, 0));
    padding: 0.9rem 0 1.1rem;
    margin-top: -0.4rem;
  }

  .hoja__ver {
    width: 100%;
    justify-content: center;
    font-size: 1rem;
  }

  .results {
    padding-bottom: 1rem;
  }
}

/* Dos columnas en móvil: un producto a lo ancho se ve raro */
@media (max-width: 620px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .card__body {
    padding: 0.7rem;
  }

  .card__body h3 {
    font-size: 1rem;
    line-height: 1.25;
  }
}
</style>
