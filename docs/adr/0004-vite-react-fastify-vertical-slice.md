# ADR 0004: Vite, React, And Fastify For The Running Vertical Slice

Date: 2026-08-20

## Status

Accepted for M1.

## Context

M1 needs a first running Basecamp slice: web shell, server routes, shared API
contracts, validated content, a UI adapter, tests, and local development docs.
The architecture still prefers React because of the Kaizen UI Foundations
requirement.

## Decision

Use:

- Vite + React for `apps/web`.
- Fastify for `apps/server`.
- Shared contracts in `@basecamp/api`.
- Shared UI in `@basecamp/ui`.
- Shared seed content in `@basecamp/content`.

## Alternatives Considered

- Next.js: strong full-stack React framework, but heavier before Basecamp has a
  real routing/data-loading surface. It also risks blending web and server
  responsibilities before mobile sync boundaries are clear.
- Remix: strong web foundations and data loading, but more framework commitment
  than M1 needs.
- Plain React SPA without Vite: possible, but Vite gives a faster local loop and
  production build immediately.
- Next.js-only backend: convenient, but would blur `apps/web` and `apps/server`.
- NestJS: capable but heavier than the initial API surface.

## Consequences

- The first web app runs quickly on a local dev server.
- Server routes are explicit and reusable by future mobile sync work.
- The framework choice remains easy to revisit because domain, API, content, UI,
  database, and tests are package-owned.

## Risks

- Vite SPA routing may need to grow or be replaced for richer server-rendered web
  needs.
- Fastify leaves more architectural choices to Basecamp than a larger framework.

## Migration Path

If Basecamp later needs Next.js, Remix, or another React framework, keep
`@basecamp/domain`, `@basecamp/api`, `@basecamp/content`, `@basecamp/ui`,
`@basecamp/database`, and test fixtures intact and replace only the app shell.
