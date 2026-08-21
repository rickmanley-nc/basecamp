# Basecamp Mobile Build And Installation Guide

Last updated: 2026-08-21

This guide defines the mobile build path for Basecamp Mobile. v1 launches with
the web app and iPhone app. Android is deferred to the post-v1 Android milestone
because no physical Android test device is currently available.

For the release decision, see
[Basecamp v1.0 MVP Readiness](../product/v1-mvp-readiness.md). For the
architecture decision, see [ADR 0011](../adr/0011-local-mobile-build-path.md).

## Build Requirement

Basecamp v1 requires a locally produced iPhone artifact:

- iPhone app artifacts must be built on an admin-controlled macOS build host
  with the full Xcode app installed.
- EAS Build and other cloud build services are not required for v1 and must not
  be the only way to create an app update.
- TestFlight may be used as an Apple-supported connected distribution channel
  after a local iOS build is created, but it is not the build system.
- Android app artifacts remain required after launch and must be built locally
  with Android SDK command-line tools, a JDK, and Gradle when the Android
  milestone starts.

## Current Repo State

Basecamp Mobile currently has:

- Expo React Native app metadata.
- Native field screens for Home, Capture, Scan, Quests, Inventory, and Offline.
- Manual server URL entry.
- Local username/password sign-in.
- Camera scan handling.
- Photo/document evidence selection.
- Secure token storage and AsyncStorage-backed outbox state.
- Reconnect sync attempts.

The v1 blocker remains open until a local iPhone artifact is produced,
installed, and validated on a physical iPhone. Android validation is tracked by
the post-v1 Android milestone.

## Shared Checks

Run these from the repository root before platform builds:

```bash
pnpm install
pnpm --filter @basecamp/mobile dev
pnpm --filter @basecamp/mobile expo:config
pnpm check
```

Generate native platform projects locally when validating the current Expo
configuration:

```bash
pnpm --filter @basecamp/mobile native:prebuild
```

Do not commit generated signing material, provisioning profiles, keystores,
device identifiers, private server URLs, pairing payloads, or local workstation
paths.

## iPhone Build Path

Required build host:

- macOS.
- Full Xcode app, not only Xcode command-line tools.
- CocoaPods as required by the generated iOS project.
- Apple Developer signing access for physical-device installs.

The corporate MacBook can be used as an early validation host if IT installs the
full Xcode app. For durable releases, prefer an admin-controlled Mac build host
so Basecamp app updates are not dependent on a corporate workstation policy.

Local development run:

```bash
pnpm --filter @basecamp/mobile ios
```

For an installable iPhone artifact, open the generated iOS project in Xcode or
run an equivalent `xcodebuild` archive/export flow after signing is configured.
Record the Xcode version, iOS target, bundle identifier, build number, signing
path, install path, and validation device.

Accepted iPhone install paths for v1 validation:

- Xcode development install to a connected physical iPhone.
- Ad hoc install for registered test devices.
- TestFlight for connected cloud-pilot testers after a local archive is created
  and uploaded through an Apple-supported path.

Disconnected iPhone updates are constrained by Apple signing and device
management rules. Do not claim an iOS off-grid update path until the exact
Apple-supported process is proven.

## Post-v1 Android Build Path

Status: deferred until after web plus iPhone v1 launch.

Required build host:

- Linux or macOS.
- JDK compatible with the generated Android project.
- Android SDK command-line tools and platform tools.
- Gradle wrapper from the generated Android project.

Local development run:

```bash
pnpm --filter @basecamp/mobile android
```

For an installable Android artifact after the Android milestone starts, generate
the native project and build with Gradle from the generated Android directory:

```bash
pnpm --filter @basecamp/mobile native:prebuild
cd apps/mobile/android
./gradlew assembleDebug
```

Install a debug APK on a connected Android device:

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

Release APK/AAB builds require a deployment-owned keystore. Keep keystores and
passwords outside git and record only the public validation facts in issues or
release notes.

## Physical Device Validation

Before v1, the admin must validate the current app on:

- A physical iPhone.

After v1, the Android milestone must validate the current app on:

- A physical Android device.

Each platform test report should record:

- Date.
- Tester.
- Device model.
- OS version.
- App version/build.
- Build host class, such as corporate Mac, admin Mac build host, Linux Android
  build host, or cloud-pilot server as appropriate for the milestone.
- Install path.
- Server URL mode: LAN, VPN, or secure remote.
- Deployment profile, normally `cloud-pilot`.
- Pass/fail notes for sign-in, first sync, camera scan, evidence capture,
  offline cache, offline queue restart, reconnect sync, conflict visibility,
  and sign-out.

Do not record passwords, tokens, private IPs, private hostnames, device UDIDs,
pairing secrets, screenshots with sensitive preparedness data, or workstation
paths in public GitHub text.

## References

- [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)
- [Expo local app development](https://docs.expo.dev/guides/local-app-development/)
- [Apple Xcode distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Android command-line builds](https://developer.android.com/build/building-cmdline)
- [Android Debug Bridge](https://developer.android.com/tools/adb)
