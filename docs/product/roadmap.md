# Basecamp Roadmap

Last updated: 2026-08-22

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
| `v0.8.0` | M7 - Cloud Pilot Foundation | Cloud pilot profile, local auth, evidence storage portability, first real-user controls. | The accepted cloud pilot target can run with local accounts, portable evidence metadata, and documented operator controls. |
| `v0.8.1` | M8 - Recovery And Homelab Boundary | Backup/restore proof, deployment-profile metadata, and homelab deferral clarity. | Cloud pilot restore can prove real data, users, evidence, reports, admin status, and recoverable failure modes. |
| `v0.9.0` | M9 - MVP Readiness Gate | v1 release criteria, validation matrix, non-goals, and remaining blocker issue map. | The v1 MVP gate is explicit enough that work can proceed without asking what comes next. |
| `v0.9.1` | M10 - PostgreSQL Production Persistence Path | PostgreSQL migration, seed, status, and portable SQLite import bridge. | The production-persistence data path is validated and the remaining runtime blocker is explicit. |
| `v0.9.2` | M11 - PostgreSQL API Runtime | Selectable PostgreSQL API runtime, local-user ops, admin status, export/import, runtime backup status, and CI smoke validation. | The API server can run the cloud-pilot path against PostgreSQL. |
| `v1.0.0` | v1.0 - MVP Readiness | Complete MVP for real household preparedness use. | Core workflows are usable, tested, documented, and releasable. |
| `v1.1.0` | v1.1 - Android Mobile | Post-launch Android app build, install, and field validation. | Android is locally built, installed on a physical device, and validated against the v1 mobile workflows. |

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
  reliable sync back to the self-hosted server while allowing a local-first
  mobile start before sync is configured.

Primary work:

- Mobile app foundation.
- Mobile build/install documentation for iPhone, with Android explicitly
  deferred to a post-v1 milestone.
- Physical iPhone testing instructions for camera, offline, and sync behavior.
- Quick Capture command parser v1.
- Barcode and QR scanning.
- Offline read model.
- Durable command outbox.
- Sync API v1.
- Conflict policy tests.
- Offline cached-data validation surface and evidence retry controls for
  physical iPhone field testing.
- Physical iPhone camera, installation, first-run local quest, Local Network,
  offline storage, and reconnect validation are documented. Android validation
  is tracked post-v1.

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

### M7 - Cloud Pilot Foundation

Status: complete. `v0.8.0` delivered the cloud pilot foundation; remaining
production hardening stays in the v1.0 readiness milestone.

Outcome:

- Basecamp can run on the accepted cloud pilot target with real pilot users,
  local username/password accounts, and no required SSO.
- Evidence metadata is portable and does not expose private workstation paths in
  exports or public documentation.
- Admin runbooks explain first-user setup, user revocation, backup expectations,
  and the current SQLite boundary.

Primary work:

- Cloud pilot deployment profile for an x86_64/amd64 Ubuntu 22.04 LTS host with
  12 GB or 16 GB RAM.
- Local account table, password hashing, bearer sessions, login/logout routes,
  and web sign-in.
- Operator commands for creating and disabling local users.
- Placeholder admin-token rejection and fallback admin-token documentation.
- Evidence `storageKey` metadata and portable export filtering for host
  filesystem references.
- Remote validation on the cloud pilot target plus local test coverage.

M7 impact audit:

- M0 through M2 are unaffected functionally. Authentication wraps API access but
  does not change seed content, quest lifecycle, scoring, or recommendation
  rules.
- M3 is affected only by access control. Location, inventory, and multiple home
  base progression remain the same, but real pilot entry now requires login.
- M4 is affected operationally. Mobile field-data capture can start locally for
  v1, then sign in to the same local account model when sync is configured.
  Physical iPhone validation remains required before v1. Android validation is
  deferred to v1.1 because no Android test phone is currently available.
