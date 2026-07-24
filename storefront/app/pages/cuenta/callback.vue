<script setup lang="ts">
/**
 * Regreso del login con Google: valida el código, crea el cliente si es
 * su primera vez y redirige a la cuenta.
 */
const route = useRoute()
const medusa = useMedusa()
const { fetchCustomer, claimCart } = useCustomer()
const status = ref<"working" | "error">("working")

const decodeJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")))
  } catch {
    return null
  }
}

onMounted(async () => {
  try {
    const token = await medusa.auth.callback(
      "customer",
      "google",
      route.query as Record<string, string>
    )

    const payload = decodeJwt(token)
    if (payload && !payload.actor_id) {
      // Primera vez con Google: creamos su ficha de cliente
      const email =
        payload?.user_metadata?.email ?? payload?.email ?? undefined
      await medusa.store.customer.create({ email })
      await medusa.auth.refresh()
    }

    await fetchCustomer()
    await claimCart()
    const nextCookie = useCookie("angie_next")
    const next = nextCookie.value || "/cuenta"
    nextCookie.value = null
    await navigateTo(next)
  } catch {
    status.value = "error"
  }
})

useHead({ title: "Iniciando sesión… | Angie Catálogos" })
</script>

<template>
  <div class="container callback">
    <template v-if="status === 'working'">
      <h1>Iniciando sesión…</h1>
      <p>Un momento, estamos validando tu cuenta de Google.</p>
    </template>
    <template v-else>
      <h1>No se pudo iniciar sesión</h1>
      <p>Intenta de nuevo desde tu cuenta.</p>
      <NuxtLink to="/cuenta" class="btn">Volver a intentar</NuxtLink>
    </template>
  </div>
</template>

<style scoped>
.callback {
  padding-top: 4rem;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 1rem;
  color: var(--muted);
}

.callback h1 {
  color: var(--ink);
  font-size: 2rem;
}
</style>
