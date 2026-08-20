# Basecamp Roadmap

Last updated: 2026-08-20

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
| `v0.3.0` | M2 - Readiness And Quest Core | User-controlled progression, quests, scoring, recommendations. | Quest lifecycle, category paths, readiness score v1, deferral controls. |
| `v0.4.0` | M3 - Inventory, BOMs And Maintenance | Inventory, assets, BOMs, acquisition, recurring maintenance. | Inventory and BOM workflows update quests and readiness. |
| `v0.5.0` | M4 - Mobile And Offline Sync | Mobile shell, Quick Capture, scanning, offline outbox, sync. | Mobile can capture field changes offline and sync them later. |
| `v0.6.0` | M5 - Drills, Skills And Validation | Drills, skill progression, evidence, validation ceilings, reports. | Validated capability outweighs owned gear in scoring. |
| `v0.7.0` | M6 - Self-Hosting Beta | Container deployment, backups, restore, release process, security. | Linux self-hosted beta can be installed, backed up, restored, and upgraded. |
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

Primary work:

- Quest lifecycle.
- Active/backlog/snooze/pause/abandon states.
- Category paths.
- Dependency graph.
- Readiness score v1.
- Recommendation engine v1.
- XP, badges, outpost progress.
- Category hold/defer controls.

### M3 - Inventory, BOMs And Maintenance

Outcome:

- Basecamp knows what the user owns, what they need, where assets are, and what
  needs maintenance.

Primary work:

- Locations, inventory, durable assets, kits, and QR tag data model.
- BOM and acquisition rollup.
- Maintenance policies and completion events.
- Web inventory entry.
- QR asset tag design.
- Inventory export/backup shape.

### M4 - Mobile And Offline Sync

Outcome:

- Mobile supports field use, scanning, Quick Capture, offline reference, and
  reliable sync back to the self-hosted server.

Primary work:

- Mobile app foundation.
- Quick Capture command parser v1.
- Barcode and QR scanning.
- Offline read model.
- Durable command outbox.
- Sync API v1.
- Conflict policy tests.

### M5 - Drills, Skills And Validation

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

### M6 - Self-Hosting Beta

Outcome:

- A capable user can run Basecamp on a Linux host and trust backups.

Primary work:

- Docker Compose deployment.
- Backup and restore automation.
- Release packaging.
- Security hardening.
- Health checks and observability.
- Data export/import.

### v1.0 - MVP Readiness

Outcome:

- Basecamp is useful for a real household preparedness program.
- The web app is the source of truth.
- Mobile supports practical field workflows.
- Self-hosting and backups are documented and tested.

## Issue Policy

Issues should be small enough to review but large enough to produce a meaningful
product increment. Each issue should include:

- Outcome.
- Scope.
- Acceptance criteria.
- Validation.
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
