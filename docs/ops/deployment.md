# Basecamp Deployment Guide

Last updated: 2026-08-21

This guide is the operator runbook for installing the Basecamp self-hosting beta
and cloud pilot foundation on an admin-controlled Linux host.

For the full v1 release gate, see
[Basecamp v1.0 MVP Readiness](../product/v1-mvp-readiness.md). This deployment
guide covers the server/web operator path; v1 also requires the mobile and
physical iPhone gates described there.

## Current Status

M6 added an installable Docker Compose beta for the web app, API server,
reverse proxy, persistent SQLite database volume, persistent storage volume,
and backup service. Compose is the current reference single-node deployment
adapter, not the final production architecture.

v0.8 adds the cloud pilot foundation: local username/password login,
admin-created accounts, placeholder admin token rejection, and a portable
evidence-reference boundary that does not publish host filesystem paths. The
v0.8.1 recovery checkpoint adds deployment-profile metadata to admin status,
backup manifests, and restore results, plus a restore proof for local accounts,
inventory, evidence storage, reports, and admin readiness.

v0.9.1 adds the PostgreSQL production-persistence data path: PostgreSQL
migrations, seed import, portable SQLite-beta export import, an optional Compose
`postgres` profile, and operator status checks. v0.9.2 promotes the API runtime
adapter so the server can run against PostgreSQL by setting
`BASECAMP_DATABASE_KIND=postgresql` and `BASECAMP_DATABASE_URL`. SQLite remains
the default local-dev and beta fallback. See
[ADR 0009](../adr/0009-self-hosting-beta-sqlite-ops.md) and
[ADR 0010](../adr/0010-production-deployment-targets.md).

## Deployment Profiles

- `local-dev`: contributor machine, local SQLite, and fast iteration.
- `cloud-pilot`: v1 MVP server used by the admin and one trusted friend with
  real data. The current accepted target is an x86_64/amd64 server running
  Ubuntu 22.04 LTS with 12 GB or 16 GB RAM. Ubuntu 22.04 LTS remains under
  standard security maintenance through May 2027; migration to Ubuntu 24.04 LTS
  is deferred until the admin explicitly requests it.
- `homelab`: later admin-controlled home network deployment. Expected network
  management is UniFi-provided IP assignment, hostname, DNS, and routing.

The commands below document the M6 reference adapter. v1.0 readiness must prove
the underlying app, database, storage, secrets, backup, restore, and proxy
responsibilities are separable from Compose.

Database modes:

- `sqlite`: default local-dev and beta fallback. Data lives in
  `BASECAMP_DB_PATH` and is protected by the SQLite physical backup/restore
  path.
- `postgresql`: selectable v1 cloud-pilot runtime. Data lives in PostgreSQL via
  `BASECAMP_DATABASE_URL`; migrations, seed import, status, local-user ops,
  portable export/import, admin status, and runtime backup status use the
  PostgreSQL adapter.

For v1, the cloud pilot should use admin-created local accounts with
username/password login. Do not add SSO as a required dependency because it
conflicts with eventual offgrid operation. Use real user-entered data for the
pilot; fake/demo data is only for CI, QA, and repeatable test fixtures.

If the cloud pilot is reachable outside a LAN or private network, TLS is
required before real data or passwords are used. LAN/private-network testing may
defer TLS. Homelab TLS is expected when the later homelab profile is brought
online.

## Install Runbook

Prerequisites:

- Linux host with Docker Engine and the Docker Compose plugin.
- `jq` for the curl-based status examples.
- Stable LAN/private address or DNS name for the cloud pilot.
- Admin-controlled paths for release assets, config, data, and backups.
- No secrets committed to git or published in GitHub text.

Recommended host paths:

- `/opt/basecamp` for release assets.
- `/etc/basecamp` for configuration.
- `/var/lib/basecamp` for persistent data when using bind mounts.
- `/var/backups/basecamp` for local backups when using bind mounts.

Release install:

```bash
mkdir -p /opt/basecamp /etc/basecamp /var/lib/basecamp /var/backups/basecamp
cd /opt/basecamp
cp infra/basecamp.env.example infra/basecamp.env
```

Edit `infra/basecamp.env` before startup:

- Set `BASECAMP_PUBLIC_URL` to the LAN or reverse-proxy URL.
- Set `BASECAMP_WEB_URL` to the web URL if different.
- Keep `BASECAMP_AUTH_MODE=local` for the cloud pilot.
- Keep `BASECAMP_DEPLOYMENT_PROFILE=cloud-pilot` for the v1 cloud pilot. Use
  `homelab` only after that profile is intentionally brought online later.
- Replace `BASECAMP_ADMIN_TOKEN` with a random break-glass operational secret
  generated outside git, or leave it unset in the real env file after a local
  admin account exists. The placeholder value is rejected by the server and does
  not count as configured authentication.
- Keep `BASECAMP_CONFIG_SOURCE=./basecamp.env` when the file lives in
  `/opt/basecamp/infra`; set it to an absolute host path such as
  `/etc/basecamp/basecamp.env` when config is stored outside the release tree.
- Keep `BASECAMP_REMOTE_ACCESS=lan` unless a VPN or secure reverse proxy is
  configured.
- Keep `BASECAMP_DATABASE_KIND=sqlite` for local-dev or SQLite beta review.
  For the v1 cloud pilot PostgreSQL runtime, set
  `BASECAMP_DATABASE_KIND=postgresql` and set `BASECAMP_DATABASE_URL` to the
  PostgreSQL connection string.

The real env file is intentionally ignored by git and is not loaded through a
service-level Compose `env_file` entry. Pass it explicitly with
`--env-file basecamp.env` on every Compose command. If the file lives at
`/etc/basecamp/basecamp.env`, use `--env-file /etc/basecamp/basecamp.env`
instead.

Start:

```bash
cd /opt/basecamp/infra
docker compose --env-file basecamp.env config --quiet
docker compose --env-file basecamp.env up -d --build
docker compose --env-file basecamp.env ps
```

## PostgreSQL API Runtime

The PostgreSQL path is available for cloud-pilot persistence and API runtime
validation. The default remains SQLite until the operator sets
`BASECAMP_DATABASE_KIND=postgresql`; this lets local-dev stay lightweight while
the v1 cloud pilot can use the production database target.

Operator variables:

- `BASECAMP_DATABASE_KIND`: set to `postgresql` for PostgreSQL runtime mode.
- `BASECAMP_DATABASE_URL`: PostgreSQL connection string for admin-run database
  operations and server runtime.
- `BASECAMP_POSTGRES_SSL`: `disable`, `require`, or `allow-self-signed`.
- `BASECAMP_POSTGRES_DB`, `BASECAMP_POSTGRES_USER`, and
  `BASECAMP_POSTGRES_PASSWORD`: optional Compose `postgres` profile values.

Run PostgreSQL with the reference Compose profile:

```bash
cd /opt/basecamp/infra
docker compose --profile postgres --env-file basecamp.env up -d postgres
docker compose --profile postgres --env-file basecamp.env run --rm postgres-tools pnpm ops:postgres:migrate
docker compose --profile postgres --env-file basecamp.env run --rm postgres-tools pnpm ops:postgres:status
docker compose --profile postgres --env-file basecamp.env up -d --build server web proxy backup
```

The migrate command applies the schema migrations and imports the packaged seed
content idempotently. Server startup also applies migrations and seed content
idempotently. The status command and `/api/admin/status` report
`database.kind: "postgresql"`, migration count, and table counts when the
runtime is configured for PostgreSQL.

To bridge existing SQLite beta data into PostgreSQL, create a portable export
from the SQLite deployment, then import that archive into the PostgreSQL
database:

```bash
cd /opt/basecamp/infra
mkdir -p ../var/exports/postgres-bridge
docker compose --env-file basecamp.env run --rm \
  -v "$PWD/../var/exports/postgres-bridge:/exports" \
  -e BASECAMP_EXPORT_DIR=/exports \
  server pnpm ops:export

docker compose --profile postgres --env-file basecamp.env run --rm \
  -v "$PWD/../var/exports/postgres-bridge:/imports:ro" \
  -e BASECAMP_IMPORT_FILE=/imports/basecamp-export.json \
  postgres-tools pnpm ops:postgres:import
```

Portable export/import migrates structured application data, CSV-readable
records, audit events, and evidence/document references. It rejects incompatible
content schema versions and modified archives. Local account tables and active
sessions remain deployment-local in portable exports; create admin accounts
after import, or use a proven same-runtime backup/restore path when the goal is
to preserve accounts.

Create the first admin account after the server has applied migrations. The
password must be at least 12 characters. The example uses shell prompts so the
password is not typed directly into command history:

```bash
cd /opt/basecamp/infra
read -r -p "Basecamp admin username: " BASECAMP_USER_USERNAME
read -r -p "Basecamp admin display name: " BASECAMP_USER_DISPLAY_NAME
read -r -s -p "Basecamp admin password: " BASECAMP_USER_PASSWORD
echo
export BASECAMP_USER_USERNAME BASECAMP_USER_DISPLAY_NAME BASECAMP_USER_PASSWORD
docker compose --env-file basecamp.env run --rm server pnpm ops:user:create
unset BASECAMP_USER_PASSWORD
```

The user creation command prints the created user record without the password.
If the env file lives at `/etc/basecamp/basecamp.env`, use that same path with
`--env-file` for this command. The same command targets PostgreSQL when
`BASECAMP_DATABASE_KIND=postgresql` and `BASECAMP_DATABASE_URL` are set.

To revoke a pilot user's access, set `BASECAMP_USER_USERNAME` to that username
and run:

```bash
docker compose --env-file basecamp.env run --rm server pnpm ops:user:disable
```

The disable command marks the local user disabled and revokes active sessions.

Open:

- Web: `http://basecamp.local:8080` or the configured host.
- API liveness: `/health/live`
- API readiness: `/health/ready`

## Health Checks

Compose defines health checks for:

- `server`: `/health/ready`
- `web`: static web health
- `proxy`: `/health/live` through the proxy
- `backup`: presence of a latest successful backup marker

Administrative status is available at:

```bash
BASECAMP_SESSION_TOKEN=$(curl -s \
  -H "Content-Type: application/json" \
  -d '{"username":"<admin-username>","password":"<admin-password>"}' \
  http://basecamp.local:8080/api/auth/login | jq -r .token)

curl -H "Authorization: Bearer ${BASECAMP_SESSION_TOKEN}" \
  http://basecamp.local:8080/api/admin/status
unset BASECAMP_SESSION_TOKEN
```

The status response covers web, server, database, storage, deployment profile,
backup recency, and beta security posture. It should report
`deployment.profile: "cloud-pilot"`, `localAuthMode: "local"`, and
`localUsersConfigured: true` before real pilot use.

## Backup

Backups include:

- SQLite database file, or a PostgreSQL logical database snapshot when
  `BASECAMP_DATABASE_KIND=postgresql`.
- Evidence/photo/document storage directory.
- Configuration file when `BASECAMP_CONFIG_PATH` points at it.
- App version.
- Seed/content version.
- Deployment profile, database kind, storage kind, config inclusion status,
  table counts, active local user count, and storage file count.
- Manifest and checksums.

Manual backup:

```bash
cd /opt/basecamp/infra
docker compose --env-file basecamp.env run --rm backup pnpm ops:backup
```

The backup service also runs `pnpm ops:backup` on
`BASECAMP_BACKUP_INTERVAL_SECONDS`, which defaults to daily.

In PostgreSQL mode, `pnpm ops:backup` writes a Basecamp logical database
snapshot at `database/basecamp-database.json` inside the backup directory and
records `databaseKind: "postgresql"` in both the manifest and latest backup
marker. Until the PostgreSQL restore drill is completed, also take a
database-native dump before upgrades or destructive validation:

