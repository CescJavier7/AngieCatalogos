<script setup lang="ts">
const { customer, loading, fetchCustomer, login, register, loginWithGoogle, logout, listOrders } =
  useCustomer()
const config = useRuntimeConfig()

const mode = ref<"login" | "register">("login")
const form = reactive({
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  phone: "",
})
const error = ref<string | null>(null)
const orders = ref<any[]>([])
const ordersLoaded = ref(false)

const loadOrders = async () => {
  if (!customer.value) return
  orders.value = await listOrders()
  ordersLoaded.value = true
}

onMounted(async () => {
  await fetchCustomer()
  await loadOrders()
})

const route = useRoute()

const submit = async () => {
  error.value = null
  try {
    if (mode.value === "login") {
      await login(form.email, form.password)
    } else {
      await register({ ...form })
    }
    // Si venía del checkout, lo devolvemos a terminar su compra
    if (typeof route.query.next === "string") {
      await navigateTo(route.query.next)
      return
    }
    await loadOrders()
  } catch (e: any) {
    error.value =
      e?.message?.includes("Invalid") || e?.message?.includes("credenciales")
        ? "Correo o contraseña incorrectos."
        : e?.message ?? "No se pudo completar. Intenta de nuevo."
  }
}

const salir = async () => {
  await logout()
  orders.value = []
}

/**
 * Logística del pedido en 4 pasos, derivada de los estados de Medusa.
 * El paso "activo" es el último alcanzado.
 */
const steps = (o: any) => {
  const paid = ["captured", "partially_captured"].includes(o.payment_status)
  const shipped = ["shipped", "partially_shipped", "delivered", "partially_delivered"].includes(
    o.fulfillment_status
  )
  const delivered = ["delivered", "partially_delivered"].includes(o.fulfillment_status)
  return [
    { icon: "🧾", label: "Recibido", done: true },
    { icon: "💳", label: "Pago confirmado", done: paid },
    { icon: "🚚", label: "Enviado", done: shipped },
    { icon: "🏠", label: "Entregado", done: delivered },
  ]
}

/** Código de seguimiento legible a partir del id global del pedido. */
const trackingCode = (o: any) => `AC-${String(o.display_id).padStart(4, "0")}`

/** Numeración personal: el pedido más antiguo del cliente es su Pedido 1. */
const ordinal = (idx: number) => orders.value.length - idx

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })

useHead({ title: "Mi cuenta | Angie Catálogos" })
</script>

