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
pilot profile. PostgreSQL remains the self-hosted production target in the
architecture docs.

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
```

The root aliases are:

```bash
pnpm ops:export
pnpm ops:import
pnpm ops:backup
pnpm ops:restore
pnpm ops:user:create
pnpm ops:user:disable
```
