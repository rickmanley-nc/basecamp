# ADR 0011: Local Mobile Build Path

Date: 2026-08-21

## Status

Accepted for v1.0 planning.

## Context

Basecamp requires native mobile apps for both iPhone and Android field use.
Those apps must support offline capture, scanning, evidence attachment, and
sync back to the self-hosted server.

The build system must not require a cloud build service. Basecamp may use
network-connected distribution channels where a platform requires them, but the
application artifacts themselves must be produced on admin-controlled build
machines.

iOS still has platform signing constraints. A local iOS build requires macOS,
the full Xcode app, and Apple-supported signing for physical-device installs.
Android can be built locally with the Android SDK, JDK, and Gradle, and can be
installed on test devices with Android Debug Bridge.

## Decision

Basecamp Mobile will use a local/admin-controlled build path for v1:

- iOS artifacts are built locally on macOS with full Xcode.
- Android artifacts are built locally with Android SDK/JDK/Gradle tooling.
- The current React Native and Expo module stack remains acceptable only while
  it supports local native project generation and local platform builds.
- EAS Build and EAS Submit are not required for v1 and must not be documented as
  the primary build path.
- Build credentials, signing keys, provisioning profiles, keystores, device
  identifiers, API keys, and upload tokens must remain outside git.
- The v1 mobile gate requires both iPhone and Android validation before release.

The current repository keeps generated native projects out of git until the
local build path is proven. The v1 build-path blocker must decide whether to
commit generated `ios/` and `android/` projects for release reproducibility or
keep them generated from locked Expo config and package versions.

## Consequences

- A corporate Mac with full Xcode can unblock early iPhone validation, but the
  durable release posture should be an admin-controlled Mac build host.
- Android build validation can run on Linux or macOS once Android command-line
  tools and a JDK are installed.
- TestFlight may still be used as an Apple-supported connected distribution
  channel for cloud-pilot testers, but it is not a build system and it is not a
  disconnected update path.
- Android APK sideloading is the simpler disconnected field-test update path.
- iOS disconnected updates are limited by Apple signing and device management
  rules; any off-grid iOS update process must be documented within those
  constraints.
- Previous v1 issue titles and readiness gates that mentioned only iPhone must
  be corrected to cover iOS and Android.

## Validation Boundary

Before v1, validation must prove:

- `pnpm --filter @basecamp/mobile expo:config` succeeds.
- Local native project generation succeeds on the accepted build host.
- A locally built iOS artifact installs and runs on a physical iPhone through an
  Apple-supported signing path.
- A locally built Android artifact installs and runs on a physical Android
  device or accepted emulator, with physical-device validation for camera,
  offline storage, and reconnect sync before v1.
- Issue comments and release notes record which build host, OS, tool versions,
  device platforms, install paths, and validation environments were used without
  exposing private paths, hostnames, IPs, tokens, passwords, or device secrets.

## References

- [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)
- [Expo local app development](https://docs.expo.dev/guides/local-app-development/)
- [Apple Xcode distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Android command-line builds](https://developer.android.com/build/building-cmdline)
- [Android Debug Bridge](https://developer.android.com/tools/adb)