<template>
  <div class="container account">
    <!-- ── Sesión iniciada ── -->
    <template v-if="customer">
      <div class="account__head">
        <div>
          <span class="eyebrow">Mi cuenta</span>
          <h1>Hola, {{ customer.first_name || customer.email }} 👋</h1>
        </div>
        <button class="btn btn--ghost" @click="salir">Cerrar sesión</button>
      </div>

      <section class="orders">
        <h2>Mis pedidos</h2>

        <p v-if="ordersLoaded && !orders.length" class="orders__empty">
          Aún no tienes pedidos.
          <NuxtLink to="/#catalogo" class="orders__link">Descubre el catálogo →</NuxtLink>
        </p>

        <article v-for="(o, idx) in orders" :key="o.id" class="order">
          <header class="order__head">
            <div>
              <strong>Pedido {{ ordinal(idx) }}</strong>
              <span class="order__code">Seguimiento: {{ trackingCode(o) }}</span>
              <span class="order__date">{{ fecha(o.created_at) }}</span>
            </div>
            <strong class="order__total">{{ formatMoney(o.total) }}</strong>
          </header>

          <ol class="timeline">
            <li
              v-for="(s, i) in steps(o)"
              :key="i"
              :class="{ 'timeline__step--done': s.done }"
              class="timeline__step"
            >
              <span class="timeline__dot">{{ s.icon }}</span>
              <span class="timeline__label">{{ s.label }}</span>
            </li>
          </ol>

          <ul class="order__items">
            <li v-for="item in o.items" :key="item.id">
              {{ item.product_title || item.title }} × {{ item.quantity }}
            </li>
          </ul>
        </article>
      </section>
    </template>

    <!-- ── Login / Registro ── -->
    <template v-else>
      <div class="auth">
        <span class="eyebrow">{{ mode === "login" ? "Bienvenida de vuelta" : "Únete" }}</span>
        <h1>{{ mode === "login" ? "Inicia sesión" : "Crea tu cuenta" }}</h1>
        <p class="auth__lead">
          Guarda tus datos, revisa tus pedidos y sigue tu entrega paso a paso.
        </p>

        <button
          v-if="config.public.googleAuthEnabled"
          class="google-btn"
          type="button"
          @click="loginWithGoogle(typeof route.query.next === 'string' ? route.query.next : undefined)"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 42.6 44 38 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          Continuar con Google
        </button>
        <div v-if="config.public.googleAuthEnabled" class="auth__divider"><span>o con tu correo</span></div>

        <form class="auth__form" @submit.prevent="submit">
          <template v-if="mode === 'register'">
            <div class="auth__row">
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
              <input v-model="form.phone" type="tel" autocomplete="tel" />
            </label>
          </template>

          <label>
            Correo electrónico
            <input v-model="form.email" type="email" required autocomplete="email" />
          </label>
          <label>
            Contraseña
            <input
              v-model="form.password"
              type="password"
              required
              minlength="8"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            />
          </label>

          <p v-if="error" class="auth__error">{{ error }}</p>

          <button class="btn" type="submit" :disabled="loading">
            {{ loading ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta" }}
          </button>
        </form>

        <p class="auth__switch">
          <template v-if="mode === 'login'">
            ¿Primera vez aquí?
            <button type="button" @click="mode = 'register'">Crea tu cuenta</button>
          </template>
          <template v-else>
            ¿Ya tienes cuenta?
            <button type="button" @click="mode = 'login'">Inicia sesión</button>
          </template>
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.account {
  padding-top: 2.5rem;
}

.account__head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

h1 {
  font-size: clamp(1.9rem, 4vw, 2.7rem);
  margin-top: 0.3rem;
}

.orders h2 {
  font-size: 1.6rem;
  margin-bottom: 1.25rem;
}

.orders__empty {
  color: var(--muted);
}

.orders__link {
  color: var(--primary);
  font-weight: 700;
}

.order {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}

.order__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1.25rem;
}

.order__code {
  display: inline-block;
  margin-left: 0.75rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.order__date {
  color: var(--muted);
  margin-left: 0.75rem;
  font-size: 0.9rem;
}

.order__total {
  color: var(--gold);
  font-size: 1.15rem;
}

.timeline {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 1.25rem;
}

.timeline__step {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  text-align: center;
}

.timeline__step:not(:last-child)::after {
  content: "";
  position: absolute;
  top: 16px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--line);
  z-index: 0;
}

.timeline__step--done:not(:last-child)::after {
  background: var(--primary);
}

.timeline__dot {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--line);
  z-index: 1;
  font-size: 1rem;
  filter: grayscale(1) opacity(0.45);
}

.timeline__step--done .timeline__dot {
  border-color: var(--primary);
  background: var(--primary-soft);
  filter: none;
}

.timeline__label {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 600;
}

.timeline__step--done .timeline__label {
  color: var(--ink);
}

.order__items {
  list-style: none;
  color: var(--muted);
  font-size: 0.9rem;
  display: grid;
  gap: 0.2rem;
}

/* ── Auth ── */
.auth {
  max-width: 430px;
  margin-inline: auto;
  display: grid;
  gap: 0.9rem;
  padding-block: 1.5rem;
}

.auth__lead {
  color: var(--muted);
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 0.8rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.google-btn:hover {
  border-color: var(--muted);
  box-shadow: 0 4px 14px rgba(42, 30, 38, 0.1);
}

.auth__divider {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.auth__divider::before,
.auth__divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}

.auth__form {
  display: grid;
  gap: 0.9rem;
}

.auth__form label {
  display: grid;
  gap: 0.3rem;
  font-weight: 600;
  font-size: 0.88rem;
}

.auth__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}

.auth__error {
  color: #b3261e;
  background: #fdecea;
  border-radius: 0.6rem;
  padding: 0.7rem 1rem;
  font-size: 0.9rem;
}

.auth__switch {
  text-align: center;
  color: var(--muted);
  font-size: 0.92rem;
}

.auth__switch button {
  border: none;
  background: none;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
  font-size: inherit;
}
</style>
