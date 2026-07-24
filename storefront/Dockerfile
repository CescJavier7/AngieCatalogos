FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── Imagen final: solo el output de Nitro ──
FROM node:22-alpine

WORKDIR /app
COPY --from=build /app/.output ./.output

ENV NITRO_HOST=0.0.0.0 NITRO_PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
