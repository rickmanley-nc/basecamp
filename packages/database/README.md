# @basecamp/database

Database schema, migrations, seed workflow, repositories, and export/import
support for the Basecamp source of truth.

The recommended initial persistence target is PostgreSQL for the server and
SQLite-compatible snapshots for offline/mobile caches and portable exports.

M1 uses a local SQLite baseline via Node's built-in `node:sqlite` module so the
first vertical slice can run without a database server. M2 adds persisted
category pursuit overrides, quest instances, quest lifecycle events, and XP
events. M3 adds inventory, locations, assets, QR tags, kits, and maintenance.
M4 adds sync clients, command logs, and conflicts. M5 adds evidence records,
skill progress, training records, drill templates, and drill runs. M6 adds audit
events, portable JSON/CSV export/import, backup manifests, integrity checks, and
restore helpers. v0.8 adds local user accounts and bearer sessions for the cloud
pilot profile. v0.9.1 adds PostgreSQL migrations, seed import, status checks,
and portable SQLite-beta import for the production-persistence path. v0.9.2
adds runtime database selection so server and ops commands can target
PostgreSQL with `BASECAMP_DATABASE_KIND=postgresql` and
`BASECAMP_DATABASE_URL`.

## Local Seed Import

```bash
pnpm --filter @basecamp/database db:reset
```

By default this writes `var/basecamp-dev.sqlite`. Set `BASECAMP_DB_PATH` to
override the path.

## M6 Ops Commands

```bash
pnpm --filter @basecamp/database export
pnpm --filter @basecamp/database import
pnpm --filter @basecamp/database backup
pnpm --filter @basecamp/database restore
pnpm --filter @basecamp/database user:create
pnpm --filter @basecamp/database user:disable
pnpm --filter @basecamp/database postgres:migrate
pnpm --filter @basecamp/database postgres:status
pnpm --filter @basecamp/database postgres:import
pnpm --filter @basecamp/database qa:seed
pnpm --filter @basecamp/database qa:reset
```

The root aliases are:

```bash
pnpm ops:export
pnpm ops:import
pnpm ops:backup
pnpm ops:restore
pnpm ops:user:create
pnpm ops:user:disable
pnpm ops:postgres:migrate
pnpm ops:postgres:status
pnpm ops:postgres:import
pnpm ops:qa:seed
pnpm ops:qa:reset
```

The PostgreSQL commands require `BASECAMP_DATABASE_URL` or `DATABASE_URL`.
`postgres:import` also reads `BASECAMP_IMPORT_FILE`, which defaults to
`var/exports/latest/basecamp-export.json`.

Runtime-aware commands such as `ops:backup`, `ops:export`, `ops:import`,
`ops:user:create`, and `ops:user:disable` use SQLite by default and switch to
PostgreSQL when `BASECAMP_DATABASE_KIND=postgresql` is set. PostgreSQL backup
creates a Basecamp logical database snapshot; SQLite restore remains the
implemented `ops:restore` path until PostgreSQL restore-drill proof is closed.

`ops:qa:seed` and `ops:qa:reset` are runtime-aware cloud-pilot QA controls.
They require `BASECAMP_QA_CONTROLS_ENABLED=true` plus
`BASECAMP_QA_SEED_CONFIRMATION="SEED CONTENT"` or
`BASECAMP_QA_RESET_CONFIRMATION="RESET QA DATA"`. Reset preserves local users,
active sessions, seed content, and audit history, and refuses
`BASECAMP_DEPLOYMENT_PROFILE=homelab`.
