# Basecamp

Basecamp is a self-hosted preparedness platform for learning, planning,
building, validating, and maintaining real-world resilience.

The product goal is a single source of truth for household and small-team
preparedness: quests, progression, projects, bills of materials, inventory,
skills, drills, maintenance, scoring, badges, and offline field use.

## Status

This repository is in initial architecture and bootstrap. The first checked-in
deliverable is the product architecture, implementation plan, monorepo layout,
GitHub workflow, and seed content model.

## Repository Map

```text
apps/
  web/       Primary self-hosted web application
  mobile/    Mobile companion for capture, scanning, field use, and offline reference
  server/    API, sync, jobs, and application services
packages/
  domain/        Shared preparedness domain model
  database/      Schema, migrations, seed workflow, repositories
  api/           API contracts and client libraries
  ui/            Basecamp UI system and Kaizen adapter boundary
  content/       Structured curriculum, quests, badges, milestones, and seed content
  gamification/  XP, scoring, badges, outposts, milestones, and unlock logic
  sync/          Offline sync and conflict-resolution primitives
infra/       Linux self-hosting, containers, backups, and operations
docs/        Product, architecture, UI, operations, and development docs
scripts/     Repository automation
tests/       Cross-package test fixtures and integration tests
```

## Architecture Docs

- [Product Architecture And Plan](docs/product/architecture-and-plan.md)
- [Roadmap](docs/product/roadmap.md)
- [Data Model](docs/architecture/data-model.md)
- [Kaizen UI Integration](docs/ui/kaizen-integration.md)
- [Development Workflow](docs/development/workflow.md)
- [GitHub Planning Workflow](docs/development/github-planning.md)
- [Release Process](docs/development/releases.md)
- [Self-Hosting And Backups](docs/ops/self-hosting-and-backups.md)
- [Seed Dataset](packages/content/seed/basecamp-seed-v0.json)

## Current Verified Inputs

- GitHub repository: `rickmanley-nc/basecamp`
- Kaizen React package checked on 2026-08-20:
  `@nvidia/foundations-react-core@1.7.0`, Apache-2.0, unstyled,
  React 18/19 peer dependencies, includes `kui-sync-skills`.

## Development

Basecamp uses a pnpm monorepo. Until the application packages are implemented,
the root check validates required repository documents and the seed dataset.

```bash
pnpm check
```

Roadmap labels, milestones, and issues can be synced to GitHub with:

```bash
pnpm roadmap:sync -- --repo rickmanley-nc/basecamp --write
```

When using the Codex desktop bundled runtime, make sure its Node and pnpm paths
are on `PATH`, or use a local Node.js 24+ and pnpm 11+ installation.
