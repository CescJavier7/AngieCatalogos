<script setup lang="ts">
const { customer, fetchCustomer } = useCustomer()
const { resumen, canjear, marketing } = useReferrals()

const datos = ref<any>(null)
const cargando = ref(true)
const errorCarga = ref<string | null>(null)
const copiado = ref(false)
const codigoAmiga = ref("")
const mensajeCanje = ref<{ ok: boolean; texto: string } | null>(null)

const cargar = async () => {
  errorCarga.value = null
  try {
    datos.value = await resumen()
  } catch (e: any) {
    datos.value = null
    errorCarga.value =
      e?.message ?? "No pudimos cargar tu plan. Vuelve a intentarlo en un momento."
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  await fetchCustomer()
  if (!customer.value) {
    await navigateTo("/cuenta?next=/cuenta/amigas")
    return
  }
  await cargar()
})

const enlace = computed(() =>
  datos.value ? `https://tienda.cescjavier.dev/cuenta?ref=${datos.value.code}` : ""
)

const mensajeWhatsApp = computed(() =>
  encodeURIComponent(
    `¡Hola! Te comparto mi código de Angie Catálogos: ${datos.value?.code}. ` +
      `Regístrate con él y tienes $2 de descuento en tu primera compra 💄\n${enlace.value}`
  )
)

const copiar = async () => {
  await navigator.clipboard.writeText(datos.value.code)
  copiado.value = true
  setTimeout(() => (copiado.value = false), 1800)
}

const usarCodigo = async () => {
  mensajeCanje.value = null
  try {
    const r = await canjear(codigoAmiga.value.trim().toUpperCase())
    mensajeCanje.value = { ok: true, texto: r.message }
    codigoAmiga.value = ""
    await cargar()
  } catch (e: any) {
    mensajeCanje.value = {
      ok: false,
      texto: e?.data?.message ?? "No se pudo aplicar el código.",
    }
  }
}

const cambiarMarketing = async (e: Event) => {
  const accepts = (e.target as HTMLInputElement).checked
  const r = await marketing(accepts)
  datos.value.accepts_marketing = r.accepts_marketing
}

const ESTADOS: Record<string, string> = {
  qualified: "Premiada",
  pending: "Esperando su primera compra",
  review: "En revisión",
  rejected: "No válida",
}

useSeo({
  title: "Invita y gana",
  description: "Comparte tu código y gana saldo para tus compras.",
  noindex: true,
})
</script>

<template>
  <div class="container amigas">
    <span class="eyebrow">Invita y gana</span>
    <h1>Comparte y gana saldo</h1>

    <p v-if="cargando" class="amigas__loading">Cargando tu plan…</p>

    <div v-else-if="errorCarga" class="panel amigas__error">
      <p>{{ errorCarga }}</p>
      <button class="btn btn--ghost" @click="cargar">Reintentar</button>
    </div>

    <template v-else-if="datos">
      <!-- Progreso hacia la siguiente meta -->
      <section class="panel meta">
        <div class="meta__top">
          <div>
            <span class="meta__label">Tu saldo</span>
            <strong class="meta__saldo">{{ formatMoney(datos.balance) }}</strong>
          </div>
          <p v-if="datos.progreso.meta" class="meta__falta">
            Te {{ datos.progreso.faltan === 1 ? "falta" : "faltan" }}
            <strong>{{ datos.progreso.faltan }}</strong>
            {{ datos.progreso.faltan === 1 ? "amiga" : "amigas" }}
            para llegar a {{ formatMoney(datos.progreso.premio) }}
          </p>
          <p v-else class="meta__falta">
            ¡Llegaste al máximo de {{ formatMoney(datos.tope) }}! Úsalo y vuelve a acumular.
          </p>
        </div>

        <div class="barra" role="progressbar" :aria-valuenow="datos.progreso.porcentaje">
          <div class="barra__fill" :style="{ width: `${datos.progreso.porcentaje}%` }" />
          <span class="barra__pct">{{ datos.progreso.porcentaje }}%</span>
        </div>

        <p class="meta__nota">
          El saldo se acredita cuando tu amiga paga su primera compra con tarjeta.
        </p>
      </section>

      <!-- Código para compartir -->
      <section class="panel">
        <h2>Tu código</h2>
        <div class="codigo">
          <code>{{ datos.code }}</code>
          <button class="btn btn--ghost" @click="copiar">
            {{ copiado ? "¡Copiado!" : "Copiar" }}
          </button>
        </div>
        <a
          class="btn amigas__ws"
          :href="`https://wa.me/?text=${mensajeWhatsApp}`"
          target="_blank"
          rel="noopener"
        >
          Compartir por WhatsApp
        </a>
        <p class="amigas__hint">
          Quien se registre con tu código recibe <strong>$2</strong> en su primera compra.
        </p>
      </section>

      <!-- Amigas invitadas -->
      <section class="panel">
        <h2>Tus amigas ({{ datos.qualified_count }} premiadas)</h2>
        <p v-if="!datos.amigos.length" class="amigas__vacio">
          Todavía no has invitado a nadie. ¡Comparte tu código!
        </p>
        <ul v-else class="lista">
          <li v-for="(a, i) in datos.amigos" :key="i" :class="`lista__item--${a.status}`">
            <span>{{ ESTADOS[a.status] ?? a.status }}</span>
            <strong v-if="a.reward">+{{ formatMoney(a.reward) }}</strong>
          </li>
        </ul>
      </section>

      <!-- Canjear el código de otra persona -->
      <section v-if="!datos.qualified_count" class="panel">
        <h2>¿Te invitaron?</h2>
        <form class="canje" @submit.prevent="usarCodigo">
          <input
            v-model="codigoAmiga"
            placeholder="Código de tu amiga"
            maxlength="12"
            required
          />
          <button class="btn" type="submit">Aplicar</button>
        </form>
        <p v-if="mensajeCanje" :class="mensajeCanje.ok ? 'canje__ok' : 'canje__error'">
          {{ mensajeCanje.texto }}
        </p>
      </section>

      <!-- Consentimiento explícito, como exige la LOPDP -->
      <section class="panel">
        <label class="marketing">
          <input
            type="checkbox"
            :checked="datos.accepts_marketing"
            @change="cambiarMarketing"
          />
          <span>
            Quiero recibir promociones y novedades por correo.
            <small>Puedes desactivarlo cuando quieras desde aquí.</small>
          </span>
        </label>
      </section>
    </template>
  </div>
