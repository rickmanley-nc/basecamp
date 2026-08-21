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

PostgreSQL remains the later production target. The M6 beta uses SQLite because
that is the implemented application persistence layer. The v0.8 cloud pilot
foundation adds local username/password authentication while keeping PostgreSQL
and clearer reset/seed controls in v1.0 readiness work.

## Runtime Services

Current M6 services:

- Web application.
- API/sync server.
- SQLite database file in a persistent volume.
- File/object storage path for photos, evidence, documents, and exports.
- Reverse proxy.
- Backup job.

Future services:

- PostgreSQL database for production/pilot.
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
- PostgreSQL database when the production adapter exists.
- Local user accounts and password hashes through database backup/restore.
- Evidence/photo/document files.
- Configuration.
- Encryption keys or documented key recovery material if added.
- Release version.
- Seed/content version.
- Deployment profile and restore target notes.

## Backup Policy

Initial policy:

- Daily local backup.
- Weekly external/off-device backup.
- Backup integrity check after creation.
- Visible warning for stale or failed backups.
- Restore drill before marking backup system complete.

For v1, cloud pilot backups may remain on local disk. Later homelab backups
should add SAN/NAS storage as a destination.

M6 backups include a manifest and checksums. The current commands are:

```bash
pnpm ops:backup
pnpm ops:restore
```

## Restore Drill

A restore drill should prove:

- Database can be restored.
- Evidence files match restored records.
- App version is compatible with restored data.
- Readiness scores can be recalculated.
- Mobile clients can resync.
- Exported user data remains readable.

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
```

## Open Decisions

- Backup encryption mechanism.
- PostgreSQL adapter timing for cloud pilot readiness.
- Whether embedded object storage is needed after filesystem storage, and what
  S3-compatible contract is required for cloud pilot.
- Cloud pilot reset/seed data controls.
- Restore UX for non-technical users.
- Remote access guidance: VPN-first, reverse proxy, or both.
