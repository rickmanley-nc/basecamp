# Release Process

Last updated: 2026-08-20

## Release Philosophy

Basecamp releases should be reviewable increments. Early releases may be
architecture or developer-facing, but every release should make the state of the
project clearer.

## Release Checklist

1. Confirm milestone scope.
2. Confirm all required issues are closed or intentionally deferred.
3. Run `pnpm check`.
4. Update roadmap and docs.
5. Confirm migrations, seed data, backup impact, and export impact where
   relevant.
6. Confirm release notes and linked PR text contain no personal workstation
   paths.
7. Draft release notes.
8. Tag the release.
9. Create the GitHub Release.
10. Close the milestone when appropriate.

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
