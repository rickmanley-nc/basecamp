# Basecamp Data Model

Last updated: 2026-08-20

This is the first logical schema draft. It is technology-neutral, but the
recommended implementation path is PostgreSQL on the server with generated or
handwritten TypeScript types in `@basecamp/domain`, migrations in
`@basecamp/database`, and SQLite-compatible offline read models for mobile.

## Modeling Principles

- Model real capability, not just purchases.
- Preserve user choice and explicit deferral.
- Represent preparedness as a graph of useful accomplishments, not a single
  forced tree.
- Keep evidence useful but lightweight.
- Store event history for maintenance, drills, inventory changes, and sync.
- Avoid destructive overwrites where auditability matters.

## Core Tables

### Identity And Workspace

| Entity | Purpose |
| --- | --- |
| `workspace` | Self-hosted Basecamp instance or household/team scope. |
| `user` | Person using the instance. |
| `profile` | Household size, locations, constraints, interests, deferred categories, and defaults. |
| `role` | Permission sets for future multi-user households or teams. |

### Preparedness Structure

| Entity | Purpose |
| --- | --- |
| `category` | Water, Food, Power, Communications, etc. |
| `capability_level` | Level 0-5 definitions. |
| `category_level_requirement` | Category-specific expectations for each level. |
| `path` | Visual progression path within a category. |
| `path_node` | Accomplishment, skill, drill, build, milestone, or outpost node. |
| `dependency` | Directed dependency between nodes, quests, skills, equipment, or validations. |

### Quest And Accomplishment

| Entity | Purpose |
| --- | --- |
| `quest_template` | Reusable structured quest content. |
| `quest_instance` | User-selected quest with lifecycle state. |
| `accomplishment_template` | Structured objective inside a quest or path. |
| `accomplishment_instance` | User progress against an accomplishment. |
| `step_template` | Lightweight task/confirmation inside an accomplishment. |
| `step_instance` | User completion state for a step. |
| `unlock_rule` | Capabilities or content unlocked by completion. |

Quest statuses:

- available
- saved
- active
- paused
- snoozed
- ignored
- abandoned
- complete
- reopened

Category pursuit statuses:

- active
- interested
- later
- paused
- not_currently_pursuing

### Inventory, Assets, And Locations

| Entity | Purpose |
| --- | --- |
| `location` | Home, garage, vehicle, bin, room, shelf, cache, or field location. |
| `inventory_item` | Logical item type such as drinking water or handheld radio. |
| `inventory_lot` | Quantity, expiration, batch, purchase, or rotation group. |
| `asset` | Durable tracked object such as generator, radio, battery, kit, or tool. |
| `asset_tag` | Basecamp QR identifier. |
| `kit` | Loadout or grouped inventory set. |
| `kit_item` | Required, optional, or present item in a kit. |
| `inventory_event` | Add, remove, move, consume, expire, inspect, fail, or adjust event. |

Inventory states:

- planned
- need_to_acquire
- owned
- located
- installed
- configured
- tested
- in_service
- maintenance_due
- failed
- retired
- expired

### BOM, Projects, And Acquisition

| Entity | Purpose |
| --- | --- |
| `project` | Build, make, configure, repair, or install effort. |
| `bom` | Bill of materials for a project or quest. |
| `bom_item` | Functional requirement, quantity, specification, and acquisition state. |
| `bom_substitution` | Compatible alternative. |
| `acquisition_need` | Derived requirement from active quests, BOMs, maintenance, and replenishment. |

Acquisition states:

- already_owned
- need_to_purchase
- need_to_make
- need_to_build
- need_to_replenish
- optional
- substituted

### Skills And Training

| Entity | Purpose |
| --- | --- |
| `skill` | First aid, radio operation, navigation, soldering, etc. |
| `skill_level` | Untrained, familiar, practiced, competent, validated, advanced. |
| `skill_event` | Practice, course, validation, certification, or failure event. |
| `certification` | External certificate or course record. |

