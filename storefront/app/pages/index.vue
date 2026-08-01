<script setup lang="ts">
const { public: cfg } = useRuntimeConfig()

/** Marcas de catálogo con las que trabajamos. Añade aquí las que falten. */
const MARCAS = ["Yanbal", "Cyzone", "Avon"]

const faqs = [
  {
    q: "¿Los productos son originales?",
    a: "Sí, al 100%. Trabajamos únicamente con marcas de catálogo reconocidas a nivel nacional, con años de trayectoria y altos estándares de calidad. Cada producto llega sellado y con el respaldo de su marca.",
  },
  {
    q: "¿Cuánto tardan los pedidos y cómo los recibo?",
    a: "Entre 1 y 3 días hábiles según tu ubicación en Ecuador. Hacemos envíos a todo el país y, si estás en Machachi, puedes retirar tu pedido sin costo. Te mantenemos informada en cada paso por WhatsApp.",
  },
  {
    q: "¿Puedo vender por catálogo con ustedes?",
    a: "¡Claro! No necesitas experiencia: te capacitamos paso a paso, con apoyo constante y acceso a las mejores marcas. Trabaja desde casa, a tu ritmo, y genera tus propios ingresos.",
  },
  {
    q: "¿Cómo pago mi pedido?",
    a: "Al confirmar tu pedido en la tienda coordinamos el pago contigo por WhatsApp (transferencia o contra entrega). Muy pronto también podrás pagar en línea con tarjeta.",
  },
]

useSeo({
  title: "Yanbal, Cyzone y Avon en Ecuador",
  description:
    "Perfumes, protección solar, cremas y moda de catálogo con asesoría personalizada. Marcas originales como Yanbal, Cyzone y Avon, con envío a todo Ecuador y retiro gratis en Machachi.",
})

useJsonLd({
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Angie Catálogos",
  description:
    "Venta por catálogo de perfumería, cuidado personal y moda en Ecuador.",
  url: cfg.siteUrl,
  image: `${cfg.siteUrl}/og-image.jpg`,
  logo: `${cfg.siteUrl}/img/logo.png`,
  telephone: "+593980441321",
  priceRange: "$$",
  currenciesAccepted: "USD",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Av. Fernández Salvador y L Vía Tesalia",
    addressLocality: "Machachi",
    addressRegion: "Pichincha",
    addressCountry: "EC",
  },
  areaServed: { "@type": "Country", name: "Ecuador" },
  brand: MARCAS.map((name) => ({ "@type": "Brand", name })),
  sameAs: [
    "https://www.facebook.com/catalogosdemodaecuador",
    "https://www.instagram.com/catalogosdemodaecuador/",
  ],
})

// Las preguntas frecuentes pueden salir desplegadas en el resultado de Google
useJsonLd({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
})
</script>

