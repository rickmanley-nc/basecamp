# Self-Hosting And Backups

Last updated: 2026-08-20

Basecamp must run on a self-hosted Linux server and remain useful over a local
network without internet access.

## Deployment Targets

Recommended initial target:

- Linux host.
- Containerized `apps/web`, `apps/server`, PostgreSQL, and reverse proxy.
- Persistent volumes for database and evidence files.
- Local DNS name or stable LAN IP.
- Optional VPN for remote access.

Avoid mandatory SaaS dependencies for normal operation.

## Runtime Services

Initial services:

- Web application.
- API/sync server.
- PostgreSQL.
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

- PostgreSQL database.
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
- CSV exports for inventory, maintenance, quests, and scores.
- Evidence/document archive.
- Human-readable emergency packet for critical plans.

## Open Decisions

- Backup encryption mechanism.
- Whether embedded MinIO or filesystem storage is better for first release.
- Restore UX for non-technical users.
- Remote access guidance: VPN-first, reverse proxy, or both.
