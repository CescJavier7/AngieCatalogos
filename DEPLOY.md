# Despliegue en el VPS (DigitalOcean 2 GB · Docker + Nginx del host)

## Requisitos previos
1. **Dominio** con DNS apuntando al VPS (`198.211.103.147`):
   - `A  @    → 198.211.103.147` (tienda)
   - `A  api  → 198.211.103.147` (API + admin)
2. Swap recomendado en 2 GB de RAM (una vez):
   ```bash
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

## Pasos
```bash
# 1. Código
git clone https://github.com/CescJavier7/AngieCatalogos.git && cd AngieCatalogos/docker

# 2. Secretos
cp .env.prod.template .env.prod
nano .env.prod          # dominios + passwords (openssl rand -hex 32)

# 3. Levantar (primera vez tarda: compila las imágenes)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Datos iniciales (solo la primera vez)
docker exec -it angie-prod-backend npx medusa user -e TU_CORREO -p TU_PASSWORD_ADMIN
docker exec -it angie-prod-backend npx medusa exec ./src/scripts/seed.ts

# 5. Publishable key → .env.prod
docker exec angie-prod-postgres psql -U medusa -d angiecatalogos -tAc \
  "SELECT token FROM api_key WHERE type='publishable' LIMIT 1"
nano .env.prod          # pegar en MEDUSA_PUBLISHABLE_KEY
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d storefront

# 6. Nginx del host + HTTPS
cp nginx-angie.conf /etc/nginx/sites-available/angie   # editar TU_DOMINIO
ln -s /etc/nginx/sites-available/angie /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d TU_DOMINIO -d api.TU_DOMINIO
```

## Verificación
- `https://TU_DOMINIO` → tienda
- `https://api.TU_DOMINIO/health` → `OK`
- `https://api.TU_DOMINIO/app` → panel admin

## Notas
- Postgres/Redis **no exponen puertos**: no chocan con los otros contenedores del VPS.
- La tienda usa el puerto local **3300** (por si el 3000 está ocupado por otro proyecto).
- Actualizar la app: `git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
- Backup de la base: `docker exec angie-prod-postgres pg_dump -U medusa angiecatalogos > backup_$(date +%F).sql`
