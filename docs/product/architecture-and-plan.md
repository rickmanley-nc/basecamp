# Basecamp Product Architecture And Implementation Plan

Last updated: 2026-08-21

## Product Definition

Basecamp is a self-hosted preparedness platform for learning, planning,
building, validating, and maintaining real-world resilience. It is not companion
software for a book. Basecamp itself is the preparedness system.

Primary deliverables:

- A self-hosted web application as the authoritative source of truth.
- A mobile companion app for fast capture, field work, scanning, photos,
  maintenance, drills, task completion, and offline reference.
- Structured preparedness content, quests, progression, projects, bills of
  materials, inventory, skills, drills, maintenance, scoring, badges,
  capability outposts, milestones, and reports.

Core product promise:

- The user always knows where they are, what they have accomplished, what they
  could do next, why it matters, what it unlocks, and what remains intentionally
  deferred.
- Basecamp recommends useful paths but the user remains in control.
- Tracking preparedness must never become more tedious than preparedness itself.

## Product Language

Authoritative terminology:

- Basecamp: the overall platform and central home.
- Quests: meaningful preparedness objectives selected by the user.
- Paths: visual progression through a category.
- Capability Outposts: validated capability milestones inside a category or
  domain.
- Badges: achievements with tiers and artwork.
- Milestones: significant cross-category accomplishments.
- Skills: learned and demonstrated abilities independent of equipment.
- Inventory: owned supplies, equipment, tools, machinery, and materials.
- Loadout: optional equipment sets for contexts such as evacuation, vehicle, or
  blackout response.
- Readiness Score: composite preparedness measurement.

Tone:

- Rugged, modern, motivating, practical, and serious.
- Avoid childish gamification, doomsday theatrics, zombie imagery, excessive
  camouflage, and militaristic aesthetics.

## Threat And Preparedness Scope

Basecamp prepares for realistic disruptions:

- Power outages, severe weather, natural disasters, water disruptions, food
  shortages, supply-chain disruption, cellular/internet/GPS loss, medical
  emergencies, evacuation, vehicle breakdowns, extended utility outages, civil
  disturbances, and delayed emergency services.

Out of scope for initial content:

- Fantasy scenarios.
- Fear-based "end of civilization" framing.
- Advice that requires regulated professional judgment without vetted source
  material and clear safety boundaries.

## Preparedness Categories

Initial categories:

- Water
- Food
- Shelter
- Medical
- Power
- Communications
- Navigation
- Transportation
- Tools and Repair
- Sanitation
- Home Resilience
- Personal Safety
- Evacuation
- Community
- Financial Preparedness
- Skills and Training
- Drills and Validation

Categories may be added when meaningful capabilities do not fit cleanly within
these. Each category progresses independently and can be active, interested,
later, paused, or not currently pursued.

## Capability Levels

Numeric levels are authoritative. Names and badges add identity but do not
replace the numeric model.

| Level | Name | Meaning |
| --- | --- | --- |
| 0 | Unprepared | No validated capability. |
| 1 | 24 Hours | Handle an ordinary disruption independently for about one day. |
| 2 | 72 Hours | Operate independently for three days. |
| 3 | 2 Weeks | Operate comfortably during prolonged regional disruption. |
| 4 | 30 Days | Maintain critical household capabilities for about one month. |
| 5 | Extended Resilience | Deep redundancy, repair capability, renewable resources, advanced skills, and community systems. |

Level requirements are category-specific. Water Level 4 and Navigation Level 0
at the same time is expected behavior, not a failure state.

## Named Progression And Outposts

Outposts represent meaningful, independently useful validated capability
milestones. They may align with a level but do not need to be identical to
levels.

Example: Communications Outpost requirements:

- Required radio equipment acquired.
- Radios configured.
- Backup power established.
- Communication plan documented.
- Communication between defined locations tested.
- Drill completed successfully.

Potential future thematic language:

- Trailhead
- Basecamp
- Outpost
- Stronghold
- Redoubt
- Summit

These names are optional presentation language. The product must preserve clear
labels like "Level 3 - 2 Weeks."

## Location Progression

Basecamp also treats physical or logical places as progressable preparedness
entities. A user can define multiple named locations, such as a primary house,
a parent house, a vehicle, a cabin, a cache, or a field site.

Locations progress from known places into more capable operating bases:

| Tier | Meaning |
| --- | --- |
| Known Location | A place exists in Basecamp but has little or no validated capability. |
| Stash | A limited supply, kit, or cache is present. |
| Outpost | The place has validated, independently useful capability for one or more categories. |
| Basecamp | The place supports multiple categories and recurring maintenance. |
| Home Base | The place can serve as a durable base of operations with multi-category readiness. |

Multiple locations can reach Home Base status. A household might have a primary
home and a family member's house in Basecamp at the same time, with each one
progressing independently. One location may be a Home Base while another remains
a Known Location or Stash until enough quests, inventory, maintenance, and
validation work are completed there.

This means "outpost" has two related uses:

- A location maturity tier: a physical place that has progressed to Outpost.
- A gamification achievement: a category capability outpost such as Water
  Outpost.

