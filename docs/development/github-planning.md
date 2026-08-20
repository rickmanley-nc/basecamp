# GitHub Planning Workflow

Last updated: 2026-08-20

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
5. Update issue status through PR links and closing keywords.

Active milestone order:

1. M1 - Running Vertical Slice
2. M2 - Readiness And Quest Core
3. M3 - Inventory, BOMs And Maintenance
4. M4 - Mobile And Offline Sync
5. M5 - Drills, Skills And Validation
6. M6 - Self-Hosting Beta
7. v1.0 - MVP Readiness

M0 is historical after `v0.1.0`.

## Autonomous Delivery Mode

Basecamp development uses autonomous issue delivery by default.

The agent should:

- Pick the next unblocked issue from the active milestone.
- Create a short-lived branch.
- Open a PR for CI, review history, and issue linkage.
- Wait for required checks.
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
- `v1.0.0`: MVP readiness.

Patch releases are for corrections inside a milestone, such as `v0.2.1`.
