# Basecamp v1.0 MVP Readiness

Last updated: 2026-08-21

This checklist defines when Basecamp is ready to be called a v1 MVP for real
household preparedness use. It is intentionally stricter than "the app runs":
v1 must be installable, recoverable, usable from an iPhone in the field, and
clear about what is still post-MVP.

## Release Decision

Basecamp v1.0 may ship only when every must-pass gate below is complete, or when
the release notes explicitly say the release candidate failed and v1 is not
being shipped.

Deferring a must-pass gate requires a new milestone before `v1.0.0`; do not hide
v1 blockers in known limitations.

## Must-Pass Gates

### Web Workflows

- Dashboard loads after sign-in and shows readiness score, categories, active
  quests, recommendations, inventory summary, maintenance, recent activity, and
  gap report entry points.
- Category pursuit controls support active, interested, later, paused, and not
  currently pursuing states without forcing a single path.
- Quest actions support start, complete, reopen, pause, snooze, abandon, and
  audit-friendly persistence.
- Quick inventory entry supports item, quantity, unit, location, expiration
  where relevant, category, type, and notes.
- User-named locations can progress from known place toward stash, outpost,
  basecamp, and home base, including multiple home bases.
- Asset, kit, QR tag, and maintenance workflows remain usable from the web app.
- Drill, skill, evidence, and gap-report workflows persist data and recalculate
  readiness.
- Admin status, export, import, audit, local user creation, local user disable,
  backup, and restore remain documented and tested.

### Mobile And iPhone Field Use

- A normal pilot user can install Basecamp Mobile through TestFlight or another
  documented Apple-supported path without Xcode.
- The iPhone app can connect to the cloud pilot server by manual URL entry or a
  documented pairing flow.
- The iPhone app signs in with the v1 local username/password model; required
  SSO is not allowed.
- Home, Capture, Scan, Quests, Inventory, and Offline screens exist as native
  mobile screens, not only a TypeScript shell preview.
- Quick Capture can create confirmable field commands for inventory,
  maintenance, drills, skills, failures, and quest progress.
- Barcode and Basecamp QR scans work with Camera permission on a physical
  iPhone.
- Evidence photo/document capture stores deployment-owned evidence bytes and
  syncs metadata without exposing private device or workstation paths.
- Offline read data includes active quests, inventory, critical BOMs,
  maintenance, and references after first sync.
- Offline command outbox survives app restart and reconnects to the server.
- Reconnect sync either applies queued commands idempotently or shows
  user-visible conflicts.

### Server, Database, And Storage

- The v1 cloud pilot target is an x86_64/amd64 Ubuntu 22.04 LTS server with 12
  GB or 16 GB RAM. Ubuntu 22.04 LTS is accepted for v1 while it remains in
  standard security maintenance through May 2027.
- Ubuntu 24.04 LTS migration remains deferred until the admin explicitly
  requests it.
- PostgreSQL production persistence is implemented or the release is held before
  `v1.0.0`. The v0.9.x migration/import validation path is not enough by itself
  unless the API runtime adapter is promoted or the release notes explicitly
  hold v1.
- SQLite beta data has a tested or documented migration bridge using portable
  export/import when direct migration is not available.
- Filesystem evidence/document storage is acceptable for the v1 cloud pilot if
  backup/restore covers metadata and bytes. S3-compatible object storage remains
  a future adapter unless the cloud pilot requires it.
- Database, storage, secrets, backups, restore, and reverse proxy
  responsibilities are not defined only inside Docker Compose.
- Compose remains acceptable as the single-node reference adapter when the
  release also documents the underlying production responsibilities.

### Deployment And Operations

- Deployment profiles are documented and reported as `local-dev`,
  `cloud-pilot`, post-MVP `homelab`, or `unknown`.
- `cloud-pilot` is the v1 MVP profile. It uses real pilot data for the admin and
  one trusted friend.
