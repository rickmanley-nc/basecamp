# ADR 0008: Mobile Stack And Offline Sync Foundation

Date: 2026-08-21

## Status

Accepted for M4 foundation.

## Context

Basecamp Mobile must support field workflows where connectivity is unreliable:
quick capture, QR/barcode scanning, offline reference, queued commands, and later
sync to the self-hosted server. It also needs a future distribution path that
does not require normal users to build from source.

## Decision

Use Expo React Native as the mobile stack for the iPhone companion app.

The M4 foundation starts with:

- A typed mobile shell in `apps/mobile` with Home, Capture, Scan, Quests,
  Inventory, and Offline routes.
- Shared deterministic command primitives in `@basecamp/sync`.
- A server sync endpoint that accepts idempotent offline command batches and
  returns sync cursors plus user-visible conflicts.
- TestFlight as the intended private beta distribution path once Apple developer
  credentials and build automation are available.

The first M4 app shell is a local TypeScript preview and navigation model. Native
Expo screens, camera bindings, secure storage, and TestFlight build automation can
build on this foundation without changing the command contract.

## Alternatives Considered

- Web-only/PWA mobile: lower native maintenance but weaker camera, offline, local
  storage, and iOS permission behavior for field use.
- Fully native SwiftUI first: strong iOS integration, but less code sharing with
  the TypeScript domain, API, and sync packages.
- Custom native bridge from the start: too much complexity before the command and
  sync contracts are proven.

## Consequences

- Shared TypeScript packages stay the contract between web, server, and mobile.
- Mobile camera and local-network behavior still require physical iPhone
  validation once native screens are wired.
- Normal users should install through TestFlight or a stable Apple-supported
  channel; contributor builds remain separate.

## Validation Boundary

M4 validates shared mobile logic locally through `pnpm check` and
`pnpm --filter @basecamp/mobile dev`. Physical iPhone validation for camera,
Local Network permission, TestFlight installation, offline device storage, and
reconnect behavior remains pending until a signed mobile build exists.
