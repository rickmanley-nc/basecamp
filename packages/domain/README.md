# @basecamp/domain

Shared TypeScript domain model for preparedness concepts.

Owns:

- Category, capability level, quest, accomplishment, dependency, project, BOM, inventory, asset, skill, drill, maintenance, evidence, badge, outpost, milestone, and readiness-score types.
- Domain invariants that should be shared by web, mobile, server, content, gamification, and sync.

Does not own:

- Database persistence details.
- UI rendering.
- External service adapters.
