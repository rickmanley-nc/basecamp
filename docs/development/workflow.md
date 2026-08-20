# Basecamp Development Workflow

Last updated: 2026-08-20

## Local Setup

Basecamp is a pnpm monorepo.

```bash
pnpm install
pnpm check
```

The current root check validates repository documentation and seed JSON. As
application packages are implemented, `pnpm check` should expand to type checks,
unit tests, integration tests, content validation, accessibility checks, and
build verification.

## Branches

- `main` should remain releasable.
- Feature branches should be short-lived.
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