The product should keep those concepts distinct but linkable. For example, a
Water Outpost achievement can contribute to a specific physical location's
Outpost or Home Base progression when the validated water capability is stored,
maintained, and usable there.

## User-Controlled Progression

Basecamp does not force a fixed curriculum. The user can pursue Water Level 3,
Communications Level 2, and Power Level 2 while leaving Food at Level 1 and
Navigation at Level 0.

Category pursuit states:

- Active: recommend and surface frequently.
- Interested: include in recommendations when relevant.
- Later: show as a gap but stop repeated nudges.
- Paused: preserve progress and suppress new work.
- Not Currently Pursuing: show in readiness reports without treating deferral as
  an error.

When a level is complete, the user may:

- Continue to the next level.
- Browse next-level quests.
- Hold at the current level.
- Add next-level work to backlog.
- Start a specific next-level quest.

## Quest System

Quest pools:

- Recommended quests
- Available quests
- Suggested quests
- High-priority quests
- Quick-win quests
- Weekend quests
- Build quests
- Skill quests
- Drill quests
- Maintenance quests
- Challenge quests

Quest lifecycle:

- Start
- Save for later
- Ignore
- Snooze
- Abandon
- Pause
- Resume
- Replace
- Complete
- Reopen when validation expires or maintenance fails

Multiple active quests are allowed. Recommendations do not automatically become
active.

Quest anatomy:

- Title, description, category, target level, taxonomy, estimated time, cost,
  effort, XP, priority, status, dependencies, accomplishments, required
  equipment, supplies, tools, machinery, BOM, skills, validation, evidence,
  maintenance impact, badge contribution, outpost contribution, unlocks, and
  safety notes where needed.

## Accomplishment Hierarchy

Basecamp breaks preparedness into discrete accomplishments instead of chapters.

Hierarchy:

- Category
- Level
- Path
- Quest
- Accomplishment
- Step
- Evidence

Accomplishments may include:

- Knowledge
- Skills
- Equipment
- Supplies
- Tools
- Machinery
- Cost
- Effort
- Maintenance
- Validation
- Evidence
- Badge contribution
- Outpost contribution
- Unlocks

Only necessary fields are exposed in normal user interaction. The internal model
can be sophisticated while the user experience remains light.

## Dependency Graph

Use a flexible graph, not a single global progression tree.

Dependencies can lock a specific quest or accomplishment, such as "Build
Advanced Radio Repeater," without blocking unrelated preparedness activities.

Dependency types:

- Required knowledge
- Required skill
- Required equipment
- Required supply
- Required tool or machinery
- Required project
- Required drill
- Required validation
- Required maintenance state
- Recommended but optional prerequisite

## Recommendations

Basecamp continuously answers: "What are some useful things I could work on
next?"

It should not answer: "Here is the one thing you must do next."

Recommendation score:

```text
priority =
  probability
  * consequence
  * capabilityGap
  * dependencyImportance
  * userInterestWeight
  * pursuitStateWeight
  * downstreamUnlockWeight
  * multiUsefulnessWeight
  * maintenanceUrgencyWeight
  / frictionCost
```

Recommendation context:

- Cost
- Effort
- Available time
- Existing equipment
- Existing skills
- Downstream unlocks
- Multi-purpose usefulness
- User-selected interests
- Deferred categories
- Active projects
- Available machinery
- Quick wins

Dashboard presentation should show a small set of meaningful choices, such as:

- Best Risk Reduction: Create 72-hour water reserve.
- Quick Win: Label household utility shutoffs.
- Build Project: Create radio charging station.
- Skill: Practice water purification.

## Scoring Methodology

Track:

- Category level
- Category percentage completion
- Knowledge
- Skills
- Equipment
- Supplies
- Systems
- Redundancy
- Drills
- Validation
- Maintenance health

Capability states:

- Owned
- Installed
- Configured
- Learned
- Practiced
- Tested
- Validated
- Maintained

Rule: owning equipment does not automatically constitute capability.

Category readiness is calculated from weighted components:

- Knowledge: 10-20 percent depending on category.
- Supplies/equipment: 15-30 percent.
- Installation/configuration: 10-20 percent.
- Skill practice: 15-25 percent.
- Drill/test validation: 20-35 percent.
- Maintenance health: 10-20 percent.
- Redundancy: 0-15 percent at higher levels.

Weights vary by category. For example, Communications needs configuration and
drill validation; Food needs storage, rotation, and preparation capability.

Overall Readiness Score:

- Weighted aggregate across user-relevant critical categories.
- Penalizes critical gaps in Water, Medical, Power, Communications, Evacuation,
  and Sanitation.
- Marks intentionally deferred categories clearly instead of hiding them.
- Cannot exceed a category's validation ceiling. Example: untested equipment
  caps relevant contribution until a drill or test is completed.

## XP System

XP supports motivation and pacing but does not replace readiness scoring.

XP sources:

