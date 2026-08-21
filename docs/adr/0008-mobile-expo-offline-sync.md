# ADR 0008: Mobile Stack And Offline Sync Foundation

Date: 2026-08-21

## Status

Accepted for M4 foundation. The build and distribution boundary is superseded
by [ADR 0011](./0011-local-mobile-build-path.md).

## Context

Basecamp Mobile must support field workflows where connectivity is unreliable:
quick capture, QR/barcode scanning, offline reference, queued commands, and later
sync to the self-hosted server. It also needs local/admin-controlled iOS and
Android build paths so app updates do not depend on a cloud build service.

## Decision

Use Expo React Native as the mobile stack for the iOS and Android companion app,
subject to the local build requirements in ADR 0011.

The M4 foundation starts with:

- A typed mobile shell in `apps/mobile` with Home, Capture, Scan, Quests,
  Inventory, and Offline routes.
- Shared deterministic command primitives in `@basecamp/sync`.
- A server sync endpoint that accepts idempotent offline command batches and
  returns sync cursors plus user-visible conflicts.
- Local native project generation and platform builds for iOS and Android.

The first app shell remains available as a local TypeScript preview and
navigation model. The native Expo entrypoint now supports server URL entry,
local username/password sign-in, native field tabs, CameraView scan handling,
photo/document evidence selection, SecureStore token storage, AsyncStorage
outbox persistence, evidence upload, and reconnect sync attempts.

## Alternatives Considered

- Web-only/PWA mobile: lower native maintenance but weaker camera, offline, local
  storage, and iOS permission behavior for field use.
- Fully native SwiftUI first: strong iOS integration, but less code sharing with
  the TypeScript domain, API, and sync packages.
- Custom native bridge from the start: too much complexity before the command and
  sync contracts are proven.

## Consequences

- Shared TypeScript packages stay the contract between web, server, and mobile.
- Mobile camera, local-network, Photos/Documents access, offline storage across
  app restart, evidence upload, and reconnect behavior still require physical
  iPhone and Android validation before v1.
- App artifacts must be produced through local/admin-controlled build hosts.
  Platform distribution channels remain separate from the build system.

## Validation Boundary

Shared mobile logic validates locally through `pnpm check` and
`pnpm --filter @basecamp/mobile dev`. Expo configuration validates with
`pnpm --filter @basecamp/mobile expo:config`. Physical iPhone and Android
validation for install, camera, Photos/Documents access where applicable, Local
Network permission where applicable, offline device storage, evidence upload,
and reconnect behavior remains pending until locally produced signed builds are
installed.
