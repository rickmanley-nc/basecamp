# @basecamp/domain

Shared TypeScript domain model for preparedness concepts.

Owns:

- Category, capability level, quest, accomplishment, dependency, project, BOM, inventory, asset, skill, drill, maintenance, evidence, badge, outpost, milestone, and readiness-score types.
- Domain invariants that should be shared by web, mobile, server, content, gamification, and sync.
- Seed content mapping through `defineSeedDataset`, which turns the looser JSON seed shape into typed Basecamp domain templates.

Does not own:

- Database persistence details.
- UI rendering.
- External service adapters.

## Validation

```bash
pnpm --filter @basecamp/domain typecheck
```

The package includes a type fixture at `test/seed-mapping.ts` proving the current
seed dataset can be mapped into `BasecampSeed`.