- Quest completion
- Accomplishment completion
- Skill practice
- Drill completion
- Validation success
- Maintenance consistency
- Evidence submission
- Outpost earned
- Milestone earned

XP weighting:

- Purchase-only actions: low XP.
- Configure/install actions: moderate XP.
- Practice/test/validate actions: high XP.
- Maintenance streaks: modest, steady XP.
- Difficult cross-category milestones: high XP.

XP should celebrate behavior without implying preparedness where validation is
missing.

## Badge System

Badges include:

- Name
- Description
- Artwork prompt/direction
- Requirements
- Category
- Tier
- Rarity
- XP
- Progress
- Date earned

Tiers:

- Bronze
- Silver
- Gold
- Platinum
- Master

Survival-themed badge concepts:

- Water Guardian: droplet, shield, filtration imagery.
- Grid Down: lightning bolt, battery, darkened utility line.
- Radio Operator: handheld radio, signal waves, mountain contour.
- Pathfinder: compass and topographic lines.
- Field Medic: medical mark, trauma bag, shield.
- Fire Keeper: flame and campfire.
- Maker: gear, wrench, fabrication marks.
- Quartermaster: supply crate and inventory markings.

Badge art should evolve by tier while retaining a recognizable symbol.

## Capability Outpost Concepts

Initial capability outpost achievements:

- Water Outpost: validated water storage, purification, shutoff knowledge, and
  outage test.
- Power Outpost: backup power plan, battery/generator capability, critical-load
  map, fuel/charging plan, and outage test.
- Communications Outpost: configured radios, contact plan, backup charging,
  successful field test, and communication drill.
- Medical Outpost: supplies, location map, training, trauma/first-aid skills,
  expiration review, and scenario drill.
- Mobility Outpost: vehicle kit, routes, fuel plan, navigation backup, and
  breakdown or evacuation drill.

## Milestones

Milestones are cross-category achievements. They should reward meaningful
capability but never force pursuit.

Initial milestone concepts:

- 72-Hour Ready: validated baseline capability across Water, Food, Medical,
  Power, Communications, Sanitation, and Evacuation.
- Grid Independent: operate defined critical household systems without grid
  electricity for a measured duration.
- Ready to Evacuate: go-bags, vehicle kit, routes, rally points, navigation,
  communications, and evacuation drill.
- Outpost Network: establish a defined number of category capability outposts.
- Household Resilience: reach Level 3 across defined critical capabilities.
- One Month Ready: reach Level 4 across critical preparedness capabilities.

## Skills Taxonomy

Skill states:

- Untrained
- Familiar
- Practiced
- Competent
- Validated
- Advanced

Initial skill families:

- First aid
- CPR
- Trauma response
- Radio operation
- Antenna construction
- Navigation
- Water purification
- Food preservation
- Electrical troubleshooting
- Soldering
- Small-engine maintenance
- Vehicle repair
- Fire starting
- Sewing
- Welding
- Carpentry

Skills exist separately from equipment and can unlock quests or improve scoring
only when practiced or validated.

## Inventory Taxonomy

Inventory types:

- Consumable supply
- Durable equipment
- Tool
- Machinery
- Medical item
- Power asset
- Communications asset
- Container
- Kit/loadout
- Document/reference
- Fuel
- Water storage
- Food storage
- Spare part

Inventory states:

- Planned
- Need to acquire
- Owned
- Located
- Installed
- Configured
- Tested
- In service
- Maintenance due
- Failed
- Retired
- Expired

Attributes should be inferred where possible through barcode, template, asset
tag, photo, or repeated use.

## Machinery And Tool Taxonomy

Track fabrication and repair capability.

Examples:

- FDM 3D printer
- Resin printer
- Soldering station
- Multimeter
- Oscilloscope
- Bench power supply
- Cordless drill
- Impact driver
- Drill press
- Angle grinder
- Circular saw
- Miter saw
- Table saw
- Band saw
- Welder
- Air compressor
- Sewing machine
- Vacuum sealer
- Food dehydrator
- Pressure canner
- Generator
- Battery charger/analyzer
- CNC router
- Laser cutter
- Metalworking tools

Machinery classifications:

- Essential
- High-value
- Specialized
- Optional

Projects should identify required machinery and alternatives when the user does
not have it.

## BOM Model

Every build, install, fabrication, repair, stocking, or assembly capability
should use structured BOMs.

BOM fields:

- Item
- Quantity
- Functional requirement
- Specification
- Purpose
- Required or optional
- Estimated cost
- Consumable or durable
- Replacement interval
- Standardization considerations
- Compatible alternatives
- Already owned
- Need to acquire
- Need to fabricate
- Need to configure

Principle: specify the functional requirement before recommending specific
products.

## Consolidated Acquisition System

Basecamp automatically derives acquisition requirements from active quests,
accomplishments, projects, and BOMs.

Views:

- Already owned
- Need to purchase
- Need to make
- Need to build
- Need to replenish
- Optional
- Acceptable substitutes

The user should not manually maintain a separate shopping list.

## Acquire, Build, Make, Configure, Learn, Practice, Test, Maintain

Applicable accomplishments should distinguish:

