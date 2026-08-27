<script setup lang="ts">
const { itemCount, cartOpen, refresh } = useCart()
const { data: menu } = useCatalogoMenu()
const route = useRoute()

/**
 * El menú del catálogo es uno solo para las dos formas: colgando del
 * encabezado en escritorio y como hoja a lo ancho en móvil. Un único estado
 * evita que se abran los dos a la vez al cambiar el tamaño de la ventana.
 */
const menuAbierto = ref(false)
const cerrarMenu = () => (menuAbierto.value = false)

// Navegar cierra el menú: quedarse abierto sobre la página nueva desorienta
watch(() => route.fullPath, cerrarMenu)

// Con el menú abierto el fondo no se desplaza, igual que en la hoja de filtros
watch(menuAbierto, (abierto) => {
  if (import.meta.client) {
    document.body.style.overflow = abierto ? "hidden" : ""
  }
})
onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ""
})

const alTeclado = (e: KeyboardEvent) => {
  if (e.key === "Escape") cerrarMenu()
}

onMounted(() => {
  refresh()
  window.addEventListener("keydown", alTeclado)
})
onUnmounted(() => window.removeEventListener("keydown", alTeclado))

/** Enlace del catálogo con un filtro ya puesto. */
const filtro = (clave: string, valor: string) => ({
  path: "/catalogo",
  query: { [clave]: valor },
})
</script>

<template>
  <div class="site">
    <div class="topbar">
      <span>Envío gratis en Mejía</span>
      <i>·</i>
      <span>Pichincha $3</span>
      <i>·</i>
      <span>Resto del país $6</span>
      <i>·</i>
      <span>Retiro gratis en Machachi</span>
    </div>

    <header class="header">
      <div class="container header__inner">
        <NuxtLink to="/" class="header__logo">
          <img src="/img/logo.png" alt="Angie Catálogos" />
        </NuxtLink>

        <nav class="header__nav">
          <NuxtLink to="/" class="navlink">Inicio</NuxtLink>

          <button
            class="navlink navlink--menu"
            :class="{ 'navlink--open': menuAbierto }"
            type="button"
            aria-haspopup="true"
            :aria-expanded="menuAbierto"
            @click="menuAbierto = !menuAbierto"
          >
            Catálogo
            <svg class="navlink__chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <NuxtLink to="/cuenta/amigas" class="navlink">Invita y gana</NuxtLink>
        </nav>

        <div class="header__actions">
          <!-- En móvil el menú de texto no cabe: este botón abre lo mismo -->
          <button
            class="shop-btn"
            type="button"
            aria-haspopup="true"
            :aria-expanded="menuAbierto"
            @click="menuAbierto = !menuAbierto"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9h18l-1.5 11a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8Z" />
              <path d="M8 9V6.5a4 4 0 0 1 8 0V9" />
            </svg>
            <span>Comprar</span>
          </button>

          <NuxtLink to="/cuenta" class="icon-btn" aria-label="Mi cuenta">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
          </NuxtLink>

          <button
            class="icon-btn"
            type="button"
            aria-label="Abrir carrito"
            @click="cartOpen = true"
          >
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span v-if="itemCount" class="icon-btn__badge">{{ itemCount }}</span>
          </button>
        </div>
      </div>

      <!-- Panel del catálogo: lo que hay para comprar, dicho con todas sus letras -->
      <Transition name="menu">
        <div v-if="menuAbierto" class="menu">
          <div class="container menu__inner">
            <NuxtLink to="/catalogo" class="menu__hero">
              <span class="menu__hero-eyebrow">Tienda en línea</span>
              <strong>Ver todo el catálogo</strong>
              <small>
                Compra directo con tarjeta o coordina por WhatsApp. Envíos a
                todo el Ecuador y retiro gratis en Machachi.
              </small>
              <span class="menu__hero-cta">Entrar a comprar →</span>
            </NuxtLink>

            <div v-if="menu?.tipos?.length" class="menu__group">
              <h3>Comprar por producto</h3>
              <ul>
                <li v-for="t in menu.tipos" :key="t">
                  <NuxtLink :to="filtro('tipo', t)">{{ t }}</NuxtLink>
                </li>
              </ul>
            </div>

            <div class="menu__group">
              <h3>Para quién</h3>
              <ul>
                <li v-for="a in menu?.publico ?? []" :key="a">
                  <NuxtLink :to="filtro('publico', a)">{{ a }}</NuxtLink>
                </li>
                <li>
                  <NuxtLink :to="{ path: '/catalogo', query: { promo: '1' } }" class="menu__destacado">
                    Ofertas del mes
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink :to="{ path: '/catalogo', query: { favoritos: '1' } }">
                    Mis favoritos
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Transition>
    </header>

    <!-- Cierra al tocar fuera, sin robarle el clic al propio panel -->
    <Transition name="fade">
      <div v-if="menuAbierto" class="menu__velo" @click="cerrarMenu" />
    </Transition>

    <main>
      <slot />
    </main>

    <CartDrawer />
    <PromoEnvios />

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
        <nav class="footer__legal">
          <NuxtLink to="/terminos">Términos y Condiciones</NuxtLink>
          <span>·</span>
          <NuxtLink to="/privacidad">Política de Privacidad</NuxtLink>
        </nav>
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
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--ink);
  color: var(--gold-light);
  text-align: center;
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.5rem 1rem;
}

