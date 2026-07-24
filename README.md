# Angie Catálogos — Ecommerce

Tienda online de productos de belleza, ropa y pijamas en Ecuador.

> El sitio estático original vive en `legacy/` (rama `legacy-static`) y sigue
> publicado en https://cescjavier7.github.io/AngieCatalogos/

## Estructura

| Carpeta | Contenido |
|---|---|
| `backend/` | API ecommerce — Medusa v2 (catálogo, carrito, checkout, pedidos, logística, admin) |
| `storefront/` | Tienda — Nuxt 3 (Vue) + configurador 3D de prendas (Three.js) |
| `docker/` | Infraestructura — Postgres, Redis, compose de desarrollo y producción |
| `legacy/` | Sitio estático original (preservado también en la rama `legacy-static`) |

## Desarrollo

```bash
# 1. Infraestructura (Postgres + Redis)
docker compose -f docker/docker-compose.dev.yml up -d

# 2. Backend Medusa (puerto 9000, admin en /app)
cd backend && pnpm install && pnpm dev

# 3. Tienda (puerto 3000)
cd storefront && pnpm install && pnpm dev
```

## Pagos

Kushki y PayPhone (Ecuador). Proveedores custom en `backend/src/modules/`.

## Despliegue

VPS DigitalOcean (Docker + Nginx). Ver `docker/` para el compose de producción.