- Acquire: commercial equipment, supplies, materials, and parts.
- Build: systems or assemblies.
- Make: fabricated items.
- Configure: equipment or software setup.
- Learn: knowledge.
- Practice: repeated skill work.
- Test: capability validation.
- Maintain: recurring reliability work.

This distinction makes readiness scoring more honest and recommendations more
useful.

## Drill System

Supported drills:

- Power outage
- Water outage
- Communications outage
- Internet outage
- GPS-free navigation
- Evacuation
- Fire response
- Medical response
- Grid-independent cooking
- Vehicle breakdown

Drill capture:

- Scenario
- Success criteria
- Result
- Failures
- Lessons
- Evidence
- Follow-up actions

Drill failures should create suggested improvement quests. Reports should be
short and confirmation-based.

## Maintenance System

Recurring maintenance examples:

- Rotate water
- Rotate food
- Test generator
- Charge batteries
- Test radios
- Inspect medical supplies
- Replace expired supplies
- Inspect fire extinguishers
- Test smoke and CO detectors
- Exercise valves
- Inspect fuel storage
- Update documents
- Test communications

Normal maintenance completion should require approximately one interaction.
Basecamp automatically calculates the next due date.

## Data-Entry UX Strategy

Minimize:

- Manual data entry
- Long forms
- Repeated data entry
- Administrative maintenance
- Excessive navigation
- Unnecessary metadata
- Duplicate records

Prefer:

- One-tap actions
- Quick Capture
- Smart defaults
- Automatic relationships
- Templates
- Search-first workflows
- Barcode scanning
- QR scanning
- Photos
- Voice input
- Automatic timestamps
- Bulk actions
- Suggested actions
- Automatic maintenance scheduling
- Context-aware forms
- Progressive disclosure

## Quick Capture Architecture

Input examples:

- "Bought four gallons of water."
- "Changed generator oil."
- "Completed CPR course."
- "Added two handheld radios."
- "Tested generator for 30 minutes."
- "Battery #3 failed."
- "Completed outage drill."

Pipeline:

1. Capture raw text, voice transcription, scan, photo, or action event.
2. Classify intent: inventory, maintenance, accomplishment progress, skill,
   drill, equipment failure, or follow-up action.
3. Infer target entities using item names, asset tags, category terms, active
   quests, timestamps, and user defaults.
4. Present a confirmation card with minimal editable fields.
5. Write confirmed commands into the local change queue.
6. Sync to the server and update progress, maintenance, inventory, and
   recommendations.

Mandatory fallback:

- Quick Capture must work with deterministic templates and user confirmation.
- Optional AI parsing can be added later as a self-hosted or bring-your-own
  connector, but Basecamp cannot require a SaaS model for normal operation.

## Barcode And QR Strategy

Commercial barcode flow:

1. Scan barcode.
2. Identify or suggest item metadata.
3. Confirm item, quantity, expiration, location, and category.
4. Update inventory and related quests/BOMs.

Basecamp QR asset tag flow:

1. Generate QR codes for radios, generators, batteries, water containers,
   medical kits, tools, storage bins, fuel containers, go-bags, and equipment
   cases.
2. Scan tag.
3. Open asset with actions: inspect, use, maintain, move, adjust quantity,
   report issue, view instructions, view associated quest.

QR tags should work on the local network and degrade gracefully offline.

## Offline Strategy

Critical offline information:

- Emergency plans
- Contacts
- Inventory
- Equipment instructions
- Checklists
- Active quests
- Critical BOMs
- Medical references
- Communications plans
- Evacuation information

Offline write support:

- Inventory updates
- Maintenance completion
- Drill recording
- Quest step completion
- Photos/evidence
- Asset issues
- Quick Capture commands

Mobile and web should use a local cache with a command outbox. Sync resumes when
connectivity returns.

## Synchronization Strategy

Recommended approach:

- Server remains the authoritative source of truth.
- Clients keep local read models and a durable command outbox.
- Commands are idempotent and include client ID, local sequence, entity version,
  timestamp, and user intent.
- Server accepts clean commands, rejects invalid commands with actionable error
  states, and returns updated sync cursors.
- Most conflicts resolve by entity-specific merge policy.
- High-risk conflicts require user confirmation.

Conflict examples:

- Quantity changes: merge additive inventory events rather than overwriting
  totals.
- Asset maintenance: keep both events, recompute next due date from policy.
- Quest status: preserve explicit user pause/abandon decisions over automated
  recommendation changes.
- Evidence edits: version evidence records rather than deleting data silently.

## Database Schema

The detailed schema draft lives in [Data Model](../architecture/data-model.md).

Core entity groups:

- Identity and household/workspace
- Categories and capability levels
- Quests, accomplishments, steps, dependencies, and unlocks
- Inventory, assets, locations, kits/loadouts, and asset tags
- Location progression from known place to outpost to home base
- BOMs, acquisition requirements, substitutions, and projects
- Skills, practice events, validations, and certifications
- Drills, scenarios, results, failures, lessons, and follow-up quests
- Maintenance schedules, completions, failures, and next due calculations
- Evidence, photos, documents, notes, and source references
- XP, badges, capability outposts, milestones, and readiness scores
- Sync clients, command outbox, audit events, and conflict records

