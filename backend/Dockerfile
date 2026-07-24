FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate && apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 9000

# Migra la base y arranca (API + panel admin en /app)
CMD ["sh", "-c", "npx medusa db:migrate && pnpm start"]