<template>
  <div>
    <!-- ── Hero ── -->
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__text">
          <span class="eyebrow">Venta por catálogo en Ecuador</span>
          <h1>La belleza que <em>realza</em> quién eres</h1>
          <p>
            Perfumes, protección solar, cremas y moda de las marcas de catálogo
            que ya conoces, con asesoría personalizada. Compra y ahorra — o
            emprende y gana con nosotros.
          </p>
          <div class="hero__actions">
            <NuxtLink to="/catalogo" class="btn">Descubrir el catálogo</NuxtLink>
            <a
              href="https://wa.me/593980441321"
              target="_blank"
              rel="noopener"
              class="btn btn--gold"
            >
              Asesoría por WhatsApp
            </a>
          </div>
          <ul class="hero__trust">
            <li><strong>8 años</strong><span>en el mercado</span></li>
            <li><strong>100%</strong><span>productos originales</span></li>
            <li><strong>Envío</strong><span>a todo el país</span></li>
          </ul>
        </div>
        <div class="hero__media">
          <img
            src="/img/header-bg.webp"
            alt="Angie, asesora de venta por catálogo en Machachi, Ecuador"
            width="1144"
            height="872"
            fetchpriority="high"
          />
        </div>
      </div>
    </section>

    <!-- ── Marcas con las que trabajamos ── -->
    <section class="brands">
      <div class="container brands__inner">
        <span class="brands__label">Marcas originales</span>
        <ul class="brands__list">
          <li v-for="m in MARCAS" :key="m">{{ m }}</li>
          <li class="brands__more">y más</li>
        </ul>
      </div>
    </section>

    <!-- ── Historia del negocio ── -->
    <section class="about container">
      <div class="about__intro">
        <span class="eyebrow">Nuestra historia</span>
        <h2>8 años acompañando tu estilo</h2>
        <p>
          Angie Catálogos nació del sueño de acercar productos de belleza y moda
          de verdad — originales, de calidad y a precios justos — a cada rincón
          del Ecuador. Ocho años después, seguimos atendiendo con el mismo
          cariño del primer día: asesoría personalizada, marcas confiables y
          precios altamente competitivos que hacen que la elegancia esté al
          alcance de todos.
        </p>
      </div>

      <div class="about__grid">
        <article class="value">
          <span class="value__icon">✦</span>
          <h3>Productos originales</h3>
          <p>
            Solo marcas de catálogo reconocidas, con garantía y respaldo.
            Nada de imitaciones: calidad comprobada en cada entrega.
          </p>
        </article>
        <article class="value">
          <span class="value__icon">◈</span>
          <h3>Precios competitivos</h3>
          <p>
            Compramos directo de catálogo para ofrecerte precios difíciles de
            igualar — y promociones que premian tu confianza.
          </p>
        </article>
        <article class="value">
          <span class="value__icon">✧</span>
          <h3>Asesoría personalizada</h3>
          <p>
            No vendemos por vender: te ayudamos a elegir la fragancia, el
            cuidado o la prenda perfecta para ti o para regalar.
          </p>
        </article>
        <article class="value">
          <span class="value__icon">➳</span>
          <h3>Envíos a todo Ecuador</h3>
          <p>
            Tu pedido llega en 1 a 3 días hábiles, seguro y con seguimiento.
            En Machachi, el retiro es gratis.
          </p>
        </article>
      </div>
    </section>

    <!-- ── Banda de datos ── -->
    <section class="stats">
      <div class="container stats__inner">
        <div><strong>8</strong><span>años de trayectoria</span></div>
        <div><strong>100%</strong><span>originales garantizados</span></div>
        <div><strong>1–3</strong><span>días de entrega</span></div>
        <div><strong>Gratis</strong><span>envío en Mejía</span></div>
      </div>
    </section>

    <!-- ── CTA catálogo / promos ── -->
    <section class="cta container">
      <div class="cta__card">
        <div>
          <h2>¿Lista para encontrar tu próximo favorito?</h2>
          <p>Explora por marca, filtra por categoría y precio, y pide sin salir de casa.</p>
        </div>
        <div class="cta__actions">
          <NuxtLink to="/catalogo" class="btn">Ver catálogo</NuxtLink>
          <a
            href="https://wa.me/593980441321"
            target="_blank"
            rel="noopener"
            class="btn btn--ghost"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>

    <!-- ── Emprende ── -->
    <section class="join container">
      <div class="join__text">
        <span class="eyebrow">Emprende y gana</span>
        <h2>¿Quieres generar tus propios ingresos?</h2>
        <p>
          Únete a nuestro equipo de venta por catálogo: capacitación completa,
          apoyo constante y total flexibilidad para trabajar desde casa. No
          necesitas experiencia — solo ganas de crecer.
        </p>
        <a
          href="https://wa.me/593980441321?text=Hola%2C%20quiero%20informaci%C3%B3n%20para%20unirme%20al%20equipo%20de%20venta%20por%20cat%C3%A1logo"
          target="_blank"
          rel="noopener"
          class="btn"
        >
          Quiero unirme
        </a>
      </div>
    </section>

    <!-- ── FAQ ── -->
    <section class="faq container">
      <span class="eyebrow">Preguntas frecuentes</span>
      <h2>Resolvemos tus dudas</h2>
      <details v-for="f in faqs" :key="f.q" class="faq__item">
        <summary>{{ f.q }}</summary>
        <p>{{ f.a }}</p>
      </details>
    </section>
  </div>
</template>

<style scoped>
/* ── Hero ── */
.hero {
  background:
    radial-gradient(60% 90% at 85% 20%, rgba(230, 201, 136, 0.22) 0%, transparent 60%),
    linear-gradient(150deg, var(--blush) 0%, var(--bg) 70%);
  border-bottom: 1px solid var(--line);
}

.hero__inner {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  gap: 3rem;
  padding-block: 4.5rem;
}

.hero__text h1 {
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  line-height: 1.08;
  margin: 0.9rem 0 1rem;
}

/* ── Franja de marcas ── */
.brands {
  background: var(--card);
  border-bottom: 1px solid var(--line);
}

.brands__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.9rem 2rem;
  padding-block: 1.4rem;
}

.brands__label {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}

.brands__list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem 1.75rem;
  list-style: none;
}

.brands__list li {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
}

.brands__more {
  font-style: italic;
  color: var(--muted) !important;
  font-size: 1.15rem !important;
}

@media (max-width: 560px) {
  .brands__inner {
    gap: 0.5rem;
  }

  .brands__list li {
    font-size: 1.2rem;
  }
}

.hero__text h1 em {
  color: var(--primary);
  font-style: italic;
}

.hero__text > p {
  color: var(--muted);
  font-size: 1.08rem;
  margin-bottom: 1.75rem;
  max-width: 48ch;
}

.hero__actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2.25rem;
}

.hero__trust {
  list-style: none;
  display: flex;
  gap: 2.5rem;
  flex-wrap: wrap;
}

.hero__trust li {
  display: grid;
  line-height: 1.3;
}