```bash
mkdir -p /var/backups/basecamp
docker compose --profile postgres --env-file basecamp.env exec -T postgres \
  sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > /var/backups/basecamp/basecamp-postgres-$(date -u +%Y%m%dT%H%M%SZ).dump
```

The backup container mounts `BASECAMP_CONFIG_SOURCE` read-only at
`/etc/basecamp/basecamp.env` and sets `BASECAMP_CONFIG_PATH` so the backup
manifest can include the admin configuration file. Do not publish that file.

Check backup status:

```bash
curl -H "Authorization: Bearer <admin-session-token>" \
  http://basecamp.local:8080/api/admin/status
```

## Restore Drill

Run a restore drill before trusting the installation and before closing a
recovery milestone.

1. Stop services.
2. Choose a backup directory from the backup volume or host backup path.
3. Inspect `manifest.json` and confirm the expected release version,
   seed/content version, deployment profile, config inclusion, active local user
   count, and storage file count.
4. Restore into an empty target.
5. Start services.
6. Confirm `/health/ready` passes.
7. Sign in with a restored admin-created account.
8. Confirm inventory, quests, evidence metadata, evidence files, gap reports,
   readiness data, users, and `/api/admin/status` load.

Manifest inspection example:

```bash
jq '{
  appVersion,
  contentSchemaVersion,
  deployment: {
    profile: .deployment.profile,
    configIncluded: .deployment.configIncluded,
    localUserCount: .deployment.localUserCount,
    storageFileCount: .deployment.storageFileCount
  }
}' /var/backups/basecamp/<backup-directory>/manifest.json
```

Expected cloud pilot values for v0.9.2:

- `appVersion` is `0.9.2`.
- `deployment.profile` is `cloud-pilot`.
- `deployment.databaseKind` is `sqlite` for SQLite beta deployments or
  `postgresql` for the PostgreSQL runtime.
- `deployment.configIncluded` is `true` when `BASECAMP_CONFIG_SOURCE` points at
  the real admin config file.
- `deployment.localUserCount` is the active local user count and is at least 1
  after first-admin setup.
- `deployment.storageFileCount` should match the number of evidence/document
  files expected in the storage directory.

Restore failure messages are intended to be actionable:

- `Backup manifest is missing.` means the selected directory is not a complete
  backup.
- `Backup manifest is not readable` means the manifest is invalid JSON.
- `Missing backup file: ...` means the manifest references a file that is absent
  from the backup.
- `Backup checksum mismatch: ...` means a backup file changed after the manifest
  was written.
- `Restore target already exists` means the restore would overwrite an existing
  database or storage path; use a disposable empty target for drills or set
  `BASECAMP_RESTORE_OVERWRITE=true` for an intentional replacement.

Example restore command:

```bash
BASECAMP_RESTORE_BACKUP=/var/backups/basecamp/basecamp-backup-YYYY-MM-DDTHH-MM-SS-000Z \
BASECAMP_RESTORE_OVERWRITE=true \
pnpm ops:restore
```

When running through Compose, pass the same variables to the `server` image:

```bash
docker compose --env-file basecamp.env run --rm \
  -e BASECAMP_RESTORE_BACKUP=/var/backups/basecamp/<backup-directory> \
  -e BASECAMP_RESTORE_OVERWRITE=true \
  server pnpm ops:restore
```

`pnpm ops:restore` currently restores SQLite physical backup manifests. For a
PostgreSQL runtime deployment, keep the Basecamp logical backup and the
database-native `pg_dump` together, and use the PostgreSQL restore drill from
the backup/restore milestone before trusting the cloud pilot with irreplaceable
data.

## Export And Import

Portable export:

```bash
BASECAMP_EXPORT_DIR=/var/backups/basecamp/export-latest pnpm ops:export
```

Portable import:

```bash
BASECAMP_IMPORT_FILE=/var/backups/basecamp/export-latest/basecamp-export.json pnpm ops:import
```

