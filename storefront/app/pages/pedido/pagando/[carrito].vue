<script setup lang="ts">
/**
 * Regreso desde PayPhone.
 *
 * PayPhone devuelve a esta dirección con ?id=<transacción>&clientTransactionId=<referencia>.
 * El carrito viaja en la ruta porque su cookie puede no estar (otro navegador,
 * sesión limpiada) y sin él no hay pedido que armar.
 *
 * Aquí el dinero todavía está retenido, no cobrado: se cobra al completar el
 * carrito, un paso más abajo. Si esta página nunca se abre, PayPhone reversa
 * la retención sola a los 5 minutos y la clienta no pierde nada.
 */
const route = useRoute()
const medusa = useMedusa()
const { reset } = useCart()

const carritoId = String(route.params.carrito ?? "")
const estado = ref<"procesando" | "cancelado" | "error">("procesando")
const detalle = ref("")

const whatsappUrl = computed(() => {
  const msg =
    "Hola, tuve un problema al pagar con tarjeta en la tienda y quiero completar mi pedido."
  return `https://wa.me/593980441321?text=${encodeURIComponent(msg)}`
})

useSeo({
  title: "Confirmando tu pago",
  description: "Estamos confirmando tu pago con Angie Catálogos.",
  noindex: true,
})

onMounted(async () => {
  const transaccion = route.query.id
  const referencia = route.query.clientTransactionId

  // Sin esos dos parámetros la clienta salió por el botón de cancelar
  if (!transaccion || !referencia || !carritoId) {
    estado.value = "cancelado"
    return
  }

  try {
    await medusa.client.fetch("/store/payphone/confirmar", {
      method: "POST",
      body: {
        cart_id: carritoId,
        id: transaccion,
        clientTransactionId: referencia,
      },
    })

    // Este es el paso que cobra: valida el stock, crea el pedido y recién
    // entonces le pide a PayPhone el cobro definitivo
    const result = await medusa.store.cart.complete(carritoId)
    if (result.type === "order") {
      useUltimoPedido().guardar(result.order)
      reset()
      await navigateTo("/pedido/confirmacion")
      return
    }

    estado.value = "error"
    detalle.value =
      (result as any).error?.message ??
      "No pudimos cerrar tu pedido. Escríbenos y lo resolvemos."
  } catch (e: any) {
    estado.value = "error"
    detalle.value =
      e?.message ?? "No pudimos confirmar tu pago. Escríbenos y lo revisamos."
  }
})
</script>

<template>
  <div class="container pagando">
    <template v-if="estado === 'procesando'">
      <div class="pagando__spinner" aria-hidden="true"></div>
      <h1>Confirmando tu pago…</h1>
      <p class="pagando__lead">
        Un momento, estamos cerrando tu pedido. No cierres ni recargues esta
        página.
      </p>
    </template>

    <template v-else-if="estado === 'cancelado'">
      <div class="pagando__badge">↩</div>
      <h1>No se completó el pago</h1>
      <p class="pagando__lead">
        Tu carrito quedó intacto. Puedes volver a intentarlo con tarjeta o
        elegir coordinar el pago por WhatsApp.
      </p>
      <NuxtLink to="/checkout" class="btn">Volver a finalizar compra</NuxtLink>
    </template>

    <template v-else>
      <div class="pagando__badge pagando__badge--error">!</div>
      <h1>Algo quedó a medias</h1>
      <p class="pagando__lead">{{ detalle }}</p>
      <p class="pagando__nota">
        Si tu tarjeta llegó a debitarse y el pedido no aparece, el cobro se
        reversa solo en unos minutos. Escríbenos y lo confirmamos contigo.
      </p>
      <div class="pagando__acciones">
        <a :href="whatsappUrl" target="_blank" rel="noopener" class="btn">
          Escribirnos por WhatsApp
        </a>
        <NuxtLink to="/checkout" class="pagando__volver">
          ← Volver a finalizar compra
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pagando {
  padding-top: 3.5rem;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 0.9rem;
  max-width: 640px;
}

h1 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
}

.pagando__lead {
  color: var(--muted);
  line-height: 1.6;
}

.pagando__nota {
  font-size: 0.86rem;
  color: var(--muted);
  background: var(--primary-soft);
  border-radius: 0.8rem;
  padding: 0.8rem 1rem;
}

.pagando__spinner {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 3px solid var(--line);
  border-top-color: var(--primary);
  animation: gira 0.9s linear infinite;
}

@keyframes gira {
  to {
    transform: rotate(360deg);
  }
}

/* Quien prefiere menos movimiento ve un pulso suave en vez del giro */
@media (prefers-reduced-motion: reduce) {
  .pagando__spinner {
    animation: none;
    border-top-color: var(--line);
    background: var(--primary-soft);
  }
}

.pagando__badge {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 1.9rem;
  font-weight: 800;
  border: 1px solid var(--primary);
}

.pagando__badge--error {
  background: #fdf1f1;
  border-color: #d98a8a;
  color: #b23b3b;
}

.pagando__acciones {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  margin-top: 0.4rem;
}

.pagando__volver {
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
