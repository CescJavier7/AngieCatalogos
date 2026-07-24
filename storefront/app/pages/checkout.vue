<script setup lang="ts">
const medusa = useMedusa()
const { cart, refresh, reset } = useCart()
const { customer, fetchCustomer } = useCustomer()

const PROVINCIAS = [
  "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro",
  "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos",
  "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha",
  "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua",
  "Zamora Chinchipe",
]

const form = reactive({
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  address_1: "",
  city: "",
  province: "Pichincha",
})

const shippingOptions = ref<any[]>([])
const selectedShipping = ref<string | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)
const loaded = ref(false)

onMounted(async () => {
  await refresh()

  // Si hay sesión, precargamos sus datos
  await fetchCustomer()
  if (customer.value) {
    form.email = customer.value.email ?? ""
    form.first_name = customer.value.first_name ?? ""
    form.last_name = customer.value.last_name ?? ""
    form.phone = customer.value.phone ?? ""
    const addr = customer.value.addresses?.[0]
    if (addr) {
      form.address_1 = addr.address_1 ?? ""
      form.city = addr.city ?? ""
      form.province = addr.province || form.province
    }
  }

  if (cart.value?.items?.length) {
    const { shipping_options } = await medusa.store.fulfillment.listCartOptions({
      cart_id: cart.value.id,
    })
    shippingOptions.value = shipping_options
    selectedShipping.value = shipping_options[0]?.id ?? null
  }
  loaded.value = true
})

const shippingAmount = computed(() => {
  const opt = shippingOptions.value.find((o) => o.id === selectedShipping.value)
  return opt?.amount ?? 0
})

const total = computed(
  () => (cart.value?.item_subtotal ?? 0) + shippingAmount.value
)

const placeOrder = async () => {
  if (!cart.value) return
  error.value = null
  submitting.value = true
  try {
    // 1. Datos del cliente y dirección
    await medusa.store.cart.update(cart.value.id, {
      email: form.email,
      shipping_address: {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        address_1: form.address_1,
        city: form.city,
        province: form.province,
        country_code: "ec",
      },
    })

    // 2. Método de envío
    if (selectedShipping.value) {
      await medusa.store.cart.addShippingMethod(cart.value.id, {
        option_id: selectedShipping.value,
      })
    }

    // 3. Sesión de pago (proveedor manual hasta integrar Kushki/PayPhone)
    const { cart: freshCart } = await medusa.store.cart.retrieve(cart.value.id)
    await medusa.store.payment.initiatePaymentSession(freshCart, {
      provider_id: "pp_system_default",
    })

    // 4. Completar pedido
    const result = await medusa.store.cart.complete(cart.value.id)
    if (result.type === "order") {
      useState("last_order").value = result.order
      reset()
      await navigateTo("/pedido/confirmacion")
    } else {
      error.value =
        (result as any).error?.message ??
        "No se pudo completar el pedido. Intenta de nuevo."
    }
  } catch (e: any) {
    error.value = e?.message ?? "Ocurrió un error inesperado."
  } finally {
    submitting.value = false
  }
}

useHead({ title: "Checkout | Angie Catálogos" })
</script>

