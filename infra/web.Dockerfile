FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @basecamp/web build

FROM nginx:1.27-alpine

COPY infra/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
