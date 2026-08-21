# Basecamp Server

The server owns API endpoints, sync, background jobs, import/export, backup
coordination, and authorization for the self-hosted Basecamp deployment.

Responsibilities:

- API-first access for web, mobile, and future automation.
- Readiness, recommendation, maintenance, sync, and evidence services.
- Database migrations and seed orchestration through `@basecamp/database`.
- Local-network availability with no mandatory SaaS dependency.
- Backup, restore, export, audit, and health endpoints.

The server runtime defaults to the SQLite beta store through `BASECAMP_DB_PATH`.
For the v1 cloud pilot, set `BASECAMP_DATABASE_KIND=postgresql` and
`BASECAMP_DATABASE_URL` so the API server, local-user ops, admin status,
portable export/import, and runtime backup status use PostgreSQL.

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
- `POST /api/evidence/upload`
- `POST /api/skills/training`
- `POST /api/sync`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `PATCH /api/categories/:categoryId/pursuit`
- `POST /api/quests/:questId/actions`
- `GET /api/admin/status`
- `GET /api/admin/export`
- `POST /api/admin/import`
- `GET /api/admin/audit`
- `GET /api/admin/observability`
- `POST /api/admin/qa/seed`
- `POST /api/admin/qa/reset`

Cloud pilot routes use admin-created local username/password accounts when
`BASECAMP_AUTH_MODE=local`. Admin routes accept a local admin bearer session and
can also use `BASECAMP_ADMIN_TOKEN` as a fallback operational token when that
token is set to a non-placeholder value.

QA seed/reset admin routes require `BASECAMP_QA_CONTROLS_ENABLED=true`, exact
confirmation payloads, and a deployment profile other than `homelab`.
