# Self-Hosting And Backups

Last updated: 2026-08-21

Basecamp must run on a self-hosted Linux server and remain useful over a local
network without internet access. The primary real deployment target is an
admin-controlled homelab on a home network. A separate cloud pilot target can be
used for testing with real users.

The operator install path lives in [Deployment Guide](./deployment.md). Backup
and restore steps must be included there before the self-hosting beta milestone
can close.

## Deployment Profiles

Basecamp separates deployment profiles from the application architecture:

- `local-dev`: contributor machine, local SQLite, fast iteration, and no
  production claims.
- `homelab`: admin-controlled home network deployment for real household data.
  This is the primary product target.
- `cloud-pilot`: cloud server for real-user testing with isolated pilot data,
  stronger authentication expectations, logs/metrics, and an explicit reset
  path.

M6 reference adapter:

- Linux host.
- Containerized `apps/web`, `apps/server`, persistent SQLite database volume,
  persistent storage volume, reverse proxy, and backup service.
- Persistent volumes for database and evidence files.
- Local DNS name or stable LAN IP.
- Optional VPN for remote access.

Avoid mandatory SaaS dependencies for normal homelab operation.

PostgreSQL remains the later production target. The M6 beta uses SQLite because
that is the implemented application persistence layer. The cloud pilot profile
should move PostgreSQL, stronger authentication, and clearer reset/seed controls
from later ideas into v1.0 readiness work.

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
- Human-readable emergency packet for critical plans.

M6 commands:

```bash
pnpm ops:export
pnpm ops:import
```

## Open Decisions

- Backup encryption mechanism.
- PostgreSQL adapter timing for homelab and cloud pilot readiness.
- Whether embedded object storage is needed after filesystem storage, and what
  S3-compatible contract is required for cloud pilot.
- Cloud pilot reset/seed data controls.
- Production authentication boundary for homelab and cloud pilot.
- Restore UX for non-technical users.
- Remote access guidance: VPN-first, reverse proxy, or both.
