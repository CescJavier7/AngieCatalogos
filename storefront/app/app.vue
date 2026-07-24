<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
:root {
  --primary: #d22a8c;
  --primary-dark: #a81f6e;
  --accent: #ffc135;
  --ink: #2b2028;
  --muted: #8a7f86;
  --bg: #fffdfb;
  --card: #ffffff;
  --line: #f0e4ec;
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
  line-height: 1.6;
}

img {
  max-width: 100%;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}

.container {
  width: min(1160px, 92%);
  margin-inline: auto;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  border: none;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}

.btn:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.btn--ghost {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
}

.btn--ghost:hover {
  background: var(--primary);
  color: #fff;
}
</style>
