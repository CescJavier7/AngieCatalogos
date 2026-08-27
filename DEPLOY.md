# Despliegue — tienda.cescjavier.dev (VPS DO 2 GB · Docker + Nginx host · Cloudflare)

Dominios (el wildcard `*.cescjavier.dev` ya apunta al VPS — DNS listo):
- Tienda: **https://tienda.cescjavier.dev**
- API + admin: **https://tienda-api.cescjavier.dev** (admin en `/app`)

## 0. Preparación (una sola vez)
```bash
# Swap: recomendado con 2 GB de RAM
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Inventario: ver qué puertos/sitios ya usa el servidor (para NO chocar)
docker ps --format '{{.Names}}\t{{.Ports}}'
ss -tlnp | grep -E ':(80|443|3300|9000)\s'
grep -r server_name /etc/nginx/sites-enabled/ 2>/dev/null
```
> Si `9000` o `3300` ya están ocupados, cambiar el lado izquierdo del mapeo
> en `docker-compose.prod.yml` (p. ej. `127.0.0.1:9400:9000`) y en `nginx-angie.conf`.

## 1. Código y secretos
```bash
git clone https://github.com/CescJavier7/AngieCatalogos.git && cd AngieCatalogos/docker
cp .env.prod.template .env.prod
nano .env.prod   # POSTGRES_PASSWORD y secretos: openssl rand -hex 32 (los dominios ya vienen puestos)
```

## 2. Levantar contenedores
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker ps --format '{{.Names}}\t{{.Status}}' | grep angie-prod
```

## 3. Datos iniciales (solo la primera vez)
```bash
docker exec -it angie-prod-backend npx medusa user -e TU_CORREO -p TU_PASSWORD_ADMIN
docker exec -it angie-prod-backend npx medusa exec ./src/scripts/seed.ts

# Publishable key → pegarla en MEDUSA_PUBLISHABLE_KEY de .env.prod
docker exec angie-prod-postgres psql -U medusa -d angiecatalogos -tAc \
  "SELECT token FROM api_key WHERE type='publishable' LIMIT 1"
nano .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d storefront
```

## 4. Proxy: nada que hacer (Traefik)
El Traefik del VPS descubre los contenedores por labels (ya incluidas en el
compose): `tienda.cescjavier.dev` → storefront, `tienda-api.cescjavier.dev` →
backend, entrypoint `websecure` + `tls`, red `proxy-net` — el mismo patrón que
portfolio-frontend. HTTPS lo maneja la pareja Traefik + Cloudflare como en el
resto del servidor.

## 4.5. Pago con tarjeta (PayPhone)
Se activa por variables de entorno: sin `PAYPHONE_TOKEN` el checkout sigue
funcionando con el pago coordinado por WhatsApp y la opción de tarjeta ni
siquiera aparece.

```bash
nano .env.prod   # PAYPHONE_TOKEN, PAYPHONE_IVA y STOREFRONT_URL
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d backend

# Comprobar las credenciales sin tocar el checkout (abre un cobro de $1 de prueba)
docker exec -it angie-prod-backend npx medusa exec ./src/scripts/payphone-check.ts

# Enlazar el proveedor con la región Ecuador. El seed solo corre en una tienda
# nueva, así que en la que ya está viva ESTE es el paso que la hace aparecer
docker exec -it angie-prod-backend npx medusa exec ./src/scripts/payphone-activar.ts
```

`PAYPHONE_IVA` es el régimen del comercio: `0` para RIMPE Negocio Popular
(notas de venta, sin IVA) y `15` si los precios del catálogo ya lo incluyen.
PayPhone rechaza el cobro si el desglose no cuadra al centavo, así que ese
número tiene que reflejar la realidad tributaria, no una preferencia.

El ambiente (pruebas o producción) se elige en el panel de PayPhone Developer:
cada uno entrega su propio token. Con el de pruebas, sus tarjetas de prueba
recorren el flujo completo sin mover dinero.

## 5. Verificar
- https://tienda-api.cescjavier.dev/health → `OK`
- https://tienda-api.cescjavier.dev/app → panel admin
- https://tienda.cescjavier.dev → tienda
- Checkout → sección "Pago": debe ofrecer tarjeta. Si no sale, falta el paso 4.5

## Operación
- Actualizar: `git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
- Backup BD: `docker exec angie-prod-postgres pg_dump -U medusa angiecatalogos > backup_$(date +%F).sql`
- Logs: `docker logs -f angie-prod-backend`
