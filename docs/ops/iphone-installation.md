# Basecamp iPhone Installation Guide

Last updated: 2026-08-21

This guide is the operator runbook for installing the Basecamp mobile companion
on an iPhone.

## Current Status

Basecamp does not have an installable iPhone app yet. The mobile app is planned
for M4. Until then, the web app is the only runnable user interface.

M4 must produce a real mobile app foundation and an iPhone install guide that a
non-developer can follow. A user should not need Xcode or a local build toolchain
to install Basecamp on an iPhone.

## Target Distribution Paths

Basecamp should support these iPhone install paths:

- TestFlight for private beta and pre-release testing.
- App Store distribution, or another explicitly documented Apple-supported
  distribution path, for stable releases.
- Development builds through Xcode only for contributors, not normal users.

TestFlight builds are temporary beta builds, so release instructions must include
how the admin receives updates and what to do before a beta build expires.

## Target User Install Runbook

M4 should turn this outline into verified steps:

1. Confirm the Basecamp server is installed and reachable from the iPhone over
   LAN, VPN, or the documented secure remote-access path.
2. Confirm the web app opens from Safari on the iPhone.
3. Install Basecamp Mobile from TestFlight or the stable release channel.
4. Open Basecamp Mobile.
5. Enter or scan the Basecamp server URL.
6. Sign in or pair the device with the self-hosted server.
7. Grant required iOS permissions only when prompted, such as Local Network,
   Camera, Photos, and Notifications.
8. Run the first sync while connected to the server.
9. Put the iPhone in airplane mode and confirm offline reference data still opens.
10. Reconnect and confirm queued changes sync back to the server.

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