</template>

<style scoped>
.amigas {
  padding-block: 2.5rem 1rem;
  display: grid;
  gap: 1.25rem;
  max-width: 720px;
}

h1 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin: 0.3rem 0 0.5rem;
}

.amigas__loading,
.amigas__vacio {
  color: var(--muted);
}

.amigas__error {
  display: grid;
  gap: 0.9rem;
  justify-items: start;
  color: var(--muted);
}

.panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 1.1rem;
  padding: 1.4rem;
}

.panel h2 {
  font-size: 1.3rem;
  margin-bottom: 0.9rem;
}

.meta__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.meta__label {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}

.meta__saldo {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 2.4rem;
  color: var(--primary);
  line-height: 1.1;
}

.meta__falta {
  color: var(--muted);
  font-size: 0.9rem;
  text-align: right;
}

.meta__falta strong {
  color: var(--primary);
}

.barra {
  position: relative;
  height: 22px;
  border-radius: 999px;
  background: var(--blush);
  overflow: hidden;
}

.barra__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--gold) 140%);
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.3, 1);
}

.barra__pct {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--ink);
}

.meta__nota {
  margin-top: 0.75rem;
  font-size: 0.82rem;
  color: var(--muted);
}

.codigo {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.9rem;
}

.codigo code {
  flex: 1;
  font-family: ui-monospace, monospace;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  background: var(--blush);
  border-radius: 0.7rem;
  padding: 0.7rem 1rem;
  text-align: center;
  color: var(--primary);
}

.amigas__ws {
  width: 100%;
  justify-content: center;
}

.amigas__hint {
  margin-top: 0.7rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.lista {
  list-style: none;
  display: grid;
  gap: 0.5rem;
}

.lista li {
  display: flex;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  padding: 0.6rem 0.9rem;
  font-size: 0.9rem;
  color: var(--muted);
}

.lista__item--qualified {
  border-color: var(--success);
  color: var(--success);
  font-weight: 600;
}

.lista li strong {
  color: var(--gold);
}

.canje {
  display: flex;
  gap: 0.75rem;
}

.canje input {
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.canje__ok {
  margin-top: 0.6rem;
  color: var(--success);
  font-weight: 600;
}

.canje__error {
  margin-top: 0.6rem;
  color: var(--primary);
  font-weight: 600;
}

.marketing {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  cursor: pointer;
  font-size: 0.92rem;
}

.marketing input {
  width: auto;
  margin-top: 0.2rem;
  accent-color: var(--primary);
}

.marketing small {
  display: block;
  color: var(--muted);
  font-size: 0.8rem;
}

@media (max-width: 520px) {
  .canje {
    flex-direction: column;
  }

  .meta__falta {
    text-align: left;
  }
}
</style>
