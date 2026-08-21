# Basecamp

Basecamp is a self-hosted preparedness platform for learning, planning,
building, validating, and maintaining real-world resilience.

The product goal is a single source of truth for household and small-team
preparedness: quests, progression, projects, bills of materials, inventory,
skills, drills, maintenance, scoring, badges, and offline field use.

## Status

This repository has a running web/server slice, mobile/offline contracts,
readiness and quest logic, inventory, maintenance, drills, skills, validation
reports, and the first self-hosting beta artifacts. Current work is still early,
but Basecamp can now be run locally, packaged through Docker Compose, backed up,
restored, exported, and imported for beta review.

Docker Compose is the current single-node reference adapter. The production
deployment architecture targets a cloud-pilot MVP first and a later homelab
profile, with separable web, API, database, storage, secrets, backup, restore,
and proxy responsibilities. SQLite remains the default local-dev database, while
the cloud-pilot API runtime can be switched to PostgreSQL with
`BASECAMP_DATABASE_KIND=postgresql` and `BASECAMP_DATABASE_URL`.

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
  gamification/  XP, scoring, badges, capability outposts, milestones, and unlock logic
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
- [Verification Policy](docs/development/verification.md)
- [Release Process](docs/development/releases.md)
- [Deployment Guide](docs/ops/deployment.md)
- [Mobile Build And Installation Guide](docs/ops/mobile-build-and-installation.md)
- [iPhone Installation Guide](docs/ops/iphone-installation.md)
- [Self-Hosting And Backups](docs/ops/self-hosting-and-backups.md)
- [Production Deployment ADR](docs/adr/0010-production-deployment-targets.md)
- [Local Mobile Build ADR](docs/adr/0011-local-mobile-build-path.md)
- [Seed Dataset](packages/content/seed/basecamp-seed-v0.json)

## Current Verified Inputs

- GitHub repository: `rickmanley-nc/basecamp`
- Kaizen React package checked on 2026-08-20:
  `@nvidia/foundations-react-core@1.7.0`, Apache-2.0, unstyled,
  React 18/19 peer dependencies, includes `kui-sync-skills`.

## Development

Basecamp uses a pnpm monorepo. The root check validates repository documents,
seed content, package type checks, smoke tests, and the web build.

```bash
pnpm install
pnpm check
```

Run the local database seed import:

```bash
pnpm --filter @basecamp/database db:reset
```

Run the server and web app in separate terminals:

```bash
pnpm --filter @basecamp/server dev
pnpm --filter @basecamp/web dev
```

Server: `http://127.0.0.1:4317`  
Web: `http://127.0.0.1:4318`

The self-hosting beta starts from `infra/compose.yml`. See
[Deployment Guide](docs/ops/deployment.md).

Useful API surfaces include:

- `GET /api/dashboard`
- `PATCH /api/categories/:categoryId/pursuit`
- `POST /api/quests/:questId/actions`
- `GET /api/reports/gaps`
- `GET /api/admin/status`

Roadmap labels, milestones, and issues can be synced to GitHub with:

```bash
pnpm roadmap:sync -- --repo rickmanley-nc/basecamp --write
```

When using the Codex desktop bundled runtime, make sure its Node and pnpm paths
are on `PATH`, or use a local Node.js 24+ and pnpm 11+ installation.
