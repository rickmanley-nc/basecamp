# Basecamp iPhone Installation Guide

Last updated: 2026-08-21

This guide is the operator runbook for installing the Basecamp mobile companion
on an iPhone.

For the full v1 release gate, see
[Basecamp v1.0 MVP Readiness](../product/v1-mvp-readiness.md). This guide covers
the iPhone install and physical-device test path used by that gate.

## Current Status

M4 adds the Basecamp Mobile foundation, shared command model, offline read model,
scan workflows, and local app-shell preview. A signed installable iPhone build is
not published yet.

The selected distribution path for private beta is TestFlight. Normal users
should not need Xcode or a local build toolchain. Physical iPhone installation is
pending until a TestFlight or stable Apple-supported build exists.

Minimum target iOS version: iOS 17.0.

## Target Distribution Paths

Basecamp should support these iPhone install paths:

- TestFlight for private beta and pre-release testing.
- App Store distribution, or another explicitly documented Apple-supported
  distribution path, for stable releases.
- Development builds through Xcode only for contributors, not normal users.

TestFlight builds are temporary beta builds, so release instructions must include
how the admin receives updates and what to do before a beta build expires.

## Target User Install Runbook

Use these steps when a TestFlight or stable build is available:

1. Confirm the Basecamp server is installed and reachable from the iPhone over
   LAN, VPN, or the documented secure remote-access path.
2. Confirm the web app opens from Safari on the iPhone.
3. Install TestFlight from the App Store if using a beta invite.
4. Accept the Basecamp Mobile invite from the admin-provided TestFlight link or
   email.
5. Install Basecamp Mobile from TestFlight or the stable release channel.
6. Open Basecamp Mobile.
7. Enter the Basecamp server URL or scan the future pairing QR code.
8. Pair the device with the self-hosted server.
9. Grant permissions only when prompted:
   - Local Network for LAN-only self-hosted sync.
   - Camera for barcode and QR scanning.
   - Photos for evidence attachment.
   - Notifications for maintenance and sync reminders.
10. Run first sync while connected to the server.
11. Confirm Home, Quests, Inventory, Maintenance, and Offline data appear.
12. Turn on airplane mode.
13. Open Offline and confirm cached quests, inventory, critical BOMs,
    maintenance, and references still appear.
14. Create a Quick Capture entry while offline.
15. Reconnect, sync, and confirm the queued command is accepted or shown as a
    user-visible conflict.

Current M4 local preview for contributors:

```bash
pnpm --filter @basecamp/mobile dev
```

Expected preview result:

- Stack reports Expo React Native.
- Screens include Home, Capture, Scan, Quests, Inventory, and Offline.
- Sample Quick Capture confirms an inventory command.
- Sample QR scan opens an asset workflow target.

## Server URL Setup

Use an admin-controlled server URL:

- LAN-only example: `http://basecamp.local:4317`
- Secure remote example: `https://basecamp.example`

Do not publish private LAN addresses, pairing tokens, or server secrets in
issues, PRs, releases, or docs.

## Pairing And Sign-In

The M4 contract supports manual server URL entry and a future pairing QR. The
server must register a mobile sync client ID before accepting queued commands.
Authentication, authorization, device revocation, and secure pairing tokens are
future security-hardening work.

## Updates

For TestFlight:

1. Install the newest available build in TestFlight.
2. Open Basecamp Mobile while online.
3. Confirm sync completes.
4. Repeat the offline smoke check before field use.

For a stable release channel, follow the update instructions published with that
release.

## Lost Or Replaced iPhone

Until device management is implemented, treat a lost or replaced iPhone as a
security event:

1. Remove or rotate any server credentials associated with that device.
2. Revoke the mobile sync client when device management exists.
3. Install Basecamp Mobile on the replacement device.
4. Pair as a new mobile client.
5. Run first sync before relying on offline data.

## M4 Physical Scanner Test

Status: pending until a signed iPhone build with native scanner screens exists.

When available, run this on a physical iPhone:

1. Install the current TestFlight or stable build.
2. Connect to an admin-controlled Basecamp server URL.
3. Grant Camera permission when prompted by Scan.
4. Scan a Basecamp asset QR tag.
5. Expected: the matching asset opens with inspect, maintain, move, adjust
   quantity, report issue, and view instructions actions.
6. Scan a commercial barcode.
7. Expected: an inventory confirmation appears with barcode, quantity, location,
   and notes fields.
8. Turn on airplane mode and repeat the QR scan using cached asset data.
9. Expected: cached asset data opens and actions queue locally.
10. Reconnect and sync.
11. Expected: queued commands are accepted or shown as user-visible conflicts.
12. Record pass/fail notes, iOS version, build number, server URL mode, and any
    screenshots requested by the issue or release checklist.

## Physical Device Testing

Mobile features that depend on iOS behavior must be verified on a physical
iPhone before the relevant milestone closes. Simulator validation is useful for
layout, navigation, and shared TypeScript logic, but it does not prove camera,
Local Network permission, TestFlight installation, push notification, offline
storage, or real reconnect behavior.

Each mobile issue that needs device testing should provide:

- The install channel to use.
- The minimum iOS version.
- The Basecamp server URL or pairing method to test.
- Required test data or seed state.
- Step-by-step actions for the iPhone.
- Expected results.
- Offline and reconnect steps where relevant.
- What pass/fail notes or screenshots the admin should report.

## Required Mobile Install Documentation

The M4 mobile foundation cannot close until documentation covers:

- Minimum supported iOS version.
- Supported install channel for the current release.
- TestFlight invite or public-link flow for beta releases.
- Stable release install path.
- Server URL discovery or manual entry.
- Pairing/sign-in flow.
- Required iOS permissions and why each one is needed.
- Offline-first setup and first-sync requirement.
- How to confirm the app can read data offline.
- How to confirm queued changes sync after reconnecting.
- How to update the app.
- How to remove a device from the server if the phone is lost or replaced.
- Which mobile checks require a physical iPhone and which may be run in a
  simulator.

## Troubleshooting Targets

The install guide should include fixes for:

- The iPhone cannot reach the server on the local network.
- The app cannot pair with the server.
- Camera permission was denied before scanning a QR code.
- Local Network permission was denied.
- A TestFlight build expired.
- Offline data is missing because first sync was not completed.
- Sync is stuck because the server URL changed.

## External References

- [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Apple TestFlight app](https://apps.apple.com/app/testflight/id899247664)
