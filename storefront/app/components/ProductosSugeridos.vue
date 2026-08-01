<script setup lang="ts">
/**
 * Sugerencias para seguir comprando sin volver al catálogo.
 *
 * No hace falta un modelo entrenado: con un catálogo de este tamaño, puntuar
 * por marca, categoría y rango de precio acierta más que cualquier modelo sin
 * historial de compras. Cuando haya pedidos suficientes, el paso natural es
 * cruzar "lo que se compró junto" a partir de las ventas reales.
 */
const props = defineProps<{ producto: any }>()

const medusa = useMedusa()
const { data: region } = await useRegion()
const { addItem, busy } = useCart()

const { data: candidatos } = await useAsyncData(
  () => `sugeridos-${props.producto?.id}`,
  async () => {
    const { products } = await medusa.store.product.list({
      limit: 100,
      region_id: region.value?.id,
      fields:
        "id,title,handle,thumbnail,*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,*categories,*collection,*tags",
    })
    return products
  },
  { watch: [region, () => props.producto?.id] }
)

const precioDe = (p: any): number =>
  p.variants?.[0]?.calculated_price?.calculated_amount ?? 0

const agotado = (p: any) => {
  const v = p.variants?.[0]
  if (!v || v.manage_inventory === false) return false
  return (v.inventory_quantity ?? 0) <= 0
}

const sugeridos = computed(() => {
  const actual = props.producto
  if (!actual) return []

  const catsActuales = new Set((actual.categories ?? []).map((c: any) => c.name))
  const marcaActual = actual.collection?.title
  const precioActual = precioDe(actual)

  return (candidatos.value ?? [])
    .filter((p: any) => p.id !== actual.id && !agotado(p))
    .map((p: any) => {
      let puntos = 0
      // Compartir categorías es la señal más fuerte: mismo tipo y mismo público
      for (const c of p.categories ?? []) if (catsActuales.has(c.name)) puntos += 2
      if (marcaActual && p.collection?.title === marcaActual) puntos += 3
      // Un precio parecido sugiere que entra en el mismo presupuesto
      const precio = precioDe(p)
      if (precioActual > 0 && Math.abs(precio - precioActual) <= precioActual * 0.4) {
        puntos += 1
      }
      if ((p.tags ?? []).some((t: any) => t.value === "promocion")) puntos += 0.5
      return { p, puntos }
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || precioDe(a.p) - precioDe(b.p))
    .slice(0, 8)
    .map((x) => x.p)
})

const agregado = ref<string | null>(null)
const agregar = async (p: any) => {
  const variantId = p.variants?.[0]?.id
  if (!variantId) return
  await addItem(variantId)
  agregado.value = p.id
  setTimeout(() => (agregado.value = null), 1600)
}
</script>

<template>
  <section v-if="sugeridos.length" class="sugeridos">
    <div class="sugeridos__head">
      <h2>Combina con este</h2>
      <p>Añádelos sin salir de aquí y te llegan en el mismo envío.</p>
    </div>

    <ul class="sugeridos__rail">
      <li v-for="p in sugeridos" :key="p.id" class="sug">
        <NuxtLink :to="`/productos/${p.handle}`" class="sug__media">
          <img
            v-if="p.thumbnail"
            :src="p.thumbnail"
            :alt="p.title"
            loading="lazy"
            width="300"
            height="400"
          />
          <span v-else class="sug__sinfoto">Sin foto</span>
        </NuxtLink>
        <div class="sug__body">
          <NuxtLink :to="`/productos/${p.handle}`" class="sug__title">{{ p.title }}</NuxtLink>
          <span class="sug__price">{{ formatMoney(precioDe(p)) }}</span>
          <button class="sug__add" :disabled="busy" @click="agregar(p)">
            {{ agregado === p.id ? "¡Agregado!" : "Agregar" }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.sugeridos {
  margin-top: 4rem;
  padding-top: 2.5rem;
  border-top: 1px solid var(--line);
}

.sugeridos__head {
  margin-bottom: 1.5rem;
}

.sugeridos__head h2 {
  font-size: clamp(1.6rem, 3vw, 2.1rem);
}

.sugeridos__head p {
  color: var(--muted);
  margin-top: 0.25rem;
}

/* Carrusel horizontal: en móvil se desliza, en escritorio se ve completo */
.sugeridos__rail {
  list-style: none;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(180px, 1fr);
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 0.75rem;
  scrollbar-width: thin;
}

.sug {
  scroll-snap-align: start;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sug__media {
  display: block;
  aspect-ratio: 3 / 4;
  background: var(--blush);
  overflow: hidden;
}

.sug__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.sug:hover .sug__media img {
  transform: scale(1.05);
}

.sug__sinfoto {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--muted);
  font-size: 0.8rem;
}

.sug__body {
  display: grid;
  gap: 0.4rem;
  padding: 0.8rem;
  flex: 1;
  align-content: start;
}

.sug__title {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 1.05rem;
  line-height: 1.25;
}

.sug__title:hover {
  color: var(--primary);
}

.sug__price {
  color: var(--gold);
  font-weight: 800;
  font-size: 0.95rem;
}

.sug__add {
  margin-top: 0.35rem;
  border: 1px solid var(--primary);
  background: transparent;
  color: var(--primary);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sug__add:hover:not(:disabled) {
  background: var(--primary);
  color: #fff;
}

.sug__add:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 620px) {
  .sugeridos__rail {
    grid-auto-columns: 60%;
  }
}
</style>