## API Architecture

Recommended approach:

- TypeScript API contracts shared through `@basecamp/api`.
- Server API in `apps/server`.
- Web and mobile clients generated or typed from the same contract.
- Route boundaries follow workflows, not raw tables.

API groups:

- `/session`
- `/dashboard`
- `/categories`
- `/quests`
- `/recommendations`
- `/inventory`
- `/assets`
- `/bom`
- `/projects`
- `/skills`
- `/drills`
- `/maintenance`
- `/capture`
- `/sync`
- `/reports`
- `/admin`
- `/export`
- `/health`

## Web Application Architecture

Recommended approach:

- React + TypeScript.
- Evaluate Next.js as the initial web framework because it supports React,
  routing, self-hosted standalone deployment, progressive enhancement, local
  network operation, and clear app composition.
- Keep server application services in `apps/server`; avoid hiding core domain
  services inside web-only route handlers.
- Use `@basecamp/ui` for UI imports.

Alternatives considered:

- Vite SPA plus Fastify: simpler client build, but pushes more routing and data
  loading work into custom code.
- Remix: strong web foundations, but Kaizen compatibility and local app
  conventions still need validation.
- Plain React SPA: easy to host, weaker full-product application structure.

Migration path:

- Because domain, API, UI, content, gamification, and sync are package-bound,
  the web framework can change without rewriting the product core.

## Mobile Application Architecture

Recommended approach:

- React Native with Expo modules for iOS/Android delivery, shared TypeScript
  domain/API packages, barcode/QR/photo support, offline storage, rapid
  iteration, and local/admin-controlled native builds.
- Launch v1 with iPhone after physical-device validation; defer Android to the
  post-v1 Android milestone because no Android test phone is currently
  available.
- Local SQLite cache and durable sync outbox.
- Use mobile-native components and shared design tokens rather than directly
  reusing Kaizen React web components.

Alternatives considered:

- PWA-only mobile: lower maintenance, weaker scanner/camera/offline integration.
- Native Swift/Kotlin: best platform integration, higher implementation cost and
  less shared domain/API code.
- Flutter: strong cross-platform UI, weaker reuse with React/Kaizen web stack.

Migration path:

- Keep mobile domain/API/sync shared; platform UI can be replaced without
  changing preparedness core logic.

## Server Architecture

Recommended approach:

- Node.js + TypeScript API service with a small, explicit framework such as
  Fastify.
- PostgreSQL primary database.
- Background jobs for maintenance scheduling, reminders, recalculation,
  imports, exports, and backup verification.
- Local-first sync endpoints for offline clients.

Alternatives considered:

- Next.js-only backend: convenient early, but blurs web/server ownership and
  complicates mobile sync boundaries.
- NestJS: batteries included, but heavier abstraction for the first phase.
- Go/Rust backend: excellent operations profile, less TypeScript sharing.

Migration path:

- API contracts and domain services remain package-owned.

## Monorepo Architecture

Use one GitHub monorepo:

```text
apps/
  web/
  mobile/
  server/
packages/
  domain/
  database/
  api/
  ui/
  content/
  gamification/
  sync/
infra/
docs/
scripts/
tests/
```

Rationale:

- Shared TypeScript domain model.
- Shared API contracts.
- Shared content, scoring, and sync logic.
- Single CI, issue tracker, docs, and release record.
- Easier coordination between web, mobile, backend, content, and design system.

Risk:

- Monorepos can become tangled.

Mitigation:

- Package boundaries, explicit dependency rules, code owners later, and CI
  checks.

## GitHub Development Workflow

Establish:

- README
- Product requirements
- Architecture documentation
- Development environment
- Issue templates
- Feature request template
- Bug template
- Pull request template
- CI
- Automated tests
- Database migrations
- Seed-data workflow
- Release process
- Versioning strategy
- Architecture Decision Records
- Security guidance
- Backup documentation
- Deployment documentation
- UI architecture documentation
- Kaizen integration documentation
- Component development guidance

Work tracking:

- Software engineering work lives in GitHub Issues/Projects.
- Personal preparedness progress lives inside Basecamp.

Branching:

- `main` stays releasable.
- Feature branches use concise names.
- PRs include validation, architecture impact, offline/sync impact, and
  accessibility impact.

## Main Navigation

Primary web navigation:

- Dashboard
- Quests
- Progress Map
- Categories
- Inventory
- Projects
- Skills
- Drills
- Maintenance
- Reports
- Settings

Mobile navigation:

- Home
- Capture
- Scan
- Quests
- Inventory
- Offline

## Dashboard UX

Dashboard answers:

- Where am I?
- What can I work on next?
- What did I accomplish recently?
- What needs attention?
- What gaps remain?

Dashboard sections:

