# Basecamp Roadmap

Last updated: 2026-08-21

## Source Of Truth

Basecamp planning uses GitHub for live execution:

- GitHub Milestones define delivery phases.
- GitHub Issues define the next concrete work.
- GitHub Releases mark reviewable product increments.
- Repository docs define the planning rules and seed roadmap.

The roadmap seed lives in:

- `.github/roadmap/milestones.json`
- `.github/roadmap/issues.json`
- `.github/roadmap/labels.json`

The sync script lives in:

- `scripts/sync-github-roadmap.mjs`

## Release Train

| Release | Milestone | Purpose | Exit Criteria |
| --- | --- | --- | --- |
| `v0.1.0` | M0 - Foundation | Architecture, repo skeleton, seed data, CI baseline. | Merged scaffold, docs, seed dataset, and repository check. |
| `v0.2.0` | M1 - Running Vertical Slice | First running web/server/domain/content slice. | Local app runs, seed content loads, dashboard shell appears, checks pass. |
| `v0.3.0` | M2 - Readiness And Quest Core | User-controlled progression, quests, scoring, recommendations. | Quest lifecycle, category paths, readiness score v1, capability outpost progress, deferral controls. |
| `v0.4.0` | M3 - Inventory, BOMs And Maintenance | Inventory, locations, multiple home bases, assets, BOMs, acquisition, recurring maintenance. | Location, inventory, and BOM workflows update quests and readiness. |
| `v0.5.0` | M4 - Mobile And Offline Sync | Mobile shell, Quick Capture, scanning, offline outbox, sync. | Mobile can capture field changes offline and sync them later. |
| `v0.6.0` | M5 - Drills, Skills And Validation | Drills, skill progression, evidence, validation ceilings, reports. | Validated capability outweighs owned gear in scoring. |
| `v0.7.0+` | M6 - Self-Hosting Beta | Container deployment, backups, restore, release process, security. | Linux self-hosted beta can be installed, backed up, restored, and upgraded. |
| `v1.0.0` | v1.0 - MVP Readiness | Complete MVP for real household preparedness use. | Core workflows are usable, tested, documented, and releasable. |

## Milestone Detail

### M0 - Foundation

Status: complete once `v0.1.0` is released.

Outcome:

- Basecamp repository is a real monorepo foundation.
- Product architecture exists.
- Data model exists.
- Kaizen integration strategy exists.
- Initial seed content exists.
- CI validates repository baseline.

### M1 - Running Vertical Slice

Outcome:

- The repo stops being only documentation and becomes a running system.
- Web, server, domain, content, database, and UI packages all participate.
- A developer can run the first Basecamp screen locally.

Primary work:

- Domain model package.
- Content validation.
- Framework ADRs.
- Server health and seed APIs.
- Web shell and dashboard skeleton.
- Initial `@basecamp/ui` Kaizen adapter.
- Database migration baseline.
- Seed import workflow.
- Smoke tests.

### M2 - Readiness And Quest Core

Outcome:

- Basecamp can track user-selected quests and category progress.
- It recommends options without forcing a path.
- Readiness scoring rewards validated capability more than purchases.
- Quest and category actions are persisted with an audit trail.

Primary work:

- Quest lifecycle.
- Active/backlog/snooze/pause/abandon states.
- Category paths.
- Dependency graph.
- Readiness score v1.
- Recommendation engine v1.
- XP, badges, capability outpost progress.
- Category hold/defer controls.

### M3 - Inventory, BOMs And Maintenance

Status: complete once `v0.4.0` is released.

Outcome:

- Basecamp knows what the user owns, what they need, where assets are, and what
  needs maintenance.

Primary work:

- Locations, location progression, multiple home bases, inventory, durable
  assets, kits, and QR tag data model.
- BOM and acquisition rollup.
- Maintenance policies and completion events.
- Web inventory entry.
- QR asset tag design.
- QR tag local-network behavior documented in
  [Inventory And Asset Tags](../ops/inventory-and-asset-tags.md).
- Inventory export/backup shape remains part of the self-hosting/export work in
  M6 and v1.0.

### M4 - Mobile And Offline Sync

Status: complete once `v0.5.0` is released.

Outcome:

- Mobile supports field use, scanning, Quick Capture, offline reference, and
  reliable sync back to the self-hosted server.

Primary work:

- Mobile app foundation.
- iPhone install documentation for non-developer users.
- Physical iPhone testing instructions for camera, offline, and sync behavior.
- Quick Capture command parser v1.
- Barcode and QR scanning.
- Offline read model.
- Durable command outbox.
- Sync API v1.
- Conflict policy tests.
- Physical iPhone camera, installation, Local Network, offline storage, and
  reconnect validation are documented and pending until signed TestFlight or
  stable distribution exists.