- M5 is affected by evidence portability. Evidence records now support
  deployment-owned storage keys, and portable exports suppress host filesystem
  paths.
- M6 is affected operationally. Deployment docs now require first-admin account
  creation, optional fallback admin-token setup, and user disable instructions.
- PostgreSQL API runtime promotion, cloud-pilot backup/restore proof, and local
  iPhone build proof are now complete. v1.0 still needs mobile-first onboarding,
  field workflow validation, and final MVP release criteria.

### M8 - Recovery And Homelab Boundary

Status: complete. `v0.8.1` delivered the recovery and homelab-boundary
checkpoint.

Outcome:

- Cloud pilot backup and restore is proven as an operator-facing recovery
  workflow, not only a file-copy script.
- Backup manifests record release version, seed/content version, deployment
  profile, storage mode, database mode, config inclusion, table counts, local
  active user count, and storage file count.
- Homelab requirements remain visible as post-MVP work without blocking the
  cloud pilot MVP path.

Primary work:

- Deployment profile metadata in Compose, backup scripts, manifests, restore
  results, and admin status.
- Restore proof test covering local accounts, inventory, evidence files,
  reports, and admin readiness after restore.
- Actionable restore failure modes for missing files, checksum mismatch, and
  non-empty targets.
- Deployment and backup docs updated for cloud pilot local-disk backups and
  later homelab SAN/NAS expectations.
- Issue-resolution discipline maintained with explicit issue comments before
  closing work.

M8 impact audit:

- M0 through M2 are unaffected functionally. Recovery metadata does not alter
  architecture, seed content, quests, scoring, or recommendations.
- M3 is affected positively. Inventory and location data are now part of the
  restore proof, including user-named home-base data.
- M4 is affected operationally. Physical iPhone validation still remains for
  v1, but mobile field data now has a clearer server recovery contract. Android
  field validation is post-v1.
- M5 is affected positively. Evidence metadata and evidence storage bytes are
  both included in the cloud pilot restore proof.
- M6 is affected operationally. Deployment docs now require
  `BASECAMP_DEPLOYMENT_PROFILE`, backup manifests include admin configuration
  inclusion status, and restore drills must verify admin status after restore.
- M7 is affected operationally. Cloud pilot auth is now explicitly backed up and
  restored through the database backup path.
- PostgreSQL API runtime promotion and cloud-pilot backup/restore proof are now
  complete. v1.0 still needs local iPhone build validation, physical iPhone
  field validation, and final MVP release-candidate validation.

### M9 - MVP Readiness Gate

Status: complete. `v0.9.0` delivered the MVP readiness gate.

Outcome:

- Basecamp has a testable v1.0 MVP readiness definition rather than an endless
  prototype horizon.
- Remaining v1 blockers are visible as GitHub issues in the v1.0 milestone.
- The release gate clearly separates must-pass v1 requirements from post-MVP
  homelab, SSO, high-availability, and managed-service non-goals.

Primary work:

- Publish [Basecamp v1.0 MVP Readiness](./v1-mvp-readiness.md).
- List required web workflows, mobile workflows, server/database/storage
  requirements, deployment operations, backup/restore, privacy, content, and
  readiness-scoring criteria.
- Define required validation environments: local machine, clean local
  environment, cloud pilot, separate server, simulator, physical iPhone, and CI.
- Seed remaining v1 blocker issues for PostgreSQL, local iPhone build
  distribution, mobile field workflows, physical iPhone validation, cloud pilot
  operations, and final release-candidate validation.
- Link the v1 readiness gate from roadmap, release, verification, and deployment
  documentation.

M9 impact audit:

- M0 through M3 are unaffected functionally. Foundation, quest, readiness,
  inventory, location, and maintenance features remain accepted; v1 criteria now
  define which of those workflows must be smoke-tested before release.
