<script setup lang="ts">
const order = useState<any>("last_order")

useHead({ title: "¡Pedido confirmado! | Angie Catálogos" })

const trackingCode = computed(
  () => `AC-${String(order.value?.display_id ?? 0).padStart(4, "0")}`
)

const whatsappUrl = computed(() => {
  const msg = `Hola, acabo de realizar el pedido ${trackingCode.value} en la tienda. Quiero coordinar el pago y la entrega.`
  return `https://wa.me/593980441321?text=${encodeURIComponent(msg)}`
})
</script>

<template>
  <div class="container confirm">
    <template v-if="order">
      <div class="confirm__badge">✓</div>
      <span class="eyebrow">Seguimiento: {{ trackingCode }}</span>
      <h1>¡Gracias por tu compra!</h1>
      <p class="confirm__lead">
        Recibimos tu pedido correctamente. Te contactaremos por WhatsApp para
        coordinar el pago y la entrega — o escríbenos tú directamente:
      </p>
      <a :href="whatsappUrl" target="_blank" rel="noopener" class="btn">
        Coordinar por WhatsApp
      </a>

      <div class="confirm__summary">
        <h2>Resumen</h2>
        <ul>
          <li v-for="item in order.items" :key="item.id">
            <span>{{ item.product_title || item.title }} × {{ item.quantity }}</span>
            <span>{{ formatMoney(item.total) }}</span>
          </li>
        </ul>
        <div class="confirm__total">
          <span>Total</span>
          <span>{{ formatMoney(order.total) }}</span>
        </div>
      </div>

      <NuxtLink to="/#catalogo" class="confirm__back">← Seguir comprando</NuxtLink>
    </template>

    <template v-else>
      <h1>No hay un pedido reciente</h1>
      <p class="confirm__lead">Explora el catálogo para encontrar tu próximo favorito.</p>
      <NuxtLink to="/#catalogo" class="btn">Ir al catálogo</NuxtLink>
    </template>
  </div>
</template>

<style scoped>
.confirm {
  padding-top: 3.5rem;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 0.9rem;
  max-width: 640px;
}

.confirm__badge {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 2.2rem;
  font-weight: 800;
  border: 1px solid var(--primary);
}

h1 {
  font-size: clamp(2rem, 4vw, 2.9rem);
}

.confirm__lead {
  color: var(--muted);
  max-width: 48ch;
}

.confirm__summary {
  width: 100%;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-top: 1.5rem;
  text-align: left;
}

.confirm__summary h2 {
  font-size: 1.3rem;
  margin-bottom: 0.9rem;
}

.confirm__summary ul {
  list-style: none;
  display: grid;
  gap: 0.5rem;
}

.confirm__summary li {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
}

.confirm__total {
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 1.15rem;
  border-top: 1px solid var(--line);
  margin-top: 0.9rem;
  padding-top: 0.9rem;
}

.confirm__back {
  margin-top: 1.5rem;
  color: var(--muted);
  font-weight: 600;
}

.confirm__back:hover {
  color: var(--primary);
}
</style>
