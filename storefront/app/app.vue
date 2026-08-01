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
  box-shadow: 0 10px 24px rgba(155, 27, 96, 0.25);
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
</style>
