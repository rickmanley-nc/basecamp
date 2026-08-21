# ADR 0005: SQLite Baseline With PostgreSQL Production Target

Date: 2026-08-20

## Status

Accepted for M1. Updated during v1 readiness work.

## Context

Basecamp's architecture identifies PostgreSQL as the preferred production source
of truth for self-hosting, but M1 needs a repeatable local migration and seed
import workflow without requiring a database server before the web/server slice
exists.

## Decision

Use Node 24's built-in `node:sqlite` module for the M1 local database baseline.
Keep migration SQL straightforward and compatible with the initial content shape.
Continue to target PostgreSQL for the self-hosted production architecture.

## Alternatives Considered

- Drizzle: strong TypeScript schema story and useful later, but adds tooling
  before the persistence model is proven.
- Prisma: mature migration and client tooling, but heavier and less aligned with
  offline/mobile SQLite-shaped data.
- Kysely: excellent typed SQL builder, but still requires selecting a driver and
  migration layer.
- Raw PostgreSQL only: closest to production, but slows local onboarding for the
  first vertical slice.

## Consequences

- M1 can apply a migration and import seed data locally with no external service.
- Database tests run in memory.
- The schema is intentionally small: categories, levels, quest templates, seed
  import tracking, and migration tracking.

## Risks

- `node:sqlite` is still marked experimental in Node and emits a warning.
- SQLite SQL and PostgreSQL SQL are not perfectly identical.
- The first schema is a baseline, not the final persistence architecture.

## Migration Path

v0.9.1 adds the first PostgreSQL production-persistence path without removing
the SQLite beta runtime:

- Existing SQLite migration files are translated into PostgreSQL-compatible DDL.
- PostgreSQL operator scripts apply migrations, import seed content, report
  status, and import portable SQLite beta exports.
- The portable export/import bridge is the documented migration path when a
  direct runtime migration is not available.

v0.9.2 promotes the PostgreSQL API runtime adapter:

- Server startup selects SQLite or PostgreSQL through `BASECAMP_DATABASE_KIND`.
- PostgreSQL runtime mode requires `BASECAMP_DATABASE_URL`.
- Local-user ops, admin status, portable export/import, and runtime backup
  status use the selected database runtime.

SQLite remains useful for local development and mobile/offline-shaped data, but
it is not the production database target.
