# Basecamp Tests

Cross-package integration and fixture tests live here. Package-local unit tests
should stay near the code they validate.

Core test priorities:

- Readiness and scoring correctness.
- Quest dependency and recommendation behavior.
- Sync and conflict resolution.
- Database migrations, seed data, backup, and restore.
- Accessibility and offline web/mobile workflows.

M1 includes smoke tests for seed validation, database seed import, server routes,
and the first web dashboard render. M2 adds tests for lifecycle transitions,
dependency locks, readiness ceilings, recommendation suppression, progression
node states, XP caps, badge and capability outpost progress, persistent audit
events, server mutation routes, and the readiness-core web shell.

M3 adds inventory, location maturity, BOM rollup, maintenance, QR tag, and web
dashboard tests. M4 adds Quick Capture parser, QR/barcode scan workflow, durable
outbox, conflict policy, sync persistence/API, and mobile shell tests. M5 adds
drill run success/failure tests, skill progression and expiration tests,
evidence link/version/deletion tests, validation ceiling recovery tests, gap
report section tests, persistence tests, server route tests, and web dashboard
render coverage for the gap report. M6 adds portable export/import tests,
backup/restore integrity tests, admin-token route tests, audit event tests, and
self-hosting artifact checks for Compose, proxy, persistent volumes, and safe
environment defaults. v0.9 adds PostgreSQL migration/import validation and a
PostgreSQL API runtime smoke test when `BASECAMP_DATABASE_URL` is available.
