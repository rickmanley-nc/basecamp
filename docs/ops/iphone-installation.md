# Basecamp iPhone Installation Guide

Last updated: 2026-08-22

This guide is the operator runbook for installing the Basecamp mobile companion
on an iPhone.

For the full v1 release gate, see
[Basecamp v1.0 MVP Readiness](../product/v1-mvp-readiness.md). For the
platform-neutral build path, see
[Basecamp Mobile Build And Installation Guide](./mobile-build-and-installation.md).
This guide covers the iPhone-specific install and physical-device test path used
by that gate.

## Current Status

Basecamp Mobile now has an Expo React Native entrypoint, iOS app metadata, and
local native build scripts. The app opens with mobile-first onboarding, allows a
user to choose a preparedness category and start a starter quest locally, and can
later accept an admin-controlled Basecamp server URL for sync with the local
username/password model. Native Home, Capture, Scan, Quests, Inventory, and
Offline screens exist, with Quick Capture queueing, camera scan handling,
photo/document evidence selection, persistent local journey/outbox storage, and
reconnect sync attempts.

The selected v1 build path is a locally produced iOS artifact from an
admin-controlled Mac with the full Xcode app installed. The local Xcode
development install path has been proven on a physical iPhone; the remaining v1
gate is field validation of the current mobile-first app experience, capture,
evidence, offline restart, and reconnect sync behavior.

Physical iPhone validation remains open until the current app records the iOS
version, app build, install path, validation environment, first-run local quest
result, and pass/fail notes for field workflows.

Current beta metadata:

- App name: Basecamp Mobile.
- Marketing version: `1.0.0-beta.1`.
- Initial iOS build number: `1`.
- Bundle identifier: `com.basecamppreparedness.mobile`.
- Minimum target iOS version: iOS 17.0.
- Build path: local Xcode build.
- Install channel: Xcode development install, ad hoc registered-device install,
  or TestFlight after a local archive is uploaded through an Apple-supported
  path.
- Auth model: local username/password; SSO is not required or configured.
- First-run setup: local category selection and starter quest.
- Server URL setup: optional manual URL entry now; pairing QR remains future
  work.
- Secret storage: session token in Expo SecureStore.
- Offline storage: non-secret session display data, local journey selection,
  command outbox, and pending evidence drafts in AsyncStorage.

## Target Distribution Paths

Basecamp should support these iPhone install paths from locally produced
artifacts:

- Xcode development install for contributor/admin validation on a connected
  physical iPhone.
- Ad hoc install for registered pilot devices.
- TestFlight for connected private beta and pre-release testing after a local
  archive is uploaded through Apple tooling.
- App Store distribution, or another explicitly documented Apple-supported
  distribution path, for stable releases.

TestFlight builds are temporary beta builds, so release instructions must include
how the admin receives updates and what to do before a beta build expires.

## Admin Local iOS Build Runbook

Use this path when Apple signing is available. Do not commit Apple credentials,
provisioning profiles, API keys, pairing tokens, device identifiers, or private
server URLs.

Prerequisites:

- Full Xcode app installed on macOS. Xcode command-line tools alone are not
  enough.
- Apple Developer Program membership.
- App Store Connect app record for bundle identifier
  `com.basecamppreparedness.mobile` when TestFlight or App Store upload is used.
- Registered test device or TestFlight tester access for the pilot friend,
  depending on the selected Apple-supported install path.
- A reachable cloud pilot Basecamp server URL for validation.

Repository checks:

```bash
pnpm install
pnpm --filter @basecamp/mobile dev
pnpm --filter @basecamp/mobile exec expo install --check
pnpm --filter @basecamp/mobile expo:config
pnpm --filter @basecamp/mobile native:prebuild
pnpm check
```

The Expo dependency check must pass before native iOS validation. If it reports
an expected React or React Native version for the installed Expo SDK, update the
mobile package and lockfile before running Xcode builds.

Local run on a connected iPhone or simulator:

```bash
pnpm --filter @basecamp/mobile ios
```

For an installable beta artifact, archive and export the generated iOS project
with Xcode or an equivalent local `xcodebuild` flow after signing is configured.
Record the final build number from Xcode or App Store Connect in the issue or
release notes.

If TestFlight is used, upload the locally produced archive through an
Apple-supported App Store Connect flow. Record that upload path in the
validation notes. TestFlight is a connected distribution channel, not the build
system.

## Pilot User Install Runbook

Use these steps when a locally produced iPhone build is available through the
selected Apple-supported install path:

1. Confirm the Basecamp server is installed and reachable from the iPhone over
   LAN, VPN, or the documented secure remote-access path.
2. Confirm the web app opens from Safari on the iPhone.
3. Install TestFlight from the App Store only if using a TestFlight beta invite.
4. If using TestFlight, accept the Basecamp Mobile invite from the
   admin-provided link or email.
5. Install Basecamp Mobile through the selected install path.
6. Open Basecamp Mobile.
7. Confirm Basecamp Mobile opens to the local-first onboarding flow rather than
   a required sign-in form.
8. Choose a preparedness category and open the starter quest.
9. Start the quest and confirm the app can queue local progress before sync is
   configured.
10. Open Sync and confirm the plan describes the local starter quest, queued
   command count, pending evidence count, and the server data that will refresh
   after sign-in.
11. Enter the Basecamp server URL and sign in with the admin-created local
   username and password.
12. Confirm the app stays on the Sync plan after sign-in when local work is
   waiting, then tap Sync.
13. Grant permissions only when prompted:
   - Local Network for LAN-only self-hosted sync.
   - Camera for barcode and QR scanning.
   - Photos for evidence attachment.
   - Notifications for maintenance and sync reminders.
14. Run first sync while connected to the server.
15. Confirm Home, Quests, Inventory, Maintenance, and Offline data appear.
16. Confirm server-created active quests refresh onto the phone after sign-in.
17. Turn on airplane mode.
18. Open Offline and confirm the Cached Field Data snapshot shows active
    quests, inventory items, critical BOMs, maintenance, and references.
19. Create a Quick Capture entry while offline.
20. Reconnect, sync, and confirm the queued command is accepted or shown as a
    user-visible conflict.

## Physical iPhone Validation Checklist

Use this checklist for issues #75, #76, #77, and #94 once a TestFlight or
stable iPhone build is available. Run it against the cloud-pilot server unless
the issue explicitly names another validation target.

Preflight:

- Confirm the iPhone model and iOS version.
- Confirm the Basecamp Mobile build number and install channel.
- Confirm the cloud-pilot server is reachable from Safari on the iPhone.
- Confirm a pilot username/password account exists. Do not record the password
  in issues, PRs, release notes, screenshots, or chat.
- Confirm a fresh server backup exists before testing destructive sync or reset
  behavior.
- Confirm the server URL can be described publicly as LAN, VPN, or secure remote
  without publishing a private hostname, IP address, token, or pairing secret.

Test criteria:

| Area | Steps | Pass Criteria |
| --- | --- | --- |
| Install | Install the locally produced build through the selected Apple-supported path and open it. | App installs, opens without crashing, and shows the mobile-first Basecamp onboarding flow. |
| First-run local quest | Open the app without entering a server URL, choose a preparedness category, and start the starter quest. | The app does not require server sign-in, persists the selected quest locally, and queues quest progress offline. |
| Mobile/web bootstrap | Review the Sync plan, connect to the server, sync mobile-start local quest progress, then confirm web-start server assignments refresh onto the phone. | Mobile-start quest progress uploads with a stable quest ID; web-start active quests refresh after sign-in; duplicate starter progress is accepted idempotently or shown as a visible conflict. |
| Server URL | Open Sync, enter the cloud-pilot server URL, and continue. | URL is accepted from the optional Sync path; invalid URLs show a clear error and do not save credentials. |
| Sign-in | Sign in with an admin-created local username/password account. | Sign-in succeeds; password field clears; token is stored securely; Home refreshes from the server. |
| First Sync | While online, refresh Home/Offline data. | Home, Quests, Inventory, and Offline screens show server-backed data or an explicit empty state. |
| Local Network | If iOS prompts for Local Network access, allow it and retry sync. | LAN/private server sync works after permission is granted. If denied, the failure is understandable. |
| Quick Capture Online | From Capture, queue an inventory-style entry such as adding water. Sync while online. | Command appears in the outbox, sync attempts, and the server accepts it or shows a user-visible conflict. |
| Evidence Photo | From Capture, select or take a photo and upload it while online. If upload fails, use the evidence Retry action after reconnecting. | Permission prompt appears when expected; upload succeeds or stays retryable; server stores deployment-owned evidence bytes; no phone-local URI appears in server/export metadata. |
| Evidence Document | Attach a document if available. If upload fails, use the evidence Retry action after reconnecting. | Document picker opens, upload succeeds or gives a clear actionable retry state. |
| Basecamp QR Scan | From Scan, grant Camera permission and scan a Basecamp asset QR tag. | Asset workflow appears with inspect, maintain, move, adjust quantity, report issue, and instructions actions. |
| Barcode Scan | Scan a commercial barcode. | Inventory confirmation appears with barcode context, quantity, location, and notes fields. |
| Offline Cache | Turn on airplane mode and open Home, Quests, Inventory, and Offline. | Previously synced data remains visible enough for field use, including the Offline cached-data snapshot; online-only failures do not erase cached data. |
| Offline Queue | While still offline, create a Quick Capture entry and scan or manually enter a code. Force-close and reopen the app. | Pending commands survive app restart and remain visible in Offline/outbox state. |
| Reconnect Sync | Turn airplane mode off, return to the same network, and sync. | Pending commands upload idempotently or show a user-visible conflict; the outbox does not duplicate accepted commands. |
| Conflict Visibility | If a conflict appears, open it and read the message. | Conflict explains what needs human review without exposing internal payloads or secrets. |
| Sign-out | Sign out, close the app, reopen it. | The prior session is gone; protected server data requires sign-in again. |
| Lost Device Procedure | Confirm the operator can disable the test user from the server runbook. | User disable guidance is understandable; no password or token is recorded publicly. |

