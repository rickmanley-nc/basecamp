FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4317
ENV BASECAMP_APP_VERSION=0.8.0
ENV BASECAMP_DB_PATH=/var/lib/basecamp/basecamp.sqlite
ENV BASECAMP_STORAGE_DIR=/var/lib/basecamp/storage
ENV BASECAMP_BACKUP_DIR=/var/backups/basecamp

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile=false --prod=false

EXPOSE 4317

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:4317/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "--filter", "@basecamp/server", "start"]