- `homelab` remains post-MVP and must not block v1. It keeps the expected
  UniFi-managed IP assignment, hostname, DNS, routing, LAN-only start, future
  TLS, future SAN/NAS backups, and future Ubuntu 24.04 migration visible.
- Cloud pilot setup, upgrade, rollback, backup, restore, first-admin account
  creation, user disable, and troubleshooting instructions are followable from a
  clean server.
- Cloud pilot reset/seed controls exist for QA without mixing pilot data with
  future homelab data.
- Operational status exposes version, deployment profile, database, storage,
  backup recency, local auth posture, and placeholder-token posture.
- If the cloud pilot is reachable outside a LAN or private network, TLS is
  required before real data or passwords are used.

### Backup, Restore, Export, And Privacy

- Backup manifests include database, evidence/document storage entries, config
  inclusion, release version, seed/content version, deployment profile, database
  kind, storage kind, table counts, active local user count, storage file count,
  and checksums.
- Restore drill on the cloud pilot profile proves local users, inventory,
  evidence metadata, evidence file bytes, reports, readiness data, and admin
  status.
- Restore failure modes are actionable for missing manifests, invalid manifests,
  missing files, checksum mismatches, and non-empty restore targets.
- Portable export/import covers structured JSON, major CSV exports, evidence
  references, and version compatibility.
- Public repo text, issue comments, PRs, releases, and docs must not include
  private workstation paths, hostnames, tokens, passwords, private IPs, or
  pairing secrets.
- Documentation examples that need host paths must use anonymized placeholders
  such as `/Users/<admin>/Evidence/...`.

### Content And Readiness Rules

- Seed content validation passes for categories, levels, quests, dependencies,
  badges, capability outposts, and milestones.
- Readiness scoring remains explainable and distinguishes owned, configured,
  tested, practiced, validated, maintained, failed, expired, and deferred states.
- Purchase-only progress cannot create a misleading high readiness score.
- Skills, drills, evidence, maintenance, and validation ceilings influence
  readiness and reports.
- Content coverage includes enough starter quests for water, food, power,
  communications, evacuation, medical, navigation, inventory, maintenance,
  drills, and cross-category validation to make the MVP useful.

## Validation Matrix

| Environment | Required For v1 | Evidence To Record |
| --- | --- | --- |
| Local machine | Unit tests, type checks, content validation, privacy scan, local app smoke checks. | Commands run and pass/fail result. |
| Clean local environment | Fresh checkout, clean database, Compose config validation, disposable restore target. | Install or restore notes and cleanup notes. |
| Cloud pilot | Server/web deployment, PostgreSQL path, real-user auth, backup/restore, upgrade/rollback, reset controls. | Deployment profile, release version, OS target, validation commands, and cleanup. |
| Separate server | Accepted substitute for cloud pilot only when the admin explicitly points it at v1 validation. | Same as cloud pilot, plus why it is accepted. |
| Simulator | Mobile layout, navigation, pure TypeScript logic, and non-camera smoke checks. | Simulator/device target and scope limits. |
| Physical iPhone | TestFlight or stable install, Local Network, Camera, Photos, offline storage, scan, field capture, reconnect sync. | iOS version, app build, server URL mode, pass/fail notes, and screenshots when useful. |
| CI | Repository checks on every PR and release candidate. | GitHub Actions run link. |

## Open v1 Blockers

The v1.0 milestone should remain open until these blockers are complete:

- PostgreSQL API runtime adapter promotion and cloud-pilot validation.
- Installable iPhone beta distribution path.
- Mobile field data capture, offline sync, and evidence upload.
- Physical iPhone field validation.
- Cloud pilot reset, seed, and observability controls.
- Final v1 release-candidate validation and release notes.

## Non-Goals For v1.0

- Required SSO.
- Homelab deployment.
- Kubernetes.
- High availability.
- Public internet exposure without TLS.
- Mandatory managed cloud services.
- Mandatory S3-compatible object storage unless the cloud pilot requires it.
- Ubuntu 24.04 migration before the admin requests it.
- App Store public release if TestFlight is sufficient for the v1 pilot.
