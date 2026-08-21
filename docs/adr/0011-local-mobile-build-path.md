# ADR 0011: Local Mobile Build Path

Date: 2026-08-21

## Status

Accepted for v1.0 and v1.1 planning.

## Context

Basecamp requires native mobile apps for both iPhone and Android field use over
the product lifetime. Those apps must support offline capture, scanning,
evidence attachment, and sync back to the self-hosted server.

The v1 launch target is web plus iPhone. Android is deferred until after v1
because the admin does not currently have an Android phone available for
physical validation, and Basecamp should not claim support for a platform it
cannot test honestly.

The build system must not require a cloud build service. Basecamp may use
network-connected distribution channels where a platform requires them, but the
application artifacts themselves must be produced on admin-controlled build
machines.

iOS still has platform signing constraints. A local iOS build requires macOS,
the full Xcode app, and Apple-supported signing for physical-device installs.
Android can be built locally with the Android SDK, JDK, and Gradle, and can be
installed on test devices with Android Debug Bridge.

## Decision

Basecamp Mobile will use local/admin-controlled build paths:

- v1 iPhone artifacts are built locally on macOS with full Xcode.
- Android artifacts are deferred to the post-v1 Android milestone and will be
  built locally with Android SDK/JDK/Gradle tooling.
- The current React Native and Expo module stack remains acceptable only while
  it supports local native project generation and local platform builds.
- EAS Build and EAS Submit are not required for v1 or Android follow-up work and
  must not be documented as the primary build path.
- Build credentials, signing keys, provisioning profiles, keystores, device
  identifiers, API keys, and upload tokens must remain outside git.
- The v1 mobile gate requires physical iPhone validation before release.
- The post-v1 Android milestone requires a physical Android test device or
  explicit tester before it can close.

The current repository keeps generated native projects out of git until the
local build path is proven. The v1 build-path blocker must decide whether to
commit the generated `ios/` project for release reproducibility or keep it
generated from locked Expo config and package versions. The Android milestone
will make the same decision for `android/` after launch.

## Consequences

- A corporate Mac with full Xcode can unblock early iPhone validation, but the
  durable release posture should be an admin-controlled Mac build host.
- Android build validation can run on Linux or macOS once Android command-line
  tools, a JDK, and a physical test device are available.
- TestFlight may still be used as an Apple-supported connected distribution
  channel for cloud-pilot testers, but it is not a build system and it is not a
  disconnected update path.
- Android APK sideloading is expected to be the simpler disconnected field-test
  update path, but it is post-v1.
- iOS disconnected updates are limited by Apple signing and device management
  rules; any off-grid iOS update process must be documented within those
  constraints.
- v1 issue titles and readiness gates must not require Android before the web
  and iPhone launch.
- Android remains tracked as a post-v1 issue and milestone, not as an abandoned
  requirement.

## Validation Boundary

Before v1, validation must prove:

- `pnpm --filter @basecamp/mobile expo:config` succeeds.
- Local native project generation succeeds on the accepted build host.
- A locally built iOS artifact installs and runs on a physical iPhone through an
  Apple-supported signing path.
- Issue comments and release notes record which build host, OS, tool versions,
  device platform, install path, and validation environment were used without
  exposing private paths, hostnames, IPs, tokens, passwords, or device secrets.

Before the Android milestone closes, validation must prove:

- A locally built Android artifact installs and runs on a physical Android
  device.
- Camera, offline storage, evidence capture, and reconnect sync work on that
  device.
- Android release notes record build host, Android SDK/JDK/Gradle versions,
  device model, Android version, artifact type, install path, and validation
  results.

## References

- [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)
- [Expo local app development](https://docs.expo.dev/guides/local-app-development/)
- [Apple Xcode distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Android command-line builds](https://developer.android.com/build/building-cmdline)
- [Android Debug Bridge](https://developer.android.com/tools/adb)
