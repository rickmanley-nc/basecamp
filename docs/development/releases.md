# Release Process

Last updated: 2026-08-21

## Release Philosophy

Basecamp releases should be reviewable increments. Early releases may be
architecture or developer-facing, but every release should make the state of the
project clearer.

## Release Checklist

1. Confirm milestone scope.
2. For `v1.0.0`, confirm
   [Basecamp v1.0 MVP Readiness](../product/v1-mvp-readiness.md) is complete.
3. Confirm all required issues are closed or intentionally deferred.
4. Confirm closed roadmap issues have `## Resolution` comments.
5. Run `pnpm check`.
6. Update roadmap and docs.
7. Confirm migrations, seed data, backup impact, and export impact where
   relevant.
8. Confirm deployment and mobile installation guides are updated when a release
   changes install, upgrade, pairing, or distribution behavior.
9. Confirm required validation environments are satisfied or explicitly recorded:
   CI, local machine, clean local environment, separate server, simulator, or
   physical iPhone.
10. For installable releases, record the deployment profile validated:
   `local-dev`, `cloud-pilot`, post-MVP `homelab`, or intentionally deferred.
11. Confirm release notes and linked PR text contain no personal workstation
   paths.
12. Draft release notes.
13. Tag the release.
14. Create the GitHub Release.
15. Close the milestone when appropriate.

For installable self-hosting releases, also run:

```bash
docker compose -f infra/compose.yml --env-file infra/basecamp.env.example config --quiet
pnpm ops:release-check
pnpm ops:security-check
pnpm ops:backup
pnpm ops:export
```

Run `pnpm ops:restore` against a disposable restore target before calling the
release self-hosting ready.

For mobile distribution releases, also run:

```bash
pnpm --filter @basecamp/mobile dev
pnpm --filter @basecamp/mobile expo:config
```

When Expo and Apple credentials are available for a beta release, also run:

```bash
pnpm --filter @basecamp/mobile build:ios:testflight
pnpm --filter @basecamp/mobile submit:ios:testflight
```

Record the install channel, iOS version, marketing version, iOS build number,
TestFlight expiration posture, server URL mode, validation environment, and
whether a physical iPhone install was completed. Do not close a v1 mobile
blocker that requires physical iPhone proof unless that device validation has
actually been recorded.

For PostgreSQL persistence releases, also validate against a disposable
PostgreSQL database:

```bash
pnpm ops:postgres:migrate
pnpm ops:postgres:status
pnpm ops:postgres:import
BASECAMP_DATABASE_KIND=postgresql pnpm test tests/postgres-server-runtime.test.ts
BASECAMP_DATABASE_KIND=postgresql pnpm ops:export
BASECAMP_DATABASE_KIND=postgresql pnpm ops:backup
BASECAMP_DATABASE_KIND=postgresql BASECAMP_USER_USERNAME=<user> BASECAMP_USER_PASSWORD=<password> pnpm ops:user:create
BASECAMP_DATABASE_KIND=postgresql BASECAMP_USER_USERNAME=<user> pnpm ops:user:disable
```

Record whether validation covered only migration/import or a promoted API
runtime adapter. For PostgreSQL runtime releases, record whether restore drill
proof is complete or still tracked in the v1 backup/restore milestone.

When a patch changes deployment behavior, audit previous milestone docs,
operator runbooks, release notes, and the open v1.0 criteria before starting the
next milestone. Record whether earlier milestones are unaffected or need
follow-up work.

## Upgrade Notes Checklist

Installable release notes should link to:

- [Deployment Guide](../ops/deployment.md)
- [Self-Hosting And Backups](../ops/self-hosting-and-backups.md)
- [iPhone Installation Guide](../ops/iphone-installation.md) when mobile
  distribution is affected

Every upgrade note should say:

- Whether a backup is required before upgrade.
- Whether migrations run automatically on server startup.
- How rollback should be performed.
- Which validation environment was used.
- Which deployment profile was validated.

## Release Notes Template

```markdown
## Summary

## Included Milestone

## User-Visible Changes

## Developer Notes

## Validation

## Known Limitations

## Next
```

## Current Planned Releases

- `v0.1.0` - Architecture Foundation
- `v0.2.0` - Running Vertical Slice
- `v0.3.0` - Readiness And Quest Core
- `v0.4.0` - Inventory, BOMs And Maintenance
- `v0.5.0` - Mobile And Offline Sync
- `v0.6.0` - Drills, Skills And Validation
- `v0.7.0` - Self-Hosting Beta
- `v0.7.x` - Self-Hosting Beta patch releases
- `v0.8.0` - Cloud Pilot Foundation
- `v0.8.1` - Recovery And Homelab Boundary
- `v0.9.0` - MVP Readiness Gate
- `v0.9.1` - PostgreSQL Production Persistence Path
- `v0.9.2` - PostgreSQL API Runtime
- `v1.0.0` - MVP Readiness