- Overall Readiness Score
- Overall preparedness level
- Category levels
- Category progress
- Active quests
- Quest backlog
- Recommended quests
- Recent badges
- Capability outposts earned
- Progress toward upcoming capability outposts
- Major gaps
- Upcoming maintenance
- Upcoming drills
- Recent activity

Actionable information should outrank raw statistics.

## Progress Map UX

The progress map is a defining Basecamp experience.

Each category has a path. Nodes represent:

- Accomplishments
- Skills
- Builds
- Tests
- Drills
- Milestones
- Outposts

Node states:

- Completed
- Current
- Available
- Locked
- Deferred
- Failed validation
- Maintenance required

Connections represent meaningful dependencies. The map should show many valid
routes through preparedness rather than one mandatory line.

Accessibility:

- Every map node must also be represented in a keyboard/screen-reader navigable
  list.
- Do not rely only on color, position, or animation.

## Category Progression UX

Example category view:

```text
Water
Level 1
[complete] Calculate household water requirements
[complete] Store emergency drinking water
[complete] Learn water shutoff procedure
[complete] Establish purification capability
[complete] Complete outage test

Level 1 Complete

Actions:
- Continue to Level 2
- Browse Level 2 Quests
- Hold at Level 1
- Add Level 2 to Backlog
```

## Quest-Selection UX

Quest discovery should show curated options instead of a single forced path.

Filters:

- Category
- Level
- Time available
- Cost
- Effort
- Required equipment
- Required machinery
- Skill focus
- Quick win
- Weekend project
- Drill
- Maintenance

Each quest card should show:

- Why it matters
- Estimated time/cost
- What it unlocks
- Active dependencies
- Required acquisition/build/make/configure/learn/practice/test/maintain work
- Progress and evidence state

## Gamification UX

Gamification should feel like practical capability, not superficial points.

Use:

- XP
- Category levels
- Quest completion
- Progress paths
- Badges
- Badge tiers
- Outposts
- Major achievements
- Milestones
- Challenge quests
- Skill progression
- Drill achievements
- Maintenance achievements

Avoid:

- Streak pressure that punishes emergencies or real life.
- High scores based on shopping.
- Childish celebration for serious safety tasks.

## Basecamp Visual Direction

Visual language:

- Rugged
- Modern
- Technical
- Clean
- Premium
- Outdoors-oriented
- Serious
- Capable
- Inviting

Signature UI elements:

- Quest nodes
- Progress maps
- Outpost badges
- Capability badges
- Category artwork
- Preparedness illustrations
- Milestone celebrations
- Readiness gauges
- Survival-oriented iconography
- Progress rings
- Equipment-status visualizations

## Kaizen Integration Architecture

Kaizen is a preferred web UI foundation, not the Basecamp brand.

Layering:

```text
apps/web
  -> @basecamp/ui
    -> @nvidia/foundations-react-core
```

Rules:

- Feature code imports `@basecamp/ui`.
- `packages/ui` wraps Kaizen primitives where Basecamp needs stable semantics,
  styling, variants, accessibility, or repeated composition.
- Do not wrap every trivial primitive.
- Do not create duplicate button, modal, form, toast, or color systems.
- Tailwind or utilities may be evaluated for layout only, not for casually
  overriding Kaizen component appearance across the codebase.

Current checked package:

- `@nvidia/foundations-react-core@1.7.0`
- Apache-2.0
- Unstyled React implementation
- React peer dependencies: `^18.0.0 || ^19.0.0`
- Includes `kui-sync-skills`

## Kaizen Dependency And Versioning Strategy

Use pinned versions. Document:

- Installed Kaizen version.
- Upgrade procedure.
- Breaking-change review process.
- CSS integration method.
- Asset licensing considerations.
- Basecamp overrides.
- Adapter-layer responsibilities.

Upgrade procedure:

1. Read package changelog/release notes.
2. Run `pnpm view` to confirm package metadata.
3. Update dependency in `packages/ui`.
4. Run component catalog tests.
5. Run accessibility checks.
6. Run visual regression checks once available.
7. Run `pnpm exec kui-sync-skills` if supported by the installed package.
8. Update Kaizen integration docs.

## Kaizen CSS And Offline Asset Strategy

Basecamp must run without internet access after deployment.

Rules:

- No CDN stylesheet dependency for normal operation.
- No remotely hosted fonts, icons, or assets for normal operation.
- Bundle allowed Kaizen CSS/assets into the web build.
- Prefer external/non-proprietary Kaizen stylesheet assets when licensing
  permits, such as `base-external.css`, if present in the selected package set.
- Do not assume rights to redistribute NVIDIA-proprietary branding, icons,
  fonts, or restricted assets.

Because `@nvidia/foundations-react-core` is currently unstyled, `packages/ui`
must explicitly decide which CSS/token package or Basecamp theme assets provide
visual styling.

## Basecamp Theme Architecture

Theme ownership:

- Kaizen foundations for primitives, accessibility, typography intent, controls,
  interaction states, and token conventions where supported.
- Basecamp UI layer for product identity, category colors, progress map visuals,
  badge art, readiness gauges, status semantics, and theme composition.