- M4 is affected operationally. The prior mobile shell remains useful, but v1
  now requires a locally built iPhone artifact, native field workflows, and
  physical iPhone validation. Android moves to v1.1.
- M5 is affected operationally. Drill, skill, evidence, and report workflows
  are now part of the v1 web/mobile validation gate.
- M6 through M8 are affected operationally. Deployment, auth, backup, restore,
  privacy, and cloud-pilot status work now feed the v1 release-candidate
  checklist.
- v1.0 work should proceed through the blocker issues rather than ad hoc
  prompts for the next task.

### M10 - PostgreSQL Production Persistence Path

Status: complete. `v0.9.1` delivered the PostgreSQL production-persistence
path; `v0.9.2` follows with runtime promotion.

Outcome:

- PostgreSQL production-persistence data path exists for the v1 cloud pilot.
- PostgreSQL migrations, seed import, status checks, and portable SQLite-beta
  import are runnable by an operator.
- The remaining PostgreSQL work is narrowed to release-candidate validation
  evidence against the promoted runtime.

Primary work:

- Translate the SQLite baseline migrations into PostgreSQL-compatible DDL.
- Add PostgreSQL operator scripts for migrate, status, and portable import.
- Add an optional Compose `postgres` profile for clean local validation.
- Document database modes for SQLite local/beta use and PostgreSQL production
  persistence.
- Keep Ubuntu 22.04 LTS as the accepted v1 cloud-pilot target and keep Ubuntu
  24.04 LTS deferred until the admin explicitly requests it.

Validation:

- `pnpm check`.
- Docker Compose config validation with the tracked env example and the
  optional `postgres` profile.
- PostgreSQL migration/import validation against a disposable PostgreSQL
  database.

M10 impact audit:

- M0 through M3 and M5 are unaffected functionally. Domain workflows, content,
  web dashboard behavior, inventory, maintenance, drills, skills, and evidence
  records keep the same product contracts. M4 is affected by the local-first
  mobile start model.
- M6 through M8 are affected operationally. Deployment, backup, restore,
  security, and cloud-pilot docs distinguish SQLite local/beta use from
  PostgreSQL production persistence.
- M9 is affected by narrowing the v1 PostgreSQL blocker: migration/import is no
  longer the unknown, but API runtime validation remains required before
  `v1.0.0`.

### M11 - PostgreSQL API Runtime

Status: complete once `v0.9.2` is released.

Outcome:

- The API server can run the v1 cloud pilot against PostgreSQL by setting
  `BASECAMP_DATABASE_KIND=postgresql` and `BASECAMP_DATABASE_URL`.
- Admin-created local accounts, username/password login, admin status,
  portable export/import, inventory, quests, drills, skills, evidence metadata,
  sync routes, audit events, and runtime backup status work through the
  PostgreSQL adapter.
- SQLite remains available for local development and portable/mobile-shaped
  test data.

Primary work:

- Add a shared database connection interface for SQLite and PostgreSQL runtime
  implementations.
- Add a synchronous PostgreSQL adapter for existing server repository calls.
- Route server startup and ops scripts through runtime database selection.
- Make backup status database-kind aware and add logical PostgreSQL runtime
  backup snapshots.
- Add CI PostgreSQL API runtime smoke validation and runtime export validation.
- Update deployment, backup, release, verification, ADR, and v1 readiness docs.

Validation:

- `pnpm check`.
- Docker Compose config validation with the tracked env example and the
  optional `postgres` profile.
- PostgreSQL migration/import validation plus API runtime smoke validation in
  CI.

M11 impact audit:

- M0 through M5 keep the same product contracts. The database adapter changes
  persistence mechanics but not quest, inventory, location, sync, drill, skill,
  evidence, scoring, or dashboard behavior.
- M6 through M8 are affected operationally. Deployment docs now show how to run
  the cloud-pilot API against PostgreSQL, and backup status is tied to the
  active database kind instead of assuming SQLite.
