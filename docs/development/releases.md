# Release Process

Last updated: 2026-08-21

## Release Philosophy

Basecamp releases should be reviewable increments. Early releases may be
architecture or developer-facing, but every release should make the state of the
project clearer.

## Release Checklist

1. Confirm milestone scope.
2. Confirm all required issues are closed or intentionally deferred.
3. Confirm closed roadmap issues have `## Resolution` comments.
4. Run `pnpm check`.
5. Update roadmap and docs.
6. Confirm migrations, seed data, backup impact, and export impact where
   relevant.
7. Confirm deployment and mobile installation guides are updated when a release
   changes install, upgrade, pairing, or distribution behavior.
8. Confirm required validation environments are satisfied or explicitly recorded:
   CI, local machine, clean local environment, separate server, simulator, or
   physical iPhone.
9. Confirm release notes and linked PR text contain no personal workstation
   paths.
10. Draft release notes.
11. Tag the release.
12. Create the GitHub Release.
13. Close the milestone when appropriate.

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
- `v1.0.0` - MVP Readiness
