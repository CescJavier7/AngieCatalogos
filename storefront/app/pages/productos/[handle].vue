<script setup lang="ts">
const route = useRoute()
const medusa = useMedusa()
const { data: region } = await useRegion()

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

const price = computed(() => {
  const amount = variant.value?.calculated_price?.calculated_amount
  return amount != null ? `$${Number(amount).toFixed(2)}` : ""
})

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
        <p v-if="product.categories?.length" class="product__category">
          {{ product.categories[0].name }}
        </p>
        <h1>{{ product.title }}</h1>
        <p class="product__price">{{ price }}</p>
        <p class="product__desc">{{ product.description }}</p>

        <p v-if="variant?.title && variant.title !== 'Único'" class="product__presentation">
          Presentación: <strong>{{ variant.title }}</strong>
        </p>

        <div class="product__actions">
          <!-- El carrito llega con el checkout (Fase 3b) -->
          <a :href="whatsappUrl" target="_blank" rel="noopener" class="btn">
            Pedir por WhatsApp
          </a>
        </div>

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
  gap: 3rem;
  align-items: start;
}

.product__media {
  border-radius: 1.25rem;
  overflow: hidden;
  background: #faf5f8;
  border: 1px solid var(--line);
}

.product__category {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85rem;
  font-weight: 700;
}

h1 {
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  margin: 0.25rem 0 0.75rem;
}

.product__price {
  color: var(--primary);
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.product__desc {
  color: var(--muted);
  max-width: 55ch;
  margin-bottom: 1rem;
}

.product__presentation {
  margin-bottom: 1.5rem;
}

.product__actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.product__perks {
  list-style: none;
  display: grid;
  gap: 0.5rem;
  color: var(--ink);
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