Evidence to record:

- iPhone model.
- iOS version.
- Basecamp Mobile build number.
- Install path: Xcode development install, ad hoc, TestFlight, or stable release.
- Server URL mode: LAN, VPN, or secure remote.
- Deployment profile: normally `cloud-pilot`.
- Database kind reported by server status when known.
- Whether Local Network, Camera, Photos, and Documents flows were prompted and
  allowed or denied.
- Cached Field Data counts for active quests, inventory items, critical BOMs,
  maintenance, and references.
- Pass/fail result for each checklist row.
- Accepted command count, conflict count, upload result, or evidence retry
  result when relevant.
- Screenshots only when useful, with private hostnames/IPs, usernames,
  locations, and preparedness-sensitive details redacted.
- Any app crash, stuck spinner, unclear copy, or sync result that was not
  understandable from the UI.

Use the canonical report template in
[Basecamp iPhone Field Validation Report](./iphone-field-validation-report.md)
when posting results back to issues #75, #76, #77, or #94.

Current local preview for contributors:

```bash
pnpm --filter @basecamp/mobile dev
pnpm --filter @basecamp/mobile start
```

Expected preview result:

- Stack reports Expo React Native.
- Screens include Home, Capture, Scan, Quests, Inventory, and Offline.
- Sample Quick Capture confirms an inventory command.
- Sample QR scan opens an asset workflow target.
- Native app entrypoint shows mobile-first onboarding, category selection, and
  optional server sync sign-in.
- Native field screens can queue Quick Capture commands, process manual scan
  payloads, store pending evidence drafts, and attempt sync after sign-in.

## Local Xcode Build And Simulator Setup

Xcode is required for local iOS builds. Simulator validation is useful, but it
does not replace physical iPhone validation for install, Camera,
Photos/Documents, Local Network, offline storage, or real reconnect behavior.

Install Xcode on a Mac when simulator validation is useful:

1. Install the full Xcode app from the Mac App Store or Apple Developer
   Downloads. The command-line tools alone are not enough for `simctl`.
2. Open Xcode once and allow it to install required components.
3. In Xcode, open Settings, then Components, and install an iOS simulator
   runtime if one is not already installed.
4. Set the active developer directory:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcrun simctl list devices available
```

Simulator smoke commands:

```bash
pnpm install
pnpm --filter @basecamp/mobile expo:config
pnpm --filter @basecamp/mobile ios
```

Use simulator validation for layout, navigation, URL entry, sign-in happy path
against a reachable server, and non-camera smoke checks. Record simulator
results separately from physical iPhone results.

## Server URL Setup

Use an admin-controlled server URL:

- LAN-only example: `http://basecamp.local:4317`
- Secure remote example: `https://basecamp.example`

Do not publish private LAN addresses, pairing tokens, or server secrets in
issues, PRs, releases, or docs.

## Optional Sync Sign-In

The current native entrypoint does not require sign-in to begin. It supports
manual server URL entry and local username/password sign-in against
`POST /api/auth/login` from the optional Sync path. Required SSO is not part of
v1 because the eventual off-grid deployment must keep local auth usable.

Pairing QR remains future work. When it is added, pairing payloads must avoid
public issues, PRs, releases, and docs unless values are anonymized placeholders.

