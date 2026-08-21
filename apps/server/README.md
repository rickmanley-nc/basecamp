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
- `GET /health/live`
- `GET /health/ready`
- `GET /api/seed`
- `GET /api/dashboard`
- `GET /api/inventory`
- `GET /api/reports/gaps`
- `POST /api/inventory/quick-entry`
- `GET /api/assets/:assetId`
- `POST /api/assets/:assetId/tags`
- `POST /api/maintenance/policies`
- `POST /api/maintenance/:policyId/completions`
- `GET /api/drills/templates`
- `POST /api/drills/:templateId/runs`
- `POST /api/evidence`
- `POST /api/skills/training`
- `POST /api/sync`
- `PATCH /api/categories/:categoryId/pursuit`
- `POST /api/quests/:questId/actions`
- `GET /api/admin/status`
- `GET /api/admin/export`
- `POST /api/admin/import`
- `GET /api/admin/audit`

M6 admin routes require `BASECAMP_ADMIN_TOKEN` and either the
`x-basecamp-admin-token` header or `Authorization: Bearer <token>`.
