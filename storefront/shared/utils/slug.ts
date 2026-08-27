/**
 * Nombre de categoría o marca convertido en trozo de URL.
 *
 * Vive en `shared/` porque lo necesitan los dos lados: las páginas para armar
 * los enlaces y el sitemap para anunciarlos. Si cada uno tuviera su copia y
 * se separaran, el sitemap acabaría publicando URLs que dan 404.
 *
 * Va sin acentos y sin eñes a propósito: la gente escribe "cuidado facial" en
 * Google, no "cuidado-facial" con tilde, y una URL con caracteres escapados
 * (%C3%B1) se ve rota cuando se comparte por WhatsApp.
 */
export const aSlug = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
