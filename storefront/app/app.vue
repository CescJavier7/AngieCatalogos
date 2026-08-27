<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/*
  Paleta "belleza elegante":
  - Berry profundo: hereda el rosa de la marca, madurado hacia el lujo.
  - Oro champán: acento de exclusividad (nunca amarillo brillante).
  - Marfil cálido: fondo suave que evoca piel y cosmética.
  - Ciruela oscura: tinta cálida, más sofisticada que el negro puro.
*/
:root {
  --primary: #9b1b60;
  --primary-dark: #7d154d;
  --primary-soft: #f6e3ee;
  --gold: #b98a2f;
  --gold-light: #e6c988;
  --ink: #2a1e26;
  --muted: #8d7f88;
  --bg: #fdfaf7;
  --blush: #f9eef4;
  --card: #ffffff;
  --line: #eadfe6;
  --success: #1f8a5b;

  /*
    Sombras en escalera. Todas tiradas del color de la tinta y no de negro
    puro: sobre un fondo marfil el gris azulado ensucia, el ciruela no.
  */
  --sombra-sutil: 0 1px 2px rgba(42, 30, 38, 0.05);
  --sombra-card: 0 2px 4px rgba(42, 30, 38, 0.04), 0 12px 28px rgba(42, 30, 38, 0.07);
  --sombra-alta: 0 8px 16px rgba(42, 30, 38, 0.07), 0 24px 56px rgba(42, 30, 38, 0.13);

  /* Radios con nombre: los números sueltos se desalinean solos con el tiempo */
  --radio-xs: 0.5rem;
  --radio-sm: 0.7rem;
  --radio-md: 1rem;
  --radio-lg: 1.4rem;
  --radio-full: 999px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: "Urbanist", "Segoe UI", system-ui, -apple-system, sans-serif;
  color: var(--ink);
  background: var(--bg);
  line-height: 1.65;
}

h1,
h2,
h3,
.serif {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-weight: 600;
  letter-spacing: 0.01em;
  /* La Cormorant es de trazo fino y alto: apretada se lee mucho mejor */
  line-height: 1.15;
  text-wrap: balance;
}

/* Los párrafos cortan mejor por sentido que por ancho exacto */
p {
  text-wrap: pretty;
}

img {
  max-width: 100%;
  /* Imprescindible junto a max-width: sin esto, un width/height en el HTML
     deja la altura fija y la imagen se estira al encogerse el ancho. */
  height: auto;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
}

.container {
  width: min(1160px, 92%);
  margin-inline: auto;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.9rem;
  border: 1px solid var(--primary);
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease,
    box-shadow 0.2s ease;
}

.btn:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(155, 27, 96, 0.22);
}

/* Al presionar vuelve a su sitio: sin esto el botón se siente pegajoso */
.btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 10px rgba(155, 27, 96, 0.2);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn--ghost {
  background: transparent;
  color: var(--primary);
}

.btn--ghost:hover {
  background: var(--primary);
  color: #fff;
}

.btn--gold {
  background: transparent;
  border-color: var(--gold);
  color: var(--gold);
}

.btn--gold:hover {
  background: var(--gold);
  border-color: var(--gold);
  color: #fff;
  box-shadow: 0 10px 24px rgba(185, 138, 47, 0.25);
}

/* Etiqueta pequeña en mayúsculas — recurso editorial */
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--gold);
}

.eyebrow::before {
  content: "";
  width: 28px;
  height: 1px;
  background: var(--gold);
}

input,
select {
  font-family: inherit;
  font-size: 1rem;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  padding: 0.75rem 0.9rem;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(155, 27, 96, 0.12);
}

/*
  Foco visible para quien navega con teclado. Va con :focus-visible y no con
  :focus para que el anillo no salte al hacer clic con el ratón, que es lo
  que llevó a tanta gente a apagarlo del todo.
*/
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
  border-radius: var(--radio-xs);
}

::selection {
  background: var(--primary-soft);
  color: var(--primary-dark);
}

/* Nada de deslizamientos ni saltos suaves para quien pidió lo contrario */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
