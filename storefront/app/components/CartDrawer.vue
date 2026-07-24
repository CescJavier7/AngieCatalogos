<script setup lang="ts">
const { cart, cartOpen, busy, updateQuantity, removeItem } = useCart()

const close = () => (cartOpen.value = false)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="cartOpen" class="overlay" @click="close" />
    </Transition>

    <Transition name="slide">
      <aside v-if="cartOpen" class="drawer" aria-label="Carrito de compras">
        <header class="drawer__head">
          <h2 class="serif">Tu carrito</h2>
          <button class="drawer__close" aria-label="Cerrar" @click="close">×</button>
        </header>

        <div v-if="!cart?.items?.length" class="drawer__empty">
          <p class="serif drawer__empty-title">Aún está vacío</p>
          <p>Descubre nuestras fragancias y cuidado de la piel.</p>
          <button class="btn" @click="close">Seguir explorando</button>
        </div>

        <template v-else>
          <ul class="drawer__items">
            <li v-for="item in cart.items" :key="item.id" class="item">
              <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title ?? ''" />
              <div class="item__info">
                <p class="item__title">{{ item.product_title || item.title }}</p>
                <p class="item__price">{{ formatMoney(item.unit_price) }}</p>
                <div class="item__qty">
                  <button
                    :disabled="busy"
                    aria-label="Quitar uno"
                    @click="updateQuantity(item.id, item.quantity - 1)"
                  >
                    −
                  </button>
                  <span>{{ item.quantity }}</span>
                  <button
                    :disabled="busy"
                    aria-label="Agregar uno"
                    @click="updateQuantity(item.id, item.quantity + 1)"
                  >
                    +
                  </button>
                  <button
                    class="item__remove"
                    :disabled="busy"
                    @click="removeItem(item.id)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <p class="item__total">{{ formatMoney(item.total) }}</p>
            </li>
          </ul>

          <footer class="drawer__foot">
            <div class="drawer__row">
              <span>Subtotal</span>
              <strong>{{ formatMoney(cart.item_subtotal) }}</strong>
            </div>
            <p class="drawer__note">El envío se calcula en el checkout.</p>
            <NuxtLink to="/checkout" class="btn drawer__checkout" @click="close">
              Finalizar compra
            </NuxtLink>
          </footer>
        </template>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(42, 30, 38, 0.45);
  backdrop-filter: blur(2px);
  z-index: 90;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  background: var(--bg);
  z-index: 100;
  display: flex;
  flex-direction: column;
  box-shadow: -18px 0 50px rgba(42, 30, 38, 0.25);
}

.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--line);
}

.drawer__head h2 {
  font-size: 1.6rem;
}

.drawer__close {
  background: none;
  border: none;
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
}

.drawer__close:hover {
  color: var(--ink);
}

.drawer__empty {
  flex: 1;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  text-align: center;
  padding: 2rem;
  color: var(--muted);
}

.drawer__empty-title {
  font-size: 1.5rem;
  color: var(--ink);
}

.drawer__items {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: 1rem 1.5rem;
  display: grid;
  gap: 1rem;
  align-content: start;
}

.item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 0.9rem;
  align-items: start;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.item img {
  width: 64px;
  height: 80px;
  object-fit: cover;
  border-radius: 0.5rem;
  background: var(--blush);
}

.item__title {
  font-weight: 700;
  line-height: 1.3;
}

.item__price {
  color: var(--muted);
  font-size: 0.9rem;
}

.item__qty {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.item__qty button {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.item__qty button:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.item__remove {
  width: auto !important;
  height: auto !important;
  border: none !important;
  background: none !important;
  color: var(--muted);
  font-size: 0.8rem;
  text-decoration: underline;
}

.item__remove:hover {
  color: var(--primary) !important;
}

.item__total {
  font-weight: 800;
}

.drawer__foot {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--line);
  background: #fff;
}

.drawer__row {
  display: flex;
  justify-content: space-between;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.drawer__note {
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.drawer__checkout {
  width: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
