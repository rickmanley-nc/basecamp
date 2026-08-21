# Basecamp Mobile

The mobile app is the companion for fast execution and field use. It extends
Basecamp rather than replacing the web application.

Responsibilities:

- Quick Capture with confirmation-first workflows.
- Barcode and QR scanning for commercial items and Basecamp asset tags.
- Inventory updates, photos, task completion, drill recording, and maintenance completion.
- Offline emergency reference, active quests, critical plans, checklists, and local change capture.
- Synchronization with the self-hosted Basecamp server when connectivity returns.

Design principle:

- Mobile screens prioritize a few-tap action path over administration.

Install requirement:

- M4 must include an iPhone install guide for non-developer users. See
  [iPhone Installation Guide](../../docs/ops/iphone-installation.md).

## M4 Stack

Basecamp Mobile uses the Expo React Native stack selected in
[ADR 0008](../../docs/adr/0008-mobile-expo-offline-sync.md). The M4 repository
slice includes the typed app shell, route model, offline read model preview,
Quick Capture parser, scan workflows, and command outbox contracts.

Run the local shell preview:

```bash
pnpm --filter @basecamp/mobile dev
```

The preview prints the current mobile stack, tab labels, sample Quick Capture
confirmation, and sample QR scan target. Native Expo screens and signed
TestFlight builds are the next implementation layer.

## Navigation

M4 defines six primary routes:

- Home
- Capture
- Scan
- Quests
- Inventory
- Offline

The route model is exported from `@basecamp/mobile` and consumes shared
`@basecamp/api`, `@basecamp/content`, and `@basecamp/sync` packages.

M5 server persistence accepts mobile-captured drill records, skill records, and
evidence attachments through the sync command vocabulary. Native camera and file
upload UX remains part of the signed mobile build path.

## Design Boundary

Mobile UI work should keep a Basecamp mobile boundary instead of importing web UI
components directly. Native components should prioritize short field workflows,
large touch targets, offline state, and confirmation cards. Shared domain,
capture, scan, and sync logic belongs in workspace packages, not inside screen
components.

## Validation Status

Local validation:

- `pnpm --filter @basecamp/mobile dev`
- `pnpm check`

Physical iPhone validation is pending until a signed TestFlight or stable build
exists. Camera permission, QR/barcode scanning, Local Network permission, offline
storage, and reconnect sync must be verified on a physical iPhone when native
screens and distribution are available. The exact v1 requirements are tracked in
[Basecamp v1.0 MVP Readiness](../../docs/product/v1-mvp-readiness.md) and the
v1.0 GitHub milestone blocker issues.
