# ADR 0001: Monorepo, TypeScript, React

Date: 2026-08-20

## Status

Accepted for initial implementation planning.

## Context

Basecamp needs a primary web application, mobile companion, backend, database,
shared domain model, structured content, gamification, UI system, sync logic,
tests, infrastructure, and documentation. The web UI should align with Kaizen UI
Foundations, which points toward React.

## Decision

Use a single pnpm monorepo with TypeScript as the shared language for domain,
API, content, UI, gamification, and sync packages. Use React for the web
application. Evaluate Next.js as the first web framework during the running
vertical slice.

## Alternatives Considered

- Multiple repositories: clearer ownership at large scale, but too much
  coordination overhead for shared domain/content/sync work.
- Non-TypeScript backend: good runtime options, but weaker model sharing with
  web/mobile.
- PWA-only product: simpler delivery, weaker native mobile scanning/photo/offline
  capabilities.

## Consequences

- Shared models and tests are easier.
- Dependency boundaries must be actively maintained.
- CI should grow package-aware checks as implementation expands.

## Risks

- Monorepo coupling.
- Tooling complexity.
- Framework migration if Next.js proves wrong.

## Migration Path

Package boundaries keep domain, API, UI, content, gamification, and sync logic
portable if the web or server framework changes.
