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

- v1 must include a local/admin-controlled build and install path for iPhone.
  Android is deferred to the post-v1 Android milestone. See
  [Mobile Build And Installation Guide](../../docs/ops/mobile-build-and-installation.md).

## M4 Stack

Basecamp Mobile uses the Expo React Native stack selected in
[ADR 0008](../../docs/adr/0008-mobile-expo-offline-sync.md), with the local
build path defined in
[ADR 0011](../../docs/adr/0011-local-mobile-build-path.md). The repository
includes the typed app shell, route model, offline read model preview, Quick
Capture parser, scan workflows, command outbox contracts, Expo app entrypoint,
local native build scripts, and native field screens for Home, Capture, Scan,
Quests, Inventory, and Offline.

Run the local shell preview:

```bash
pnpm --filter @basecamp/mobile dev
```

Run the native Expo app locally:

```bash
pnpm --filter @basecamp/mobile start
```

Confirm the public Expo configuration:

```bash
pnpm --filter @basecamp/mobile expo:config
```

Generate native projects locally when validating platform build configuration:

```bash
pnpm --filter @basecamp/mobile native:prebuild
```

Run local platform builds on hosts with the required native toolchains:

```bash
pnpm --filter @basecamp/mobile ios
pnpm --filter @basecamp/mobile android
```

For v1, only the local iPhone build and physical iPhone validation are
release-blocking. The Android command remains for post-v1 development.

The preview prints the current mobile stack, tab labels, sample Quick Capture
confirmation, and sample QR scan target. The native Expo entrypoint covers
server URL entry, local username/password sign-in, tabbed field screens, Quick
Capture queueing, CameraView scan handling, photo/document evidence selection,
evidence upload, persistent outbox storage, and reconnect sync attempts.

Mobile storage boundary:

- Session token: Expo SecureStore.
- Non-secret session display data, command outbox, and pending evidence drafts:
  AsyncStorage.
- Evidence bytes: uploaded to the Basecamp server through
  `POST /api/evidence/upload` so persisted metadata uses deployment-owned
  `storageKey` values instead of phone-local file paths.

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
evidence attachments through the sync command vocabulary. The v1 mobile field
slice adds native capture and upload plumbing, but physical iPhone validation is
still required for Camera permission, Photos/Documents behavior, persistent
device storage, and reconnect behavior. Android validation is post-v1.

## Design Boundary

Mobile UI work should keep a Basecamp mobile boundary instead of importing web UI
components directly. Native components should prioritize short field workflows,
large touch targets, offline state, and confirmation cards. Shared domain,
capture, scan, and sync logic belongs in workspace packages, not inside screen
components.

## Validation Status

Local validation:

- `pnpm --filter @basecamp/mobile dev`
- `pnpm --filter @basecamp/mobile exec expo install --check`
- `pnpm --filter @basecamp/mobile expo:config`
- `pnpm --filter @basecamp/mobile native:prebuild`
- `pnpm --filter @basecamp/mobile ios` on a Mac with full Xcode.
- `pnpm check`

Physical iPhone validation is pending until a locally produced iPhone build is
installed. Camera permission, QR/barcode scanning, Photos/Documents access,
Local Network permission, offline storage across app restart, evidence upload,
and reconnect sync must be verified on a physical iPhone when native field
screens and distribution are available. Android validation is tracked after v1.
The exact v1 requirements are tracked in
[Basecamp v1.0 MVP Readiness](../../docs/product/v1-mvp-readiness.md) and the
v1.0 GitHub milestone blocker issues.