### Drills

| Entity | Purpose |
| --- | --- |
| `drill_template` | Scenario, success criteria, and expected evidence. |
| `drill_run` | Actual drill execution. |
| `drill_result` | Outcome, failures, lessons, and follow-up action links. |
| `follow_up_quest` | Suggested quest created from a failure or lesson. |

### Maintenance

| Entity | Purpose |
| --- | --- |
| `maintenance_policy` | Recurrence rule, asset/item scope, and completion requirements. |
| `maintenance_due` | Calculated due item. |
| `maintenance_event` | Completion, failure, inspection, replacement, or skipped action. |
| `maintenance_issue` | Problem discovered during maintenance. |

### Evidence And References

| Entity | Purpose |
| --- | --- |
| `evidence` | Photo, document, note, scan, checklist, reading, measurement, or drill result. |
| `source_reference` | Vetted source, manual, course, public guidance, or local instruction. |
| `attachment` | Stored photo/document metadata. |

### Gamification And Scoring

| Entity | Purpose |
| --- | --- |
| `xp_event` | Earned XP with source and reason. |
| `badge_template` | Badge definition, tier rules, art direction, and requirements. |
| `badge_award` | User-earned badge state. |
| `outpost_template` | Category capability milestone definition. |
| `outpost_award` | Earned outpost state. |
| `milestone_template` | Cross-category accomplishment. |
| `milestone_award` | Earned milestone state. |
| `readiness_snapshot` | Computed category and overall readiness at a point in time. |

### Sync And Audit

| Entity | Purpose |
| --- | --- |
| `sync_client` | Registered web/mobile client. |
| `sync_cursor` | Last synced server position. |
| `command_log` | Idempotent user commands accepted by the server. |
| `client_outbox_ack` | Server acknowledgement of client commands. |
| `conflict_record` | Conflicts requiring automatic or user-visible resolution. |
| `audit_event` | Security, admin, import, export, and backup events. |

## Readiness Inputs

Readiness scoring uses state from:

- Quest and accomplishment completion.
- Evidence and validation events.
- Inventory and asset status.
- BOM and acquisition status.
- Skill level and recency.
- Drill outcomes.
- Maintenance health.
- Dependency completion.
- Explicit user deferral.

Validation ceilings prevent a high score when a category has mostly purchased
but untested equipment.

## Event Model

Events worth preserving:

- Inventory quantity change.
- Asset maintenance completion or failure.
- Quest lifecycle change.
- Accomplishment validation.
- Drill run.
- Skill practice or certification.
- Evidence upload.
- Badge/outpost/milestone award.
- Sync conflict.
- Backup and restore.

Routine display screens can use read models, but audit-worthy state changes
should be recoverable from events.

## Implemented Migration Slice

M1 created seed import tables for categories, capability levels, and quest
templates. M2 adds early household progress state:

- `category_pursuits` for user-controlled hold/defer/resume decisions.
- `quest_instances` for selected quest lifecycle state.
- `quest_events` for audit-ready lifecycle transitions.
- `xp_events` for motivational progress with source and reason.

This is not the final production schema; it is the first persistent read/write
slice that keeps user action history recoverable for future sync.

## Initial Migration Plan

1. Create identity, category, level, quest template, and seed tables.
2. Add quest instances, accomplishments, dependencies, and evidence.
3. Add inventory, locations, assets, and QR tags.
4. Add BOMs, projects, and acquisition needs.
5. Add skills, drills, and maintenance.
6. Add scoring, XP, badges, outposts, and milestones.
7. Add sync clients, command log, conflict records, and audit events.
8. Add export/import and backup metadata.

## Open Decisions

- Whether to use Drizzle, Prisma, or Kysely for schema and query management.
- Whether readiness snapshots are computed on write, on schedule, or on demand
  with caching.
- Whether all quest templates are database rows, content-package JSON, or a
  hybrid import from versioned content.
- How much event-sourcing is needed before it adds more complexity than value.
