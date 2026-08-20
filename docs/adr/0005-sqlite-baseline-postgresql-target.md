# ADR 0005: SQLite Baseline With PostgreSQL Production Target

Date: 2026-08-20

## Status

Accepted for M1.

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

When M2/M3 persistence needs harden, introduce the selected database toolkit and
PostgreSQL migrations while retaining SQLite-compatible read models for mobile
and offline workflows.
