<script setup lang="ts">
/**
 * Aviso de las tarifas de envío, al estilo de las promos que saltan en Temu.
 * Se muestra una sola vez por visitante: se recuerda en localStorage.
 */
const CLAVE = "angie_promo_envios_visto"

const abierto = ref(false)

onMounted(() => {
  if (localStorage.getItem(CLAVE)) return
  // Un respiro antes de aparecer para no atropellar la carga de la página
  setTimeout(() => (abierto.value = true), 1400)
})

const cerrar = () => {
  abierto.value = false
  localStorage.setItem(CLAVE, "1")
}
</script>

<template>
  <Teleport to="body">
    <Transition name="promo">
      <div v-if="abierto" class="promo" role="dialog" aria-modal="true" aria-labelledby="promo-t">
        <div class="promo__backdrop" @click="cerrar" />
        <div class="promo__card">
          <button class="promo__close" aria-label="Cerrar" @click="cerrar">×</button>

          <span class="promo__badge">Promoción de envíos</span>
          <h2 id="promo-t">Tu pedido llega<br /><em>sin complicarte</em></h2>

          <ul class="promo__zones">
            <li class="promo__zone promo__zone--free">
              <span class="promo__price">Gratis</span>
              <span class="promo__where">
                <strong>Machachi y todo Mejía</strong>
                Lo llevamos nosotros, casi siempre el mismo día
              </span>
            </li>
            <li class="promo__zone">
              <span class="promo__price">$3</span>
              <span class="promo__where">
                <strong>Resto de Pichincha</strong>
                Quito, Rumiñahui, Cayambe y demás cantones
              </span>
            </li>
            <li class="promo__zone">
              <span class="promo__price">$6</span>
              <span class="promo__where">
                <strong>Todo el país</strong>
                Por transportadora, de 2 a 4 días hábiles
              </span>
            </li>
          </ul>

          <NuxtLink to="/catalogo" class="btn promo__cta" @click="cerrar">
            Ver el catálogo
          </NuxtLink>
          <button class="promo__later" @click="cerrar">Ahora no</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.promo {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.promo__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(42, 30, 38, 0.55);
  backdrop-filter: blur(3px);
}

.promo__card {
  position: relative;
  width: min(420px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--card);
  border-radius: 1.25rem;
  padding: 1.9rem 1.6rem 1.5rem;
  text-align: center;
  box-shadow: 0 24px 70px rgba(42, 30, 38, 0.35);
}

.promo__close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}

.promo__close:hover {
  color: var(--ink);
}

.promo__badge {
  display: inline-block;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
}

.promo__card h2 {
  font-size: 1.75rem;
  line-height: 1.15;
  margin: 0.75rem 0 1.25rem;
}

.promo__card h2 em {
  color: var(--primary);
}

.promo__zones {
  list-style: none;
  display: grid;
  gap: 0.6rem;
  margin-bottom: 1.4rem;
}

.promo__zone {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  padding: 0.7rem 0.9rem;
}

.promo__zone--free {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.promo__price {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--primary);
  min-width: 3.4rem;
  text-align: center;
}

.promo__where {
  display: grid;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.35;
}

.promo__where strong {
  color: var(--ink);
  font-size: 0.92rem;
}

.promo__cta {
  width: 100%;
  justify-content: center;
}

.promo__later {
  display: block;
  width: 100%;
  margin-top: 0.7rem;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
}

.promo__later:hover {
  color: var(--primary);
}

.promo-enter-active,
.promo-leave-active {
  transition: opacity 0.25s ease;
}

.promo-enter-active .promo__card {
  transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.promo-enter-from,
.promo-leave-to {
  opacity: 0;
}

.promo-enter-from .promo__card {
  transform: scale(0.9) translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .promo-enter-active,
  .promo-leave-active,
  .promo-enter-active .promo__card {
    transition: none;
  }
}
</style>
