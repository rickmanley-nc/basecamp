# GitHub Planning Workflow

Last updated: 2026-08-21

## Planning Contract

Basecamp uses GitHub Issues, Milestones, Pull Requests, and Releases as the
ongoing work system.

GitHub owns live state:

- What is open.
- What is next.
- What is blocked.
- What is done.
- What shipped in each release.

Repository docs own durable planning rules:

- Roadmap shape.
- Milestone definitions.
- Release policy.
- Issue quality bar.
- Automation and sync procedure.

## Initial Sync

The initial roadmap can be synced with:

```bash
pnpm roadmap:sync -- --repo rickmanley-nc/basecamp --write
```

Without `--write`, the command prints what it would do:

```bash
pnpm roadmap:sync -- --repo rickmanley-nc/basecamp
```

The script creates or updates:

- Labels from `.github/roadmap/labels.json`.
- Milestones from `.github/roadmap/milestones.json`.
- Issues from `.github/roadmap/issues.json`.

It avoids duplicate issues by exact title match.

## How To Choose The Next Thing

Default rule:

1. Open the active milestone.
2. Pick the highest-priority unblocked issue.
3. Prefer issues that unblock other issues.
4. Keep each PR focused.
5. Update issue status through resolution comments, PR links, and closing
   keywords.

Active milestone order:

1. M1 - Running Vertical Slice
2. M2 - Readiness And Quest Core
3. M3 - Inventory, BOMs And Maintenance
4. M4 - Mobile And Offline Sync
5. M5 - Drills, Skills And Validation
6. M6 - Self-Hosting Beta
7. M7 - Cloud Pilot Foundation
8. M8 - Recovery And Homelab Boundary
9. M9 - MVP Readiness Gate
10. M10 - PostgreSQL Production Persistence Path
11. M11 - PostgreSQL API Runtime
12. v1.0 - MVP Readiness

M0 through M11 are historical after their corresponding releases.

## Autonomous Delivery Mode

Basecamp development uses autonomous issue delivery by default.

The agent should:

- Pick the next unblocked issue from the active milestone.
- Create a short-lived branch.
- Open a PR for CI, review history, and issue linkage.
- Wait for required checks.
- Post a resolution comment on every issue the PR closes.
- Squash-merge passing PRs without waiting for user action.
- Delete the remote branch after merge.
- Delete the local branch after pulling `main`.
- Continue to the next issue.

The user should review at milestone and release boundaries rather than merging
every implementation PR.

Stop and ask before merging only when:

- A product decision materially changes the roadmap or user experience.
- A change introduces secrets, external accounts, billing, or infrastructure
  exposure.
- Safety, medical, legal, licensing, or security uncertainty needs explicit
  judgment.
- CI or validation fails and the fix is not straightforward.
- The PR intentionally defers acceptance criteria.
- The user explicitly asks to review that PR before merge.

## Pull Request Rules

Every PR should:

- Link one or more issues.
- Identify validation performed.
- Mention data model impact.
- Mention offline/sync impact.
- Mention accessibility impact.
- Mention Kaizen/UI boundary impact for web changes.

Use closing keywords when the PR fully completes an issue:

```text
Closes #123
```

## Issue Resolution Comments

Every closed roadmap issue must have a dedicated issue comment explaining how it
was resolved. A linked PR is not enough, because the issue should remain
reviewable on its own.

Post this comment before merging a PR that uses closing keywords. If an issue is
closed by automation first, post the comment immediately after merge.

Resolution comment format:

```markdown
## Resolution

Resolved by PR #123 and released in v0.4.0.

What changed:
- Specific behavior, model, route, UI, or documentation delivered.
- Acceptance criteria that were satisfied.

Validation:
- `pnpm check`
- Any focused smoke test, migration check, or manual verification.

Follow-up:
- None.
```

Resolution comments must follow
[Privacy And Portability](./privacy-and-portability.md): use repo-relative
paths, portable commands, and neutral examples.

Audit closed roadmap issues with:

```bash
pnpm roadmap:resolution-audit -- --repo rickmanley-nc/basecamp
```

For a single milestone:

```bash
pnpm roadmap:resolution-audit -- --repo rickmanley-nc/basecamp --milestone "M2 - Readiness And Quest Core"
```

Repository merge settings:

- Squash merge is enabled.
- Merge commits are disabled.
- Rebase merges are disabled.
- Auto-merge is enabled.
- Branch deletion after merge is enabled.

Squash commits should use the PR title and PR body so issue links and validation
notes remain in history.

## Branch Rules

Branches are temporary implementation handles, not durable project records.

Branch naming:

- Issue work: `codex/i<number>-short-slug`
- Small workflow/docs follow-up: `codex/short-slug`
- Avoid long descriptive branch names when the issue title already provides the
  durable context.

Branch cleanup:

- Delete remote branches on merge.
- Delete local branches after pulling the merge commit into `main`.
- Do not preserve merged branches as historical artifacts; GitHub PRs and squash
  commits are the history.

## Milestone Exit Review

Before closing a milestone:

- All required issues are closed or explicitly deferred.
- Closed issues have resolution comments.
- `pnpm check` passes.
- Relevant docs are updated.
- Release notes are drafted.
- Known limitations are recorded.
- A GitHub Release is created for the milestone.

## Release Tags

Release tags use semver:

- `v0.1.0`: architecture foundation.
- `v0.2.0`: first running vertical slice.
- `v0.3.0`: readiness and quest core.
- `v0.4.0`: inventory, BOMs, maintenance.
- `v0.5.0`: mobile and offline sync.
- `v0.6.0`: drills, skills, validation.
- `v0.7.0`: self-hosting beta.
- `v0.7.x`: self-hosting beta patch releases.
- `v0.8.0`: cloud pilot foundation.
- `v0.8.1`: recovery and homelab boundary.
- `v0.9.0`: MVP readiness gate.
- `v0.9.1`: PostgreSQL production persistence path.
- `v0.9.2`: PostgreSQL API runtime.
- `v1.0.0`: MVP readiness.

Patch releases are for corrections inside a milestone, such as `v0.2.1`.