## Field Capture And Evidence Upload

Basecamp Mobile uses native pickers for field evidence:

- Camera photos use Expo ImagePicker.
- Documents use Expo DocumentPicker.
- Document bytes are read from the app cache through Expo FileSystem.
- Evidence upload uses `POST /api/evidence/upload`.

The server writes evidence bytes under the configured Basecamp storage directory
and records deployment-owned `storageKey` metadata. Phone-local file URIs are
kept in the pending local evidence queue only and must not be sent to public
issues, PRs, releases, or portable exports.

If the iPhone is offline, evidence remains pending locally until reconnect. On
sync, the app attempts evidence uploads before command outbox sync so evidence
bytes are stored by the deployment before metadata is considered synced.

## Updates, Expiration, And Rollback

For locally produced iOS artifacts:

1. Install the newest admin-approved build through the selected Apple-supported
   path.
2. Open Basecamp Mobile while online.
3. Confirm sync completes.
4. Repeat the offline smoke check before field use.

Apple TestFlight beta builds are available to testers for up to 90 days. Before
the active build expires, upload a locally produced newer build and ask pilot
users to install it.

Rollback expectation:

- If a previous non-expired TestFlight build is still available to the tester,
  reinstall that build from TestFlight.
- If the prior build is expired or unavailable, publish a new build with a
  higher iOS build number that restores the desired behavior.
- Do not rely on TestFlight as a permanent or disconnected release channel for
  long-term field use without monitoring expiration dates and documenting the
  Apple-supported fallback.

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

## Physical Scanner Test

Status: pending for the current mobile-first build until scanner behavior is
retested on a physical iPhone.

When available, run this on a physical iPhone:

1. Install the current locally produced iPhone build through the selected
   Apple-supported path.
2. Choose a starter category and start a local quest.
3. Connect to an admin-controlled Basecamp server URL when testing sync.
4. Grant Camera permission when prompted by Scan.
5. Scan a Basecamp asset QR tag.
6. Expected: the matching asset opens with inspect, maintain, move, adjust
   quantity, report issue, and view instructions actions.
7. Scan a commercial barcode.
8. Expected: an inventory confirmation appears with barcode, quantity, location,
   and notes fields.
9. Turn on airplane mode and repeat the QR scan using cached asset data.
10. Expected: cached asset data opens and actions queue locally.
11. Reconnect and sync.
12. Expected: queued commands are accepted or shown as user-visible conflicts.
13. Record pass/fail notes, iOS version, build number, server URL mode, and any
    screenshots requested by the issue or release checklist.

## Physical Device Testing

Mobile features that depend on iOS behavior must be verified on a physical
iPhone before the relevant milestone closes. Simulator validation is useful for
layout, navigation, and shared TypeScript logic, but it does not prove camera,
Local Network permission, push notification, Photos/Documents access, offline
storage, evidence upload, or real reconnect
behavior.

Each mobile issue that needs device testing should provide:

- The install path to use.
- The minimum iOS version.
- The local-first category/quest flow to test.
- The Basecamp server URL or pairing method to test when sync is in scope.
- Required test data or seed state.
- Step-by-step actions for the iPhone.
- Expected results.
- Offline and reconnect steps where relevant.
- What pass/fail notes or screenshots the admin should report.

## Required Mobile Install Documentation

The M4 mobile foundation cannot close until documentation covers:

- Minimum supported iOS version.
- Supported local build and install path for the current release.
- TestFlight invite or public-link flow only when TestFlight is used as a
  connected distribution channel.
- Stable release install path.
- Local-first category selection and starter quest flow.
- Optional server URL discovery or manual entry.
- Optional pairing/sign-in flow.
- Required iOS permissions and why each one is needed.
- Offline-first setup before sync.
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
- Local quest selection does not persist after restart.
- Camera permission was denied before scanning a QR code.
- Local Network permission was denied.
- A TestFlight build expired, when TestFlight is used.
- Synced offline reference data is missing because first sync was not completed.
- Sync is stuck because the server URL changed.

## External References

- [Expo local app development](https://docs.expo.dev/guides/local-app-development/)
- [Expo iOS Simulator workflow](https://docs.expo.dev/workflow/ios-simulator/)
- [Apple Xcode system requirements](https://developer.apple.com/xcode/system-requirements/)
- [Apple Xcode command-line tool reference](https://developer.apple.com/documentation/xcode/xcode-command-line-tool-reference)
- [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Apple TestFlight app](https://apps.apple.com/app/testflight/id899247664)
