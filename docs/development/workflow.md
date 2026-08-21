# Basecamp Development Workflow

Last updated: 2026-08-21

## Local Setup

Basecamp is a pnpm monorepo.

```bash
pnpm install
pnpm check
```

The current root check validates repository documentation, seed content, package
type checks, smoke tests, and the web build. As application packages expand,
`pnpm check` should continue to be the default confidence command.

Public workflow text must follow
[Privacy And Portability](./privacy-and-portability.md). Do not include local
usernames, workstation home directories, or Codex cache paths in tracked files,
PR descriptions, release notes, issues, or comments. Use repo-relative paths,
anonymous placeholders, environment variables, or admin-controlled server paths.

## Local Run

Create the local development database:

```bash
pnpm --filter @basecamp/database db:reset
```

Run the server:

```bash
pnpm --filter @basecamp/server dev
```

Run the web app:

```bash
pnpm --filter @basecamp/web dev
```

Default local URLs:

- Server: `http://127.0.0.1:4317`
- Web: `http://127.0.0.1:4318`

M1 uses Node's built-in `node:sqlite` for local seed import, which currently
emits an experimental warning. PostgreSQL remains the production self-hosting
target.

M2 adds persisted quest and category state to the local database. Useful routes:

- `GET /api/dashboard`
- `PATCH /api/categories/:categoryId/pursuit`
- `POST /api/quests/:questId/actions`

M3 adds inventory, location, asset tag, and maintenance routes:

- `GET /api/inventory`
- `POST /api/inventory/quick-entry`
- `GET /api/assets/:assetId`
- `POST /api/assets/:assetId/tags`
- `POST /api/maintenance/policies`
- `POST /api/maintenance/:policyId/completions`

Set `BASECAMP_PUBLIC_URL` when QR tags should point at a known server or LAN
host rather than using the request host.

M4 adds mobile/offline sync commands:

- `POST /api/sync`
- `pnpm --filter @basecamp/mobile dev`

The mobile preview is a local TypeScript app-shell check. Physical iPhone checks
for TestFlight installation, Camera permission, Local Network permission, offline
device storage, and reconnect sync remain pending until a signed iPhone build
exists.

M5 adds drills, skills, evidence, and reports:

- `GET /api/reports/gaps`
- `GET /api/drills/templates`
- `POST /api/drills/:templateId/runs`
- `POST /api/evidence`
- `POST /api/skills/training`

The M5 gap report separates critical category gaps, intentional deferrals,
validation gaps, acquisition gaps, and maintenance gaps. Drill failure follow-up
suggestions and skill expiration impacts are covered by local tests.

M6 adds self-hosting beta operations:

- `docker compose -f infra/compose.yml --env-file infra/basecamp.env.example config --quiet`
- `pnpm ops:release-check`
- `pnpm ops:security-check`
- `pnpm ops:backup`
- `pnpm ops:restore`
- `pnpm ops:export`
- `pnpm ops:import`

M6 server health/admin routes:

- `GET /health/live`
- `GET /health/ready`
- `GET /api/admin/status`
- `GET /api/admin/export`
- `POST /api/admin/import`
- `GET /api/admin/audit`

Admin routes require `BASECAMP_ADMIN_TOKEN`. Self-hosting validation should use
the Deployment Guide and report whether it ran locally, in a clean container
environment, or on a separate server.

The self-hosting Compose stack does not use service-level `env_file` entries.
Operators must pass the env file explicitly with `--env-file` on every Compose
command. The backup service mounts `BASECAMP_CONFIG_SOURCE` read-only so the
admin config can be included in backup manifests without committing secrets.

Compose is the M6 single-node reference adapter. Production-readiness work must
preserve the deployment profiles from ADR 0010: `local-dev`, `homelab`, and
`cloud-pilot`.

## Branches

- `main` should remain releasable.
- Feature branches should be short-lived and named `codex/i<number>-short-slug`
  when tied to a GitHub issue.
- Remote branches should be deleted automatically after merge.
- Local merged branches should be deleted after `main` is updated.
- Keep unrelated changes out of a PR.

## Pull Requests

Every PR should describe:

- Summary.
- Validation performed.
- Confirmation that public text contains no personal workstation paths.
- Preparedness/product impact.
- Data model impact.
- Offline/sync impact.
- Accessibility impact.
- Kaizen/UI boundary impact for web changes.
- Verification environment used, such as CI, local machine, clean local
  environment, homelab, cloud pilot, separate server, simulator, or physical
  iPhone.
- Deployment profile affected or validated: `local-dev`, `homelab`,
  `cloud-pilot`, or not applicable.

Passing roadmap PRs should be squash-merged by the agent by default. The user
reviews milestone outcomes and releases rather than merging every PR manually.
Before merging a PR that closes roadmap issues, post a `## Resolution` comment
on each issue explaining how it was resolved.

Pause for user review only when a PR changes product direction, introduces
security or infrastructure risk, fails validation in a non-obvious way, or
intentionally defers acceptance criteria.

## Issues And Projects

Use GitHub Issues/Projects for software delivery. Do not use Basecamp user
preparedness workflows as software task tracking.

Issue labels to add later:

- product
- architecture
- web
- mobile
- server
- domain
- database
- ui
- content
- gamification
- sync
- infra
- accessibility
- security
- docs

## Definition Of Done

For product code:

- User workflow is implemented with minimal taps/clicks.
- Domain rules are tested.
- API contract is typed.
- Database migration and seed impact are handled.
- Offline/sync behavior is considered.
- Accessibility is considered.
- UI imports respect `@basecamp/ui`.
- Docs or ADRs are updated for architecture changes.
- Closed roadmap issues have `## Resolution` comments with the specific change,
  validation, and follow-up status.
- Validation environment is documented, and physical iPhone or separate-server
  testing is not replaced with local-only testing when the issue requires real
  device or deployment proof.

For content:

- Functional requirement appears before product-specific recommendations.
- Validation criteria are explicit.
- Evidence requirements are useful and lightweight.
- XP/readiness weighting does not over-credit purchases.
- Dependencies do not create unnecessary global progression locks.

## Release Process Draft

1. Merge completed work to `main`.
2. Run CI.
3. Build container images.
4. Run migration tests.
5. Run backup/restore smoke test.
6. Tag release.
7. Publish release notes.
8. Document upgrade steps.

## Security Guidance Draft

- No secrets in git.
- Self-hosted deployment must document TLS, reverse proxy, and VPN options.
- Backups must be encrypted or stored in a user-controlled trusted location.
- Medical and emergency contact data should be treated as sensitive.
- Audit admin actions, exports, imports, backups, and restore operations.
- Offline clients should support local device protections where platform APIs
  allow.