.topbar i {
  color: var(--gold);
  font-style: normal;
  opacity: 0.7;
}

.header {
  position: sticky;
  top: 0;
  z-index: 60;
  background: rgba(253, 250, 247, 0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 0.65rem;
  gap: 1rem;
}

.header__logo img {
  height: 52px;
  width: auto;
}

.header__nav {
  display: flex;
  align-items: center;
  gap: 2.1rem;
}

.navlink {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding-block: 0.3rem;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.86rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.navlink::after {
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

.navlink:hover::after,
.navlink--open::after {
  transform: scaleX(1);
}

.navlink__chevron {
  transition: transform 0.25s ease;
}

.navlink--open .navlink__chevron {
  transform: rotate(180deg);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

/* Solo aparece cuando se oculta el menú de texto */
.shop-btn {
  display: none;
  align-items: center;
  gap: 0.4rem;
  height: 44px;
  padding-inline: 1rem;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.shop-btn:hover {
  background: var(--primary-dark);
}

.icon-btn {
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
  transition: border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.icon-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: 0 4px 14px rgba(155, 27, 96, 0.12);
}

.icon-btn__badge {
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

/* ── Panel del catálogo ── */
.menu {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: var(--card);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 24px 48px rgba(42, 30, 38, 0.13);
  max-height: calc(100vh - 100%);
  overflow-y: auto;
}

.menu__inner {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr;
  gap: 2.5rem;
  padding-block: 2rem 2.25rem;
}

.menu__hero {
  display: grid;
  align-content: start;
  gap: 0.45rem;
  padding: 1.4rem;
  border-radius: 1rem;
  background: linear-gradient(150deg, var(--blush), var(--primary-soft));
  border: 1px solid var(--line);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.menu__hero:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(155, 27, 96, 0.14);
}

.menu__hero-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--gold);
}

.menu__hero strong {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.15;
}

.menu__hero small {
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.55;
}

.menu__hero-cta {
  margin-top: 0.35rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--primary);
}

.menu__group h3 {
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.85rem;
}

.menu__group ul {
  list-style: none;
  display: grid;
  gap: 0.15rem;
}

.menu__group a {
  display: block;
  padding: 0.4rem 0.6rem;
  margin-left: -0.6rem;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  transition: background 0.15s ease, color 0.15s ease;
}

.menu__group a:hover {
  background: var(--blush);
  color: var(--primary);
}

.menu__destacado {
  color: var(--primary);
  font-weight: 700;
}

.menu__velo {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: rgba(42, 30, 38, 0.28);
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Quien pidió menos movimiento no debería recibir deslizamientos */
@media (prefers-reduced-motion: reduce) {
  .menu-enter-active,
  .menu-leave-active,
  .fade-enter-active,
  .fade-leave-active,
  .navlink__chevron,
  .menu__hero {
    transition: none;
  }

  .menu-enter-from,
  .menu-leave-to {
    transform: none;
  }
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

.footer__legal {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 0.82rem;
  opacity: 0.75;
}

.footer__legal a:hover {
  color: var(--gold-light);
}

.footer__legal span {
  color: var(--gold);
}

small {
  opacity: 0.6;
}

/* El panel a dos columnas antes de que se apriete */
@media (max-width: 1000px) {
  .menu__inner {
    grid-template-columns: 1fr 1fr;
    gap: 1.75rem;
  }

  .menu__hero {
    grid-column: 1 / -1;
  }
}

/* Tablets, iPads y móviles: el menú de texto estorba, manda el botón */
@media (max-width: 900px) {
  .header__nav {
    display: none;
  }

  .shop-btn {
    display: inline-flex;
  }

  .topbar {
    font-size: 0.68rem;
    letter-spacing: 0.1em;
  }
}

@media (max-width: 560px) {
  .menu__inner {
    grid-template-columns: 1fr;
    gap: 1.4rem;
    padding-block: 1.4rem 1.75rem;
  }

  .header__logo img {
    height: 44px;
  }
}

@media (max-width: 380px) {
  .shop-btn span {
    display: none;
  }

  .shop-btn {
    padding-inline: 0.8rem;
  }
}
</style>
