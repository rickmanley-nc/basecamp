# Self-Hosting And Backups

Last updated: 2026-08-21

Basecamp must run on a self-hosted Linux server and remain useful over a local
network without internet access.

The operator install path lives in [Deployment Guide](./deployment.md). Backup
and restore steps must be included there before the self-hosting beta milestone
can close.

## Deployment Targets

M6 beta target:

- Linux host.
- Containerized `apps/web`, `apps/server`, persistent SQLite database volume,
  persistent storage volume, reverse proxy, and backup service.
- Persistent volumes for database and evidence files.
- Local DNS name or stable LAN IP.
- Optional VPN for remote access.

Avoid mandatory SaaS dependencies for normal operation.

PostgreSQL remains the later production target. The M6 beta uses SQLite because
that is the implemented application persistence layer.

## Runtime Services

Initial services:

- Web application.
- API/sync server.
- SQLite database file in a persistent volume.
- File/object storage path for photos, evidence, documents, and exports.
- Reverse proxy.
- Backup job.

Future services:

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
- Evidence/photo/document files.
- Configuration.
- Encryption keys or documented key recovery material if added.
- Release version.
- Seed/content version.

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
- PostgreSQL adapter timing.
- Whether embedded object storage is needed after filesystem storage.
- Restore UX for non-technical users.
- Remote access guidance: VPN-first, reverse proxy, or both.
