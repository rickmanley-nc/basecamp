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
and the first web dashboard render.
