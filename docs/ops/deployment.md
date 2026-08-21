# Basecamp Deployment Guide

Last updated: 2026-08-21

This guide is the operator runbook for installing the Basecamp self-hosting beta
on an admin-controlled Linux host.

## Current Status

M6 adds an installable Docker Compose beta for the web app, API server,
reverse proxy, persistent SQLite database volume, persistent storage volume,
and backup service. Compose is the current reference single-node deployment
adapter, not the final production architecture.

The long-term production target remains PostgreSQL. For M6, the runnable beta
uses SQLite because that is the persistence layer implemented by the application
today. See [ADR 0009](../adr/0009-self-hosting-beta-sqlite-ops.md) and
[ADR 0010](../adr/0010-production-deployment-targets.md).

## Deployment Profiles

- `local-dev`: contributor machine, local SQLite, and fast iteration.
- `homelab`: admin-controlled home network deployment for real household data.
  This is the primary real Basecamp target.
- `cloud-pilot`: cloud server used to test with real users. It must use isolated
  pilot data, have a clear reset path, and should not depend on private homelab
  data.

The commands below document the M6 reference adapter. v1.0 readiness must prove
the underlying app, database, storage, secrets, backup, restore, and proxy
responsibilities are separable from Compose.

## Install Runbook

Prerequisites:

- Linux host with Docker Engine and the Docker Compose plugin.
- Stable LAN address or DNS name.
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
- Replace `BASECAMP_ADMIN_TOKEN` with a random secret generated outside git.
- Keep `BASECAMP_CONFIG_SOURCE=./basecamp.env` when the file lives in
  `/opt/basecamp/infra`; set it to an absolute host path such as
  `/etc/basecamp/basecamp.env` when config is stored outside the release tree.
- Keep `BASECAMP_REMOTE_ACCESS=lan` unless a VPN or secure reverse proxy is
  configured.

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
curl -H "Authorization: Bearer <admin-token>" \
  http://basecamp.local:8080/api/admin/status
```

The status response covers web, server, database, storage, migrations, backup
recency, and beta security posture.

## Backup

Backups include:

- SQLite database file.
- Evidence/photo/document storage directory.
- Configuration file when `BASECAMP_CONFIG_PATH` points at it.
- App version.
- Seed/content version.
- Manifest and checksums.

Manual backup:

```bash
cd /opt/basecamp/infra
docker compose --env-file basecamp.env run --rm backup pnpm ops:backup
```

The backup service also runs `pnpm ops:backup` on
`BASECAMP_BACKUP_INTERVAL_SECONDS`, which defaults to daily.

The backup container mounts `BASECAMP_CONFIG_SOURCE` read-only at
`/etc/basecamp/basecamp.env` and sets `BASECAMP_CONFIG_PATH` so the backup
manifest can include the admin configuration file. Do not publish that file.

Check backup status:

```bash
curl -H "x-basecamp-admin-token: <admin-token>" \
  http://basecamp.local:8080/api/admin/status
```

## Restore Drill

Run a restore drill before trusting the installation.

1. Stop services.
2. Choose a backup directory from the backup volume or host backup path.
3. Restore into an empty target.
4. Start services.
5. Confirm `/health/ready` passes.
6. Open the web app.
7. Confirm inventory, quests, evidence metadata, reports, and readiness load.

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

## Export And Import

Portable export:

```bash
BASECAMP_EXPORT_DIR=/var/backups/basecamp/export-latest pnpm ops:export
```

Portable import:

```bash
BASECAMP_IMPORT_FILE=/var/backups/basecamp/export-latest/basecamp-export.json pnpm ops:import
```

The export contains structured JSON, CSV files for major operational tables,
and evidence file references. Import validates the export version, seed/content
schema version, and checksum before replacing data.

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
proxy, TLS, admin token protection for operational endpoints, and a plan for
future user authentication.

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
- If admin endpoints return `401`, confirm the token header matches
  `BASECAMP_ADMIN_TOKEN`.
- If admin endpoints return `503`, configure `BASECAMP_ADMIN_TOKEN`.
- If import fails, confirm export version, content schema version, and checksum.

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
