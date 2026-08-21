# Basecamp Server

The server owns API endpoints, sync, background jobs, import/export, backup
coordination, and authorization for the self-hosted Basecamp deployment.

Responsibilities:

- API-first access for web, mobile, and future automation.
- Readiness, recommendation, maintenance, sync, and evidence services.
- Database migrations and seed orchestration through `@basecamp/database`.
- Local-network availability with no mandatory SaaS dependency.
- Backup, restore, export, audit, and health endpoints.

## Local Routes

```bash
pnpm --filter @basecamp/server dev
```

- `GET /health`
- `GET /api/seed`
- `GET /api/dashboard`
- `PATCH /api/categories/:categoryId/pursuit`
- `POST /api/quests/:questId/actions`
