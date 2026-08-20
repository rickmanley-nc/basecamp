# @basecamp/content

Structured preparedness content for Basecamp.

Owns:

- Categories, level expectations, quest templates, accomplishment templates, BOM templates, drills, maintenance templates, badges, outposts, milestones, and seed curriculum.
- Content validation rules so real-world capability is measured by ownership, installation, configuration, practice, tests, validation, and maintenance.

Seed data starts in `seed/basecamp-seed-v0.json`.

## Validation

`validateSeedDataset` checks duplicate IDs, category references, level
references, quest dependencies, validation criteria, BOM functional
requirements, and badge/outpost/milestone requirements.

```bash
pnpm --filter @basecamp/content typecheck
```
