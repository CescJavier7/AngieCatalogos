<script setup lang="ts">
const { itemCount, cartOpen, refresh } = useCart()

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="site">
    <div class="topbar">
      Envíos a todo el Ecuador · 1 a 3 días hábiles · Retiro gratis en Machachi
    </div>

    <header class="header">
      <div class="container header__inner">
        <NuxtLink to="/" class="header__logo">
          <img src="/img/logo.png" alt="Angie Catálogos" />
        </NuxtLink>

        <nav class="header__nav">
          <NuxtLink to="/">Inicio</NuxtLink>
          <NuxtLink to="/#catalogo">Catálogo</NuxtLink>
        </nav>

        <button
          class="cart-btn"
          aria-label="Abrir carrito"
          @click="cartOpen = true"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span v-if="itemCount" class="cart-btn__badge">{{ itemCount }}</span>
        </button>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <CartDrawer />

    <a
      class="whatsapp-float"
      href="https://wa.me/593980441321"
      target="_blank"
      rel="noopener"
      aria-label="Escríbenos por WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor">
        <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.5c1.7.9 3.6 1.4 5.8 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.9c-1.9 0-3.7-.5-5.2-1.4l-.4-.2-4.9.9.9-4.7-.2-.4c-1-1.6-1.5-3.4-1.5-5.2 0-5.4 4.4-9.9 9.9-9.9s9.9 4.4 9.9 9.9-4.5 10-10.5 11zm5.4-7.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.7-.4z" />
      </svg>
    </a>

    <footer class="footer">
      <div class="container footer__inner">
        <img src="/img/logo-white.png" alt="Angie Catálogos" class="footer__logo" />
        <p class="footer__tagline serif">Belleza que llega a tu puerta</p>
        <p>
          Machachi — Av. Fernández Salvador y L Vía Tesalia<br />
          Envíos a todo el Ecuador · 1 a 3 días hábiles
        </p>
        <div class="footer__social">
          <a href="https://www.facebook.com/catalogosdemodaecuador" target="_blank" rel="noopener">Facebook</a>
          <span>·</span>
          <a href="https://www.instagram.com/catalogosdemodaecuador/" target="_blank" rel="noopener">Instagram</a>
          <span>·</span>
          <a href="https://wa.me/593980441321" target="_blank" rel="noopener">WhatsApp</a>
        </div>
        <small>© {{ new Date().getFullYear() }} Angie Catálogos</small>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}

.topbar {
  background: var(--ink);
  color: var(--gold-light);
  text-align: center;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.45rem 1rem;
}

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(253, 250, 247, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 0.6rem;
  gap: 1rem;
}

.header__logo img {
  height: 52px;
  width: auto;
}

.header__nav {
  display: flex;
  gap: 2rem;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.header__nav a {
  position: relative;
  padding-block: 0.25rem;
}

.header__nav a::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1.5px;
  background: var(--gold);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.25s ease;
}

.header__nav a:hover::after {
  transform: scaleX(1);
}

.cart-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.cart-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.cart-btn__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding-inline: 5px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.whatsapp-float {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 60;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #25d366;
  color: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}

.whatsapp-float:hover {
  transform: scale(1.08);
}

.footer {
  background: var(--ink);
  color: #f2eaef;
  padding: 3rem 0 1.5rem;
  margin-top: 4rem;
}

.footer__inner {
  display: grid;
  gap: 0.9rem;
  justify-items: center;
  text-align: center;
}

.footer__logo {
  height: 60px;
  width: auto;
}

.footer__tagline {
  font-size: 1.4rem;
  font-style: italic;
  color: var(--gold-light);
}

.footer__social {
  display: flex;
  gap: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.footer__social span {
  color: var(--gold);
}

.footer__social a:hover {
  color: var(--gold-light);
}

small {
  opacity: 0.6;
}

@media (max-width: 620px) {
  .header__nav {
    display: none;
  }
}
</style>
