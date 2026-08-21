# Self-Hosting And Backups

Last updated: 2026-08-21

Basecamp must run on a self-hosted Linux server and remain useful over a local
network without internet access. The v1 MVP deployment target is a cloud pilot
server used by the admin and one trusted friend with real data. The homelab
deployment should wait until after the cloud pilot path is proven.

The operator install path lives in [Deployment Guide](./deployment.md). Backup
and restore steps must be included there before the self-hosting beta milestone
can close.

## Deployment Profiles

Basecamp separates deployment profiles from the application architecture:

- `local-dev`: contributor machine, local SQLite, fast iteration, and no
  production claims.
- `cloud-pilot`: first v1 MVP target. It is an x86_64/amd64 server running
  Ubuntu 22.04 LTS with 12 GB or 16 GB RAM. Ubuntu 22.04 LTS remains under
  standard security maintenance through May 2027. Migration to Ubuntu 24.04 LTS
  is deferred until the admin explicitly requests it. It should use real pilot
  data, admin-created username/password accounts, local disk backups,
  logs/metrics, and an explicit reset path for QA.
- `homelab`: later admin-controlled home network deployment. It is expected to
  be LAN-only at first, with UniFi handling IP assignment, hostname, DNS, and
  routing. TLS should be added when this profile is brought online or whenever
  remote access is enabled.

M6 reference adapter:

- Linux host.
- Containerized `apps/web`, `apps/server`, persistent SQLite database volume,
  persistent storage volume, reverse proxy, and backup service.
- Persistent volumes for database and evidence files.
- Local DNS name or stable LAN IP.
- Optional VPN for remote access.

Avoid mandatory SaaS dependencies for normal operation. Do not require SSO for
v1 because eventual offgrid operation must remain possible.

PostgreSQL is now represented by a production-persistence and API runtime path:
migrations, seed import, status, portable SQLite-beta import, local-user ops,
admin status, export/import, and runtime backup status can target PostgreSQL
when `BASECAMP_DATABASE_KIND=postgresql` and `BASECAMP_DATABASE_URL` are set.
SQLite remains the default local-dev and beta fallback. The v0.8 cloud pilot
foundation adds local username/password authentication. The v0.8.1 recovery
checkpoint proves cloud-pilot backup/restore for the implemented SQLite and
filesystem storage path while PostgreSQL restore-drill proof remains part of the
v1 backup/restore work.

## Runtime Services

Current M6 services:

- Web application.
- API/sync server.
- SQLite database file in a persistent volume for default local/beta mode, or
  PostgreSQL for cloud-pilot runtime mode.
- File/object storage path for photos, evidence, documents, and exports.
- Reverse proxy.
- Backup job.

Optional v1 production-persistence service:

- PostgreSQL database for production/pilot runtime.

Future services:

- Object storage adapter for cloud pilot evidence/documents.
- Background worker.
- Search index.
- Notification/reminder worker.
- Optional local AI/Quick Capture parser.

## Offline Operation

After deployment, Basecamp must not depend on external network access for:

- Web UI assets.
- CSS/fonts/icons.
- Emergency plans.
- Active quests.
- Inventory.
- Maintenance schedules.
- Critical references.
- Mobile sync once LAN connectivity is available.

## Backup Scope

Back up:

- SQLite database.
- PostgreSQL database logical snapshot when `BASECAMP_DATABASE_KIND=postgresql`
  and a database-native dump for restore safety until the PostgreSQL restore
  drill is closed.
- Local user accounts and password hashes through database backup/restore.
- Evidence/photo/document files.
- Configuration.
- Encryption keys or documented key recovery material if added.
- Release version.
- Seed/content version.
- Deployment profile and restore target notes.
- Backup manifest metadata: database kind, storage kind, config inclusion
  status, table counts, active local user count, and storage file count.

## Backup Policy

Initial policy:

- Daily local backup.
- Weekly external/off-device backup.
- Backup integrity check after creation.
- Visible warning for stale or failed backups.
- Restore drill before marking backup system complete.

For v1, cloud pilot backups may remain on local disk. Later homelab backups
should add SAN/NAS storage as a destination.

M6 backups include a manifest and checksums. v0.9.2 makes the backup command
runtime-aware: SQLite mode stores the database file, and PostgreSQL mode stores
a logical database snapshot in the backup manifest. The current commands are:

```bash
pnpm ops:backup
pnpm ops:restore
```

`pnpm ops:restore` currently restores SQLite physical backup manifests.
PostgreSQL restore proof remains a v1 backup/restore blocker; take a
database-native `pg_dump` alongside the Basecamp backup before PostgreSQL cloud
pilot upgrades or destructive validation.

## Restore Drill

A restore drill should prove:

- Database can be restored.
- Local user accounts and admin status survive restore.
- Evidence files match restored records.
- App version is compatible with restored data.
- Readiness scores can be recalculated.
- Inventory, quests, gap reports, and evidence metadata load after restore.
- Mobile clients can resync.
- Exported user data remains readable.
- Restore failure modes produce actionable messages for missing manifests,
  missing files, checksum mismatches, and non-empty restore targets.

## Data Export

Basecamp should support user-owned data export:

- JSON archive for structured data.
- CSV exports for inventory, maintenance, quests, skills, drills, evidence, and
  audit events.
- Evidence/document references in the archive manifest.
- No private host filesystem paths in evidence references. Use anonymized
  examples such as `/Users/<admin>/Evidence/...` when documentation needs to
  discuss workstation paths.
- Human-readable emergency packet for critical plans.

Ops commands:

```bash
pnpm ops:export
pnpm ops:import
pnpm ops:user:create
pnpm ops:user:disable
pnpm ops:postgres:migrate
pnpm ops:postgres:status
pnpm ops:postgres:import
pnpm ops:qa:seed
pnpm ops:qa:reset
```

QA seed/reset commands require `BASECAMP_QA_CONTROLS_ENABLED=true` and exact
confirmation environment variables. They are for disposable cloud-pilot QA data,
preserve local users and audit history, and refuse the `homelab` profile.

## Open Decisions

- Backup encryption mechanism.
- PostgreSQL restore drill proof for cloud pilot readiness.
- Whether embedded object storage is needed after filesystem storage, and what
  S3-compatible contract is required for cloud pilot.
- Restore UX for non-technical users.
- Remote access guidance: VPN-first, reverse proxy, or both.
