FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Heap ampliado: el build de Nuxt también supera el límite por defecto en VPS pequeños
RUN NODE_OPTIONS=--max-old-space-size=2048 pnpm build

# ── Imagen final: solo el output de Nitro ──
FROM node:22-alpine

WORKDIR /app
COPY --from=build /app/.output ./.output

ENV NITRO_HOST=0.0.0.0 NITRO_PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
