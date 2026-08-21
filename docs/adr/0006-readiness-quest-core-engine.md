# ADR 0006: Readiness And Quest Core Engine

Status: Accepted

Date: 2026-08-20

## Context

M2 needs Basecamp to track user-selected quests, category pursuit choices,
dependency locks, readiness scores, recommendations, and motivational progress
without forcing a single preparedness path.

This logic must be shared by the server, web UI, tests, and future mobile/sync
work. It also needs to remain explainable because readiness affects real-world
preparedness decisions.

## Decision

Implement the M2 core as pure TypeScript domain and gamification functions:

- `@basecamp/domain` owns lifecycle types and transition rules.
- `@basecamp/gamification` owns dependency resolution, readiness scoring,
  recommendations, progression paths, XP, badges, capability outposts, and
  milestones.
- `@basecamp/database` persists category pursuit overrides, quest instances,
  quest events, and XP events in the local SQLite baseline.
- `@basecamp/api` exposes workflow-shaped dashboard, category pursuit, and
  quest action contracts.

Recommendations remain advisory. Starting, saving, completing, pausing,
snoozing, abandoning, and reopening quests are explicit user actions.

## Consequences

- The web app and server share the same readiness and recommendation logic.
- Validation ceilings prevent purchase-only progress from creating high
  readiness scores.
- Deferred categories remain visible as gaps but are suppressed from
  recommendations until resumed.
- Quest lifecycle events create the first audit-ready state trail for future
  offline sync.
- The M2 database slice is intentionally small and should be migrated toward
  the final PostgreSQL schema during self-hosting milestones.
- ADR 0007 separates M2 capability outpost achievements from physical location
  outposts planned for M3.

## Alternatives Considered

- **Compute readiness only in the web app.** Rejected because server, mobile,
  tests, exports, and sync need the same interpretation.
- **Persist only final quest status.** Rejected because future sync and audit
  flows need a recoverable event history.
- **Build a full rule engine now.** Deferred because the seed content is still
  early and M2 needs deterministic, inspectable rules more than a generalized
  authoring engine.
