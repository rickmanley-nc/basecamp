# Basecamp Web

The web application is the primary Basecamp product and source of truth.

Responsibilities:

- Dashboard, readiness score, category levels, outposts, badges, maintenance, and recent activity.
- Quest discovery, active quest management, backlog, pause/defer controls, and recommendations.
- Progress maps for categories, accomplishments, skills, builds, tests, drills, milestones, and outposts.
- Inventory, BOMs, projects, drills, reports, system configuration, imports, exports, and admin.
- Local-network operation without internet once deployed.

Architectural rule:

- Feature code imports Basecamp UI components from `@basecamp/ui`.
- Feature code does not import Kaizen packages directly except inside approved integration tests or migration spikes.

## M1 Local Run

```bash
pnpm --filter @basecamp/web dev
```

The Vite dev server runs on `http://127.0.0.1:4318` and proxies API requests to
the local Basecamp server on port `4317`.
