# Basecamp Development Workflow

Last updated: 2026-08-20

## Local Setup

Basecamp is a pnpm monorepo.

```bash
pnpm install
pnpm check
```

The current root check validates repository documentation, seed content, package
type checks, smoke tests, and the web build. As application packages expand,
`pnpm check` should continue to be the default confidence command.

## M1 Local Run

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
- Preparedness/product impact.
- Data model impact.
- Offline/sync impact.
- Accessibility impact.
- Kaizen/UI boundary impact for web changes.

Passing roadmap PRs should be squash-merged by the agent by default. The user
reviews milestone outcomes and releases rather than merging every PR manually.

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