<template>
  <div class="container checkout">
    <span class="eyebrow">Finalizar compra</span>
    <h1>Ya casi es tuyo</h1>

    <p v-if="loaded && !customer && cart?.items?.length" class="checkout__hint">
      💡 <NuxtLink to="/cuenta">Inicia sesión o crea tu cuenta</NuxtLink> para
      guardar tus datos y seguir tu pedido paso a paso.
    </p>

    <div v-if="loaded && !cart?.items?.length" class="checkout__empty">
      <p>Tu carrito está vacío.</p>
      <NuxtLink to="/#catalogo" class="btn">Ir al catálogo</NuxtLink>
    </div>

    <form v-else-if="loaded" class="checkout__layout" @submit.prevent="placeOrder">
      <section class="panel">
        <h2>1 · Tus datos</h2>
        <div class="fields">
          <label>
            Correo electrónico
            <input v-model="form.email" type="email" required autocomplete="email" />
          </label>
          <div class="fields__row">
            <label>
              Nombre
              <input v-model="form.first_name" required autocomplete="given-name" />
            </label>
            <label>
              Apellido
              <input v-model="form.last_name" required autocomplete="family-name" />
            </label>
          </div>
          <label>
            Teléfono (WhatsApp)
            <input
              v-model="form.phone"
              type="tel"
              required
              pattern="[0-9+ ]{7,15}"
              autocomplete="tel"
            />
          </label>
        </div>

        <h2>2 · Entrega</h2>
        <div class="fields">
          <label>
            Dirección
            <input
              v-model="form.address_1"
              required
              placeholder="Calle principal, número, referencia"
              autocomplete="street-address"
            />
          </label>
          <div class="fields__row">
            <label>
              Ciudad
              <input v-model="form.city" required autocomplete="address-level2" />
            </label>
            <label>
              Provincia
              <select v-model="form.province">
                <option v-for="p in PROVINCIAS" :key="p" :value="p">{{ p }}</option>
              </select>
            </label>
          </div>

          <fieldset class="shipping">
            <legend>Método de entrega</legend>
            <label
              v-for="opt in shippingOptions"
              :key="opt.id"
              class="shipping__option"
              :class="{ 'shipping__option--active': selectedShipping === opt.id }"
            >
              <input
                v-model="selectedShipping"
                type="radio"
                name="shipping"
                :value="opt.id"
              />
              <span class="shipping__name">{{ opt.name }}</span>
              <span class="shipping__price">
                {{ opt.amount ? formatMoney(opt.amount) : "Gratis" }}
              </span>
            </label>
          </fieldset>
        </div>

        <h2>3 · Pago</h2>
        <p class="payment-note">
          Por ahora coordinamos el pago contigo por WhatsApp al confirmar tu
          pedido (transferencia o contra entrega). Muy pronto podrás pagar en
          línea con tarjeta.
        </p>
      </section>

      <aside class="panel summary">
        <h2>Tu pedido</h2>
        <ul class="summary__items">
          <li v-for="item in cart?.items" :key="item.id">
            <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title ?? ''" />
            <span class="summary__title">
              {{ item.product_title || item.title }}
              <small>× {{ item.quantity }}</small>
            </span>
            <span>{{ formatMoney(item.total) }}</span>
          </li>
        </ul>
        <div class="summary__row">
          <span>Subtotal</span>
          <span>{{ formatMoney(cart?.item_subtotal) }}</span>
        </div>
        <div class="summary__row">
          <span>Envío</span>
          <span>{{ shippingAmount ? formatMoney(shippingAmount) : "Gratis" }}</span>
        </div>
        <div class="summary__row summary__row--total">
          <span>Total</span>
          <span>{{ formatMoney(total) }}</span>
        </div>

        <p v-if="error" class="summary__error">{{ error }}</p>

        <button class="btn summary__submit" type="submit" :disabled="submitting">
          {{ submitting ? "Procesando…" : "Confirmar pedido" }}
        </button>
        <p class="summary__safe">Compra respaldada · Angie Catálogos</p>
      </aside>
    </form>

    <p v-else class="checkout__loading">Cargando tu carrito…</p>
  </div>
</template>

<style scoped>
.checkout {
  padding-top: 2.5rem;
}

h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin: 0.4rem 0 1.75rem;
}

.checkout__empty {
  display: grid;
  justify-items: start;
  gap: 1rem;
  padding-block: 2rem;
  color: var(--muted);
}

.checkout__hint {
  background: var(--blush);
  border-radius: 0.75rem;
  padding: 0.8rem 1.1rem;
  margin-bottom: 1.5rem;
  color: var(--muted);
}

.checkout__hint a {
  color: var(--primary);
  font-weight: 700;
}

.checkout__loading {
  color: var(--muted);
  padding-block: 2rem;
}

.checkout__layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2rem;
  align-items: start;
}

.panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 1.1rem;
  padding: 1.75rem;
}

.panel h2 {
  font-size: 1.45rem;
  margin-bottom: 1rem;
}

.panel h2:not(:first-child) {
  margin-top: 1.9rem;
}

.fields {
  display: grid;
  gap: 1rem;
}

.fields label {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.fields__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.shipping {
  border: none;
  display: grid;
  gap: 0.6rem;
}

.shipping legend {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.shipping__option {
  display: flex !important;
  grid-template-columns: none;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.shipping__option--active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.shipping__option input {
  width: auto;
  accent-color: var(--primary);
}

.shipping__name {
  flex: 1;
}

.shipping__price {
  font-weight: 800;
  color: var(--gold);
}

.payment-note {
  color: var(--muted);
  background: var(--blush);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}

.summary {
  position: sticky;
  top: 90px;
}

.summary__items {
  list-style: none;
  display: grid;
  gap: 0.8rem;
  margin-bottom: 1.25rem;
}

.summary__items li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.summary__items img {
  width: 44px;
  height: 56px;
  object-fit: cover;
  border-radius: 0.4rem;
  background: var(--blush);
}

.summary__title {
  flex: 1;
  font-weight: 600;
  line-height: 1.3;
}

.summary__title small {
  color: var(--muted);
  font-weight: 400;
}

.summary__row {
  display: flex;
  justify-content: space-between;
  padding-block: 0.3rem;
  color: var(--muted);
}

.summary__row--total {
  color: var(--ink);
  font-weight: 800;
  font-size: 1.25rem;
  border-top: 1px solid var(--line);
  margin-top: 0.5rem;
  padding-top: 0.75rem;
}

.summary__error {
  color: #b3261e;
  background: #fdecea;
  border-radius: 0.6rem;
  padding: 0.75rem 1rem;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.summary__submit {
  width: 100%;
  margin-top: 1.25rem;
}

.summary__safe {
  text-align: center;
  color: var(--muted);
  font-size: 0.8rem;
  margin-top: 0.75rem;
  letter-spacing: 0.06em;
}

@media (max-width: 860px) {
  .checkout__layout {
    grid-template-columns: 1fr;
  }

  .summary {
    position: static;
  }
}
</style>
