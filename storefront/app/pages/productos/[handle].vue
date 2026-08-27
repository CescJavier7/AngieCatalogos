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
        "id,title,handle,description,thumbnail,*images,*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,*variants.options,*options,*categories,*collection,variants.sku",
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

/** Unidades disponibles (null = sin gestión de inventario) */
const stock = computed<number | null>(() => {
  const v = variant.value as any
  if (!v || v.manage_inventory === false) return null
  return v.inventory_quantity ?? null
})
const soldOut = computed(() => stock.value !== null && stock.value <= 0)
const lowStock = computed(
  () => stock.value !== null && stock.value > 0 && stock.value <= 5
)

const quantity = ref(1)
const added = ref(false)

const maxQty = computed(() => stock.value ?? 99)

const add = async () => {
  if (!variant.value || soldOut.value) return
  await addItem(variant.value.id, quantity.value)
  added.value = true
  setTimeout(() => (added.value = false), 1800)
}

const whatsappUrl = computed(() => {
  const msg = `Hola, estoy interesad@ en el producto: ${product.value?.title} (${price.value}), me gustaría obtener información.`
  return `https://wa.me/593980441321?text=${encodeURIComponent(msg)}`
})

const { public: cfg } = useRuntimeConfig()

/**
 * Cuenta la visita para el panel de Angie. No envía nada de quien mira: solo
 * el producto, así que no hace falta consentimiento de cookies.
 */
onMounted(() => {
  const id = product.value?.id
  if (!id) return
  medusa.client
    .fetch("/store/product-views", { method: "POST", body: { product_id: id } })
    .catch(() => {
      /* que una métrica nunca rompa la ficha */
    })
})

const seoDescription = computed(() => {
  const p: any = product.value
  if (!p) return "Producto del catálogo de Angie Catálogos."
  const base = (p.description ?? "").trim()
  const marca = p.collection?.title ? `${p.collection.title} · ` : ""
  return (
    base ||
    `${marca}${p.title} al mejor precio en Ecuador. Producto original con envío a todo el país y retiro gratis en Machachi.`
  ).slice(0, 300)
})

useSeo({
  title: product.value?.title ?? "Producto",
  description: seoDescription.value,
  image: product.value?.thumbnail || undefined,
})

/**
 * Migas hasta la categoría del producto. Google las pinta en lugar de la URL
 * cruda, y de paso le enseña que la categoría es una página con entidad
 * propia, no un callejón sin salida.
 */
const categoriaPrincipal = computed(() => {
  const cats = ((product.value as any)?.categories ?? []) as any[]
  return cats.find((c) => !AUDIENCE_CATS.includes(c.name)) ?? cats[0] ?? null
})

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
    ...(categoriaPrincipal.value
      ? [
          {
            "@type": "ListItem",
            position: 3,
            name: categoriaPrincipal.value.name,
            item: `${cfg.siteUrl}/categoria/${aSlug(categoriaPrincipal.value.name)}`,
          },
        ]
      : []),
    {
      "@type": "ListItem",
      position: categoriaPrincipal.value ? 4 : 3,
      name: product.value?.title,
      item: `${cfg.siteUrl}/productos/${product.value?.handle}`,
    },
  ],
})

// Ficha de producto para Google: precio, moneda y disponibilidad
useJsonLd({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.value?.title,
  description: seoDescription.value,
  image: product.value?.thumbnail ? [product.value.thumbnail] : undefined,
  sku: (variant.value as any)?.sku,
  brand: (product.value as any)?.collection?.title
    ? { "@type": "Brand", name: (product.value as any).collection.title }
    : undefined,
  offers: {
    "@type": "Offer",
    url: `${cfg.siteUrl}/productos/${product.value?.handle}`,
    priceCurrency: "USD",
    price: (variant.value as any)?.calculated_price?.calculated_amount,
    availability: soldOut.value
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock",
    seller: { "@type": "Organization", name: "Angie Catálogos" },
  },
})
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

        <p v-if="soldOut" class="stock stock--out">Agotado por el momento</p>
        <p v-else-if="lowStock" class="stock stock--low">
          ¡Solo quedan {{ stock }} unidades!
        </p>
        <p class="product__desc">{{ product.description }}</p>

        <p v-if="variant?.title && variant.title !== 'Único'" class="product__presentation">
          Presentación: <strong>{{ variant.title }}</strong>
        </p>

        <div class="product__buy">
          <div v-if="!soldOut" class="qty" aria-label="Cantidad">
            <button :disabled="quantity <= 1" @click="quantity--">−</button>
            <span>{{ quantity }}</span>
            <button :disabled="quantity >= maxQty" @click="quantity++">+</button>
          </div>
          <button class="btn product__add" :disabled="busy || soldOut" @click="add">
            {{ soldOut ? "Agotado" : added ? "Agregado al carrito ✓" : "Agregar al carrito" }}
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
          <li>🚚 Envío gratis en Mejía · $3 en Pichincha · $6 al resto del país</li>
          <li>🏬 Retiro gratis en Machachi</li>
          <li>✅ Productos originales de catálogo</li>
        </ul>
      </div>
    </div>

    <ProductosSugeridos :producto="product" />
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

.stock {
  display: inline-block;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.stock--out {
  background: #f2ecf0;
  color: var(--muted);
}

.stock--low {
  background: rgba(185, 138, 47, 0.14);
  color: var(--gold);
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
