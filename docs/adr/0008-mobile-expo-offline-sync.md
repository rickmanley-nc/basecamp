# ADR 0008: Mobile Stack And Offline Sync Foundation

Date: 2026-08-21

## Status

Accepted for M4 foundation. EAS/TestFlight configuration added for v1 beta
distribution.

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
- EAS Build and EAS Submit profiles for TestFlight private beta distribution
  once Apple developer credentials and an App Store Connect app record are
  available.

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
- Mobile camera, local-network, TestFlight installation, Photos/Documents access,
  offline storage across app restart, evidence upload, and reconnect behavior
  still require physical iPhone validation before v1.
- Normal users should install through TestFlight or a stable Apple-supported
  channel; contributor builds remain separate.

## Validation Boundary

Shared mobile logic validates locally through `pnpm check` and
`pnpm --filter @basecamp/mobile dev`. Expo configuration validates with
`pnpm --filter @basecamp/mobile expo:config`. Physical iPhone validation for
TestFlight installation, camera, Photos/Documents access, Local Network
permission, offline device storage, evidence upload, and reconnect behavior
remains pending until a signed mobile build is uploaded and installed.
