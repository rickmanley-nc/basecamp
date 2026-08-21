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
skill progress, training records, drill templates, and drill runs. PostgreSQL
remains the self-hosted production target in the architecture docs.

## Local Seed Import

```bash
pnpm --filter @basecamp/database db:reset
```

By default this writes `var/basecamp-dev.sqlite`. Set `BASECAMP_DB_PATH` to
override the path.