### M5 - Drills, Skills And Validation

Status: complete once `v0.6.0` is released.

Outcome:

- Basecamp can prove capability through practice, drills, evidence, and
  validation rather than inventory alone.

Primary work:

- Drill templates and drill runs.
- Follow-up quests from failed drills.
- Skill progression.
- Training records.
- Photo/evidence capture.
- Validation ceilings in scoring.
- Gap analysis reports.

M5 adds persisted drill templates and drill runs, skill training records with
expiration impact, evidence records linked to multiple entity types, readiness
ceiling reasons, and a dashboard gap report. The report separates critical
category gaps, intentional deferrals, validation gaps, acquisition gaps, and
maintenance gaps, then suggests follow-up quests.

### M6 - Self-Hosting Beta

Status: complete. `v0.7.0` delivered the beta; the `v0.7.x` patch line keeps
deployment validation and operator docs current.

Outcome:

- A capable user can run Basecamp on a Linux host and trust backups.

Primary work:

- Docker Compose deployment.
- Operator deployment guide for server/web install.
- Local-machine, clean-environment, and admin-provided server validation paths.
- Backup and restore automation.
- Release packaging.
- Security hardening.
- Health checks and observability.
- Data export/import.

M6 adds Docker Compose beta artifacts, a safe environment template, web/server
container definitions, reverse proxy config, backup and restore scripts,
portable JSON/CSV export and import, admin status/export/import/audit endpoints,
release/security artifact checks, and a deployment guide with install, backup,
restore, upgrade, rollback, remote access, and troubleshooting steps. The beta
uses SQLite in a persistent volume; PostgreSQL remains a later production
hardening target.

M6 deployment patch impact audit:

- M0 through M2 are unaffected because architecture, local vertical slice,
  readiness, quests, scoring, badges, and category progression do not depend on
  Compose env loading.
- M3 is unaffected functionally. QR and asset-tag server URLs still come from
  `BASECAMP_PUBLIC_URL`, now passed explicitly through the operator env file in
  Compose deployments.
- M4 is unaffected functionally. Mobile/server pairing still targets the
  self-hosted server URL, and the server URL now has clearer deployment
  configuration.
- M5 is unaffected functionally. Evidence, skills, drills, validation ceilings,
  and gap reports continue to use the same APIs and persistence model.
- M6 is affected operationally. Operators must pass `--env-file` on every
  Compose command; `basecamp.env` remains ignored; backups mount
  `BASECAMP_CONFIG_SOURCE` read-only so the admin config file can be included in
  backup manifests.
- v1.0 readiness should require Compose config validation with the tracked env
  example, real deployment validation on an accepted environment, and clear
  proof that backup/restore covers database, storage, and admin configuration.

### v1.0 - MVP Readiness

Outcome:

- Basecamp is useful for a real household preparedness program.
- The web app is the source of truth.
- Mobile supports practical field workflows.
- Self-hosting and backups are documented and tested.
- Server/web deployment and iPhone installation instructions are tested or
  explicitly validated for the release path.
- Validation environments are documented for release-critical workflows.

Primary work:

- MVP readiness criteria and non-goals.
- Production deployment profiles from ADR 0010: `local-dev`, `cloud-pilot` for
  v1 MVP, and post-MVP `homelab`.
- PostgreSQL production persistence path.
- Evidence/document storage abstraction with filesystem storage for the v1 cloud
  pilot and later SAN/NAS or object storage options.
- Cloud pilot deployment profile for real-user testing on the Ubuntu 24.04
  bare-metal server with real data, local disk backups, reset/seed controls, and
  logs/metrics.
- Post-MVP homelab migration constraints, including UniFi-managed LAN/DNS/routing
  and future TLS/SAN/NAS expectations.
- Production authentication and secret-management baseline using admin-created
  local username/password accounts, not SSO.
- Backup/restore proof for database, storage, and admin configuration across
  accepted deployment profiles.
- Physical iPhone testing for field data capture before v1.

## Issue Policy

Issues should be small enough to review but large enough to produce a meaningful
product increment. Each issue should include:

- Outcome.
- Scope.
- Acceptance criteria.
- Validation.
- Expected validation environment when local-only testing is not enough.
- Links to relevant architecture docs.

Issue labels should identify:

- Area, such as `area:web` or `area:sync`.
- Type, such as `type:feature` or `type:architecture`.
- Priority.
- Whether offline, accessibility, security, or testing is involved.

## Release Policy

Every release should include:

- Tag.
- Title.
- Summary.
- Included milestone.
- User-visible changes.
- Developer notes.
- Validation.
- Known limitations.
- Next milestone.

Early releases can be architecture and development releases. Public release notes
should still be clear about what is usable and what is only scaffolding.