.hero__trust strong {
  font-family: "Cormorant Garamond", serif;
  font-size: 1.45rem;
  color: var(--primary);
}

.hero__trust span {
  color: var(--muted);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

.hero__media {
  position: relative;
  /* La foto no debe crecer sin límite en monitores anchos */
  max-width: 520px;
  width: 100%;
  justify-self: end;
}

.hero__media::before {
  content: "";
  position: absolute;
  inset: 1.25rem -1.25rem -1.25rem 1.25rem;
  border: 1px solid var(--gold-light);
  border-radius: 1.5rem;
  z-index: 0;
}

.hero__media img {
  position: relative;
  z-index: 1;
  border-radius: 1.5rem;
  box-shadow: 0 24px 60px rgba(155, 27, 96, 0.18);
}

/* ── Historia ── */
.about {
  padding-top: 4rem;
}

.about__intro {
  max-width: 640px;
  margin-bottom: 2.5rem;
}

.about__intro h2 {
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  margin: 0.4rem 0 0.9rem;
}

.about__intro p {
  color: var(--muted);
  font-size: 1.05rem;
}

.about__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.4rem;
}

.value {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.6rem 1.4rem;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.value:hover {
  transform: translateY(-4px);
  border-color: var(--gold-light);
  box-shadow: 0 14px 34px rgba(42, 30, 38, 0.1);
}

.value__icon {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 1.3rem;
  margin-bottom: 0.9rem;
}

.value h3 {
  font-size: 1.25rem;
  margin-bottom: 0.4rem;
}

.value p {
  color: var(--muted);
  font-size: 0.95rem;
}

/* ── Stats ── */
.stats {
  background: var(--ink);
  margin-top: 4rem;
  padding-block: 2.5rem;
}

.stats__inner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  text-align: center;
}

.stats strong {
  display: block;
  font-family: "Cormorant Garamond", serif;
  font-size: 2.6rem;
  color: var(--gold-light);
  line-height: 1.1;
}

.stats span {
  color: #cfc2ca;
  font-size: 0.88rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ── CTA ── */
.cta {
  padding-top: 4rem;
}

.cta__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
  background: linear-gradient(120deg, var(--primary-soft), rgba(230, 201, 136, 0.25));
  border: 1px solid var(--line);
  border-radius: 1.25rem;
  padding: 2.25rem 2.5rem;
}

.cta__card h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  margin-bottom: 0.35rem;
}

.cta__card p {
  color: var(--muted);
}

.cta__actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* ── Emprende ── */
.join {
  padding-top: 4rem;
}

.join__text {
  max-width: 620px;
}

.join h2 {
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  margin: 0.4rem 0 0.8rem;
}

.join p {
  color: var(--muted);
  margin-bottom: 1.5rem;
}

/* ── FAQ ── */
.faq {
  padding-top: 4rem;
  max-width: 760px;
}

.faq h2 {
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  margin: 0.4rem 0 1.4rem;
}

.faq__item {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.faq__item summary {
  cursor: pointer;
  padding: 1.1rem 1.3rem;
  font-weight: 700;
  list-style: none;
  position: relative;
  padding-right: 3rem;
}

.faq__item summary::-webkit-details-marker {
  display: none;
}

.faq__item summary::after {
  content: "+";
  position: absolute;
  right: 1.3rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gold);
  font-size: 1.4rem;
  transition: transform 0.2s ease;
}

.faq__item[open] summary::after {
  transform: translateY(-50%) rotate(45deg);
}

.faq__item p {
  padding: 0 1.3rem 1.2rem;
  color: var(--muted);
}

/* ── Responsive ── */

/* Portátiles y tablets en horizontal: menos aire, la foto no manda */
@media (max-width: 1024px) {
  .hero__inner {
    gap: 2rem;
    padding-block: 3.25rem;
  }

  .hero__media {
    max-width: 420px;
  }
}

/* Tablets en vertical y móviles: una sola columna, el titular primero */
@media (max-width: 820px) {
  .hero__inner {
    grid-template-columns: 1fr;
    padding-block: 2.5rem;
    gap: 2.25rem;
    text-align: center;
  }

  .hero__text > p,
  .hero__media {
    margin-inline: auto;
  }

  .hero__actions,
  .hero__trust {
    justify-content: center;
  }

  .hero__trust {
    gap: 1.5rem 2rem;
  }

  .cta__card {
    padding: 1.75rem 1.5rem;
  }
}

/* Móviles: botones a lo ancho y datos de confianza en tres columnas */
@media (max-width: 520px) {
  .hero__inner {
    padding-block: 2rem;
  }

  .hero__actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .hero__actions .btn {
    width: 100%;
    justify-content: center;
  }

  .hero__trust {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem 0.5rem;
    text-align: center;
  }

  .hero__trust strong {
    font-size: 1.2rem;
  }

  .hero__trust span {
    font-size: 0.75rem;
  }
}
</style>