Do not scatter hard-coded colors and spacing through feature code.

## Mobile/Web Design-System Boundary

Mobile should share:

- Product language
- Design tokens where practical
- Colors
- Typography intent
- Iconography
- Badge artwork
- Spacing principles
- Interaction patterns
- Domain concepts
- Gamification semantics

Mobile should not directly reuse Kaizen React web components. It should use
mobile-native components appropriate to React Native/Expo.

## UI Component Governance

Before building a new web component:

1. Determine whether Kaizen provides the required primitive.
2. Prefer composition of existing Kaizen primitives.
3. Expose the Basecamp-approved implementation through `packages/ui`.
4. Build custom UI only when Kaizen does not satisfy the requirement or when the
   component represents Basecamp-specific product behavior.

Avoid:

- Duplicate button systems
- Duplicate modal systems
- Multiple form-control implementations
- Multiple notification/toast systems
- Ad hoc color values
- Random spacing values
- Feature-specific design systems

Create a component catalog before broad feature implementation.

## Accessibility Strategy

Target:

- Keyboard navigation
- Clear focus states
- Screen-reader compatibility
- Semantic HTML
- Color contrast
- Reduced-motion support
- Touch-target sizing
- Form labeling
- Meaningful error states

Custom gamification components must be usable without relying exclusively on
color, position, animation, or visual artwork.

## Agent-Skill Synchronization Strategy

The checked Kaizen package exposes `kui-sync-skills`. Once `packages/ui` installs
Kaizen:

```bash
pnpm exec kui-sync-skills
```

Goals:

- Keep coding-agent guidance tied to the actual installed Kaizen version.
- Provide instructions for Codex, Claude, Cursor, and other repository-aware
  agents when supported.
- Avoid relying on general model memory of Kaizen APIs.

Store generated guidance in an appropriate repository location and review it as
part of Kaizen upgrades.

## Initial Seed Dataset

Seed data starts in:

- `packages/content/seed/basecamp-seed-v0.json`

Initial seed includes:

- 17 categories
- 6 levels
- starter quests across water, power, communications, evacuation, medical,
  navigation, inventory, maintenance, and drills
- badge concepts
- milestone concepts

Content standards:

- Functional requirements before product recommendations.
- Validation before high readiness credit.
- Evidence should be useful but not tedious.
- Personal deferral is allowed.

## Deployment Architecture

Basecamp targets portable deployment profiles rather than a single orchestrator.
See [ADR 0010](../adr/0010-production-deployment-targets.md) and
[Basecamp v1.0 MVP Readiness](./v1-mvp-readiness.md).

Core production shape:

- Static web application artifact.
- Stateless API/sync server.
- PostgreSQL production database target. v0.9.1 includes the migration, seed,
  status, and portable SQLite import path; v0.9.2 promotes the API runtime
  adapter through `BASECAMP_DATABASE_KIND=postgresql` and
  `BASECAMP_DATABASE_URL`.
- Evidence/document storage abstraction, starting with filesystem storage and
  allowing S3-compatible object storage later.
- Reverse proxy and TLS controlled by the deployment environment.
- Secrets injected by the deployment environment.
- Explicit migrations, health checks, backups, restore drills, export, import,
  and audit events.

Primary deployment profiles:

- `local-dev`: contributor machine, local SQLite, fast iteration, no production
  claims.
- `cloud-pilot`: v1 MVP server for the admin and one trusted friend using real
  data. Current target is an x86_64/amd64 server running Ubuntu 22.04 LTS with
  12 GB or 16 GB RAM, admin-created username/password accounts, no SSO, local
  disk backups, logs/metrics, and a guarded reset/seed path for disposable QA
  windows that refuses the `homelab` profile. Ubuntu 22.04 LTS is accepted for
  v1 while it remains in standard security maintenance through May 2027;
  migration to Ubuntu 24.04 LTS is deferred until the admin explicitly requests
  it.
- `homelab`: post-MVP admin-controlled home network deployment, likely LAN-only
  at first, with UniFi handling IP assignment, hostname, DNS, and routing. TLS
  should be added when this profile comes online or any remote access is enabled.

Docker Compose is the current single-node reference adapter for the M6 beta. It
can support the v1 cloud pilot and later homelab testing, but it must
not become the only expression of production behavior.

## Backup And Recovery Strategy

Backup targets:

- PostgreSQL dumps and WAL/archive strategy when appropriate.
- Basecamp runtime backup manifests that record the active database kind.
- Evidence/photo/document storage.
- Configuration.
- Deployment profile metadata.
- Seed/content version.
- Exportable personal data archive.

Requirements:

- Scheduled backups.
- Restore documentation.
- Restore drill.
- Backup integrity check.
- Clear warning when backups are stale or failing.

## Automated Testing Strategy

Test priorities:

- Domain invariants.
- Readiness scoring.
- Quest dependencies.
- Recommendation logic.
- Badge, outpost, and milestone requirements.
- Content validation.
- Database migrations and seed data.
- API contracts.
- Sync and conflict resolution.
- Offline workflows.
- Accessibility.
- Visual regression for core UI once implemented.
- Backup and restore.

