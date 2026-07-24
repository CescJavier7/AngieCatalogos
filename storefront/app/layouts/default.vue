<template>
  <div class="site">
    <header class="header">
      <div class="container header__inner">
        <NuxtLink to="/" class="header__logo">
          <img src="/img/logo.png" alt="Angie Catálogos" />
        </NuxtLink>
        <nav class="header__nav">
          <NuxtLink to="/">Inicio</NuxtLink>
          <NuxtLink to="/#catalogo">Catálogo</NuxtLink>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <a
      class="whatsapp-float"
      href="https://wa.me/593980441321"
      target="_blank"
      rel="noopener"
      aria-label="Escríbenos por WhatsApp"
    >
      ✆
    </a>

    <footer class="footer">
      <div class="container footer__inner">
        <img src="/img/logo-white.png" alt="Angie Catálogos" class="footer__logo" />
        <p>
          Machachi — Av. Fernández Salvador y L Vía Tesalia<br />
          Envíos a todo el Ecuador · 1 a 3 días hábiles
        </p>
        <div class="footer__social">
          <a href="https://www.facebook.com/catalogosdemodaecuador" target="_blank" rel="noopener">Facebook</a>
          <a href="https://www.instagram.com/catalogosdemodaecuador/" target="_blank" rel="noopener">Instagram</a>
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

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 253, 251, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 0.6rem;
}

.header__logo img {
  height: 52px;
  width: auto;
}

.header__nav {
  display: flex;
  gap: 1.75rem;
  font-weight: 600;
}

.header__nav a:hover {
  color: var(--primary);
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
  font-size: 1.6rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}

.whatsapp-float:hover {
  transform: scale(1.08);
}

.footer {
  background: var(--ink);
  color: #f4eef2;
  padding: 2.5rem 0 1.5rem;
  margin-top: 4rem;
}

.footer__inner {
  display: grid;
  gap: 1rem;
  justify-items: center;
  text-align: center;
}

.footer__logo {
  height: 60px;
  width: auto;
}

.footer__social {
  display: flex;
  gap: 1.5rem;
  font-weight: 600;
}

.footer__social a:hover {
  color: var(--accent);
}

small {
  opacity: 0.7;
}
</style>