The export contains structured JSON, CSV files for major operational tables, and
portable evidence file references. Host filesystem paths such as
`/Users/<admin>/Evidence/...`, `/home/<admin>/...`, or Windows profile paths are
not emitted into the evidence manifest. Local account tables and active sessions
are deployment-local; use backup/restore, not portable export/import, when the
goal is to preserve accounts on the same deployment profile. Export and import
commands target PostgreSQL when `BASECAMP_DATABASE_KIND=postgresql` and
`BASECAMP_DATABASE_URL` are set.

## Upgrade

Before every upgrade:

1. Read the release notes and known limitations.
2. Run a backup.
3. Verify the backup manifest.
4. Pull or copy the new release assets into `/opt/basecamp`.
5. Review `infra/basecamp.env.example` for new variables.
6. Start the new stack.
7. Confirm `/health/ready` and `/api/admin/status`.
8. Open the web app and confirm dashboard data.

Command outline:

```bash
cd /opt/basecamp/infra
docker compose --env-file basecamp.env config --quiet
docker compose --env-file basecamp.env pull
docker compose --env-file basecamp.env up -d --build
docker compose --env-file basecamp.env ps
```

Migrations run idempotently when the server starts.

## Rollback

Rollback is backup-first:

1. Stop the stack.
2. Restore the backup taken before upgrade.
3. Return the release assets to the previous version.
4. Start the stack.
5. Confirm health and dashboard state.

Do not roll back by editing the database manually.

## Remote Access

Basecamp contains sensitive preparedness data. Remote access should use:

- VPN-first access when possible.
- A secure reverse proxy with TLS when VPN is not practical.
- LAN-only operation for the simplest beta deployment.

Do not expose the beta directly to the public internet without a secure reverse
proxy, TLS, local username/password authentication, and admin protection for
operational endpoints.

## Separate Server Testing

If the admin provides access to a separate server, collect:

- Linux distribution and version.
- CPU architecture.
- Available memory and disk.
- LAN address or DNS name.
- SSH access method and whether `sudo` is available.
- Whether Docker Engine and Compose are installed.
- Desired data and backup paths.
- Remote access stance: LAN-only, VPN, or secure reverse proxy.
- Whether test data can be destroyed after validation.

Validation should report:

- Whether validation ran locally, in a clean local environment, or on a separate
  server.
- Which release version was installed.
- Which health checks passed.
- Whether backup and restore drill succeeded.
- Any rollback or cleanup performed.

Do not publish credentials, private host details, tokens, or private keys in
issues, pull requests, releases, comments, or tracked files.

## Troubleshooting

- If `server` is unhealthy, inspect `docker compose --env-file basecamp.env logs
  server` and confirm the database and storage volumes are writable.
- If `proxy` is unhealthy, confirm `server` and `web` are healthy first.
- If backup status is missing, run a manual backup and recheck
  `/api/admin/status`.
- If normal API routes return `401`, sign in with a local username/password
  account.
- If login fails for the first admin, rerun `pnpm ops:user:create` with a new
  username or restore a backup containing the account.
- If a pilot user should lose access, run `pnpm ops:user:disable` for that
  username.
- If admin endpoints return `401`, sign in as a local admin or confirm the
  fallback token header matches `BASECAMP_ADMIN_TOKEN`.
- If admin endpoints return `503`, create a local admin user or configure a
  non-placeholder `BASECAMP_ADMIN_TOKEN`.
- If import fails, confirm export version, content schema version, and checksum.
- If PostgreSQL mode cannot start, confirm `BASECAMP_DATABASE_KIND=postgresql`,
  `BASECAMP_DATABASE_URL`, and `BASECAMP_POSTGRES_SSL`, then run
  `pnpm ops:postgres:status` against the same database.

## Local Preview

Development preview still works without Docker:

```bash
pnpm install
pnpm --filter @basecamp/database db:reset
pnpm --filter @basecamp/server dev
pnpm --filter @basecamp/web dev
```

Local URLs:

- Server: `http://127.0.0.1:4317`
- Web: `http://127.0.0.1:4318`
