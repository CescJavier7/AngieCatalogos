<script setup lang="ts">
const route = useRoute()
const medusa = useMedusa()
const { data: region } = await useRegion()
const { addItem, busy } = useCart()

const { data: product } = await useAsyncData(
  `product-${route.params.handle}`,
  async () => {
    const { products } = await medusa.store.product.list({
      handle: route.params.handle as string,
      region_id: region.value?.id,
      fields:
        "id,title,handle,description,thumbnail,*images,*variants.calculated_price,*variants.options,*options,*categories",
    })
    return products[0] ?? null
  },
  { watch: [region] }
)

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: "Producto no encontrado" })
}

const variant = computed(() => product.value?.variants?.[0])
const price = computed(() =>
  formatMoney(variant.value?.calculated_price?.calculated_amount)
)

const quantity = ref(1)
const added = ref(false)

const add = async () => {
  if (!variant.value) return
  await addItem(variant.value.id, quantity.value)
  added.value = true
  setTimeout(() => (added.value = false), 1800)
}

const whatsappUrl = computed(() => {
  const msg = `Hola, estoy interesad@ en el producto: ${product.value?.title} (${price.value}), me gustaría obtener información.`
  return `https://wa.me/593980441321?text=${encodeURIComponent(msg)}`
})

useHead(() => ({
  title: product.value
    ? `${product.value.title} | Angie Catálogos`
    : "Producto | Angie Catálogos",
}))
</script>

<template>
  <div v-if="product" class="container product">
    <NuxtLink to="/#catalogo" class="product__back">← Volver al catálogo</NuxtLink>

    <div class="product__layout">
      <div class="product__media">
        <img :src="product.thumbnail || product.images?.[0]?.url" :alt="product.title" />
      </div>

      <div class="product__info">
        <span v-if="product.categories?.length" class="eyebrow">
          {{ product.categories[0].name }}
        </span>
        <h1>{{ product.title }}</h1>
        <p class="product__price">{{ price }}</p>
        <p class="product__desc">{{ product.description }}</p>

        <p v-if="variant?.title && variant.title !== 'Único'" class="product__presentation">
          Presentación: <strong>{{ variant.title }}</strong>
        </p>

        <div class="product__buy">
          <div class="qty" aria-label="Cantidad">
            <button :disabled="quantity <= 1" @click="quantity--">−</button>
            <span>{{ quantity }}</span>
            <button @click="quantity++">+</button>
          </div>
          <button class="btn product__add" :disabled="busy" @click="add">
            {{ added ? "Agregado al carrito ✓" : "Agregar al carrito" }}
          </button>
        </div>

        <a
          :href="whatsappUrl"
          target="_blank"
          rel="noopener"
          class="btn btn--gold product__ws"
        >
          Consultar por WhatsApp
        </a>

        <ul class="product__perks">
          <li>🚚 Envío a todo el Ecuador (1 a 3 días hábiles)</li>
          <li>🏬 Retiro gratis en Machachi</li>
          <li>✅ Productos originales de catálogo</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product {
  padding-top: 2rem;
}

.product__back {
  display: inline-block;
  margin-bottom: 1.5rem;
  color: var(--muted);
  font-weight: 600;
}

.product__back:hover {
  color: var(--primary);
}

.product__layout {
  display: grid;
  grid-template-columns: minmax(280px, 460px) 1fr;
  gap: 3.5rem;
  align-items: start;
}

.product__media {
  border-radius: 1.25rem;
  overflow: hidden;
  background: var(--blush);
  border: 1px solid var(--line);
  position: relative;
}

h1 {
  font-size: clamp(1.9rem, 3.4vw, 2.9rem);
  margin: 0.4rem 0 0.6rem;
}

.product__price {
  color: var(--gold);
  font-family: "Cormorant Garamond", serif;
  font-size: 2.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.product__desc {
  color: var(--muted);
  max-width: 55ch;
  margin-bottom: 1rem;
}

.product__presentation {
  margin-bottom: 1.25rem;
}

.product__buy {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.9rem;
}

.qty {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  background: #fff;
}

.qty button {
  border: none;
  background: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--ink);
  width: 24px;
}

.qty button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.qty button:hover:not(:disabled) {
  color: var(--primary);
}

.qty span {
  min-width: 1.5ch;
  text-align: center;
  font-weight: 700;
}

.product__ws {
  margin-bottom: 2rem;
}

.product__perks {
  list-style: none;
  display: grid;
  gap: 0.5rem;
  border-top: 1px solid var(--line);
  padding-top: 1.25rem;
}

@media (max-width: 760px) {
  .product__layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
</style>