Initial CI:

- Root repository check validates required docs and seed JSON.

## Workflow Friction Evaluation

Significant workflows must evaluate:

- Number of taps/clicks.
- Number of manually entered fields.
- Information that can be inferred.
- Information that can be automatically populated.
- Whether scanning, photography, voice, templates, or automation can reduce
  effort.

Initial workflow targets:

| Workflow | Target interaction cost | Inferred data | Automation |
| --- | --- | --- | --- |
| Complete maintenance | 1 tap after asset selection | timestamp, next due date, asset, policy | QR scan opens asset |
| Add inventory from barcode | scan plus confirm | product metadata, category, quantity defaults | barcode lookup, templates |
| Complete quest step | 1-2 taps | quest, step, timestamp | active quest context |
| Record drill | 3-5 taps plus optional notes/photos | scenario, date, participants, active failures | creates follow-up quests |
| Report equipment failure | scan plus confirm | asset, maintenance impact, affected quests | creates repair/replacement action |
| Capture "bought four gallons of water" | confirm card | inventory item, category, quantity, acquisition event | Quick Capture parser |

## Major Architecture Decisions

Decision summaries are recorded as ADRs:

- [ADR 0001: Monorepo, TypeScript, React](../adr/0001-monorepo-typescript-react.md)
- [ADR 0002: Basecamp UI Kaizen Adapter](../adr/0002-basecamp-ui-kaizen-adapter.md)
- [ADR 0003: Local-First Self-Hosted Sync](../adr/0003-local-first-self-hosted-sync.md)
- [ADR 0004: Vite, React, Fastify Vertical Slice](../adr/0004-vite-react-fastify-vertical-slice.md)
- [ADR 0005: SQLite Baseline, PostgreSQL Target](../adr/0005-sqlite-baseline-postgresql-target.md)
- [ADR 0006: Readiness Quest Core Engine](../adr/0006-readiness-quest-core-engine.md)
- [ADR 0007: Location Progression And Home Bases](../adr/0007-location-progression-and-home-bases.md)
- [ADR 0008: Mobile Expo Offline Sync](../adr/0008-mobile-expo-offline-sync.md)
- [ADR 0011: Local Mobile Build Path](../adr/0011-local-mobile-build-path.md)
- [ADR 0009: Self-Hosting Beta SQLite Ops](../adr/0009-self-hosting-beta-sqlite-ops.md)
- [ADR 0010: Production Deployment Targets And Profiles](../adr/0010-production-deployment-targets.md)

## Implementation Phases

Phase 0: Architecture and repository foundation

- Monorepo skeleton.
- Product architecture.
- ADRs.
- Seed data.
- GitHub templates.
- CI repository check.

Phase 1: Running vertical slice

- Implement domain types for categories, levels, quests, accomplishments,
  inventory, evidence, and maintenance.
- Implement server health and seed endpoints.
- Implement web shell with dashboard, category list, and active quests.
- Implement `@basecamp/ui` with initial Kaizen adapter spike.
- Add database schema and migrations.
- Add automated tests for seed, scoring draft, and quest dependencies.

Phase 2: Readiness and quest core

- Category progression paths.
- Quest lifecycle.
- Accomplishment completion.
- Dependency graph.
- Readiness score v1.
- Recommendation engine v1.
- Badge and capability outpost progress v1.

Phase 3: Inventory, BOMs, and acquisition

- Inventory model.
- Locations, location progression, multiple home bases, kits/loadouts, assets,
  and QR tags.
- BOM model and acquisition rollups.
- Maintenance schedules and completion flows.
- Barcode lookup spike.

Phase 4: Mobile companion and offline

- Mobile app shell.
- Quick Capture.
- QR/barcode scan.
- Offline read models.
- Durable command outbox.
- Sync v1.

Phase 5: Drills, skills, reports, and validation

- Drill scenarios and result capture.
- Skill progression.
- Evidence and photo workflows.
- Reports and gap analysis.
- Validation ceilings in scoring.

Phase 6: Operations, backups, and release maturity

- Container deployment.
- Backup and restore.
- Data export.
- Monitoring and health.
- Release process.
- Security hardening.

## First Recommended Quests

Starter quest set:

- Calculate Household Water Requirements.
- Store 24-Hour Drinking Water.
- Label Household Utility Shutoffs.
- Build 72-Hour Water Reserve.
- Establish Basic Water Purification.
- Add Two Handheld Radios.
- Configure Local Radio Channels.
- Test Radio Communication Between Two Locations.
- Build Vehicle Emergency Kit.
- Create Go-Bag Inventory.
- Inspect Medical Supplies.
- Complete First Aid/CPR Training Record.
- Test Generator For 30 Minutes.
- Create Critical Load List.
- Complete One-Hour Power Outage Drill.
- Learn Compass Navigation Basics.
- Run Home Fire Safety Check.
- Create Document Backup Packet.

The first user-facing product slice should support choosing, starting, pausing,
and completing a few of these without forcing the rest.