- M9 is affected by the mobile build correction. PostgreSQL API runtime
  promotion, cloud-pilot backup/restore proof, and reset/seed/observability
  controls are closed. The remaining v1 blockers are mobile-first onboarding,
  mobile field capture/sync validation, physical iPhone validation, and final
  release-candidate validation. Android is tracked by v1.1.

### v1.0 - MVP Readiness

Outcome:

- Basecamp is useful for a real household preparedness program.
- The web app and mobile app can both create real user progress, with sync
  bridging the two when a server is configured.
- Mobile supports practical local-first field workflows.
- Self-hosting and backups are documented and tested.
- Server/web deployment and iPhone mobile installation instructions are tested
  or explicitly validated for the release path.
- Validation environments are documented for release-critical workflows.

Primary work:

- The v1 gate in [Basecamp v1.0 MVP Readiness](./v1-mvp-readiness.md).
- Production deployment profiles from ADR 0010: `local-dev`, `cloud-pilot` for
  v1 MVP, and post-MVP `homelab`.
- PostgreSQL cloud-pilot validation evidence against the promoted runtime.
- Evidence/document storage hardening beyond the v0.8 portability boundary,
  including filesystem bytes for the v1 cloud pilot and later SAN/NAS or object
  storage options.
- Cloud pilot deployment profile for real-user testing on an x86_64/amd64 Ubuntu
  22.04 LTS server with real data, local disk backups, reset/seed controls, and
  logs/metrics.
- Post-MVP homelab migration constraints, including UniFi-managed
  LAN/DNS/routing, future TLS/SAN/NAS expectations, and Ubuntu 24.04 LTS
  migration when the admin explicitly requests it.
- Production authentication and secret-management hardening beyond the v0.8
  local username/password baseline, not SSO.
- Backup/restore proof for database, storage, and admin configuration across
  accepted deployment profiles.
- Local iPhone build proof before v1.
- Mobile-first local quest onboarding before v1.
- Two-way mobile/web bootstrap and pairing before v1, with a visible Sync plan
  and stable starter quest IDs.
- Physical iPhone testing for field data capture before v1.

Current blocker map:

- Mobile-first first-run onboarding. The app must start locally with category
  selection and a starter quest instead of requiring server sign-in.
- Mobile field data capture, offline sync, and evidence upload. Native field
  tabs, storage boundaries, scan/quick-capture queueing, evidence upload, and
  reconnect sync plumbing exist, but simulator and physical iPhone validation
  remain required.
- Physical iPhone field validation.
- Final v1 release-candidate validation and release notes.

### v1.1 - Android Mobile

Outcome:

- Basecamp Mobile is available on Android after the web plus iPhone v1 launch.
- Android uses a local/admin-controlled build path, not a cloud build service.
- Android field workflows match the v1 iPhone workflows where platform behavior
  allows.

Primary work:

- Acquire or identify a physical Android device or tester.
- Build Android locally with Android SDK/JDK/Gradle tooling.
- Produce and install a debug APK and release APK/AAB as appropriate.
- Validate sign-in, server URL setup, Quick Capture, barcode scan, Basecamp QR
  scan, evidence capture, offline cache, offline queue restart, reconnect sync,
  and conflict visibility on a physical Android device.
- Update release notes and install docs with Android-specific update and
  rollback behavior.

v1 reset/seed impact audit:

- M0 through M5 keep the same product behavior. QA reset clears user workflow
  tables but does not alter seed content, domain rules, scoring, sync contracts,
  inventory semantics, drill logic, or mobile field workflow logic.
- M6 through M8 are affected operationally. Deployment and backup docs now
  include guarded reset/seed commands, observability output, backup-before-reset
  guidance, and rollback via restore.
- M9 through M11 are affected positively. The v1 readiness gate now has proof
  for reset/seed/observability controls, so that item rolls into final
  release-candidate evidence instead of remaining a standalone open blocker.

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
