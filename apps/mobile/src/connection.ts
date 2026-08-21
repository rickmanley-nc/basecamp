import type { AuthLoginRequest } from "@basecamp/api";

export const mobileDistribution = {
  appName: "Basecamp Mobile",
  appVersion: "1.0.0-beta.1",
  iosBuildNumber: "1",
  minimumIosVersion: "17.0",
  androidVersionCode: 1,
  buildPath: "local_admin_controlled_ios_v1",
  androidStatus: "post_v1_deferred_pending_device_validation",
  expoSdkVersion: "57.0.15",
  iosBundleIdentifier: "com.basecamppreparedness.mobile",
  androidPackageIdentifier: "com.basecamppreparedness.mobile",
  nativeProjectCommand: "pnpm --filter @basecamp/mobile native:prebuild",
  iosLocalRunCommand: "pnpm --filter @basecamp/mobile ios",
  androidLocalRunCommand: "pnpm --filter @basecamp/mobile android",
  iosReleaseArtifact: "Locally archived and exported iOS app from Xcode.",
  androidReleaseArtifact: "Post-v1 locally built APK or AAB from Gradle.",
  updateBehavior: "Install the newest locally produced, admin-approved iPhone artifact for v1.",
  rollbackExpectation:
    "Reinstall a previous admin-retained artifact when platform signing rules allow it; otherwise build a newer signed artifact that restores the desired behavior.",
  serverUrlSetup: "manual_url_or_pairing_qr",
  authModel: "local_username_password"
} as const;

export type MobileBuildPath = typeof mobileDistribution.buildPath;

export interface MobileLoginRequest {
  endpoint: string;
  method: "POST";
  headers: {
    "Content-Type": "application/json";
  };
  body: AuthLoginRequest;
}

export function normalizeBasecampServerUrl(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error("Basecamp server URL is required.");
  }

  const withScheme = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let parsed: URL;

  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("Enter a valid Basecamp server URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Basecamp server URL must use http or https.");
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error("Do not include credentials in the Basecamp server URL.");
  }

  parsed.hash = "";
  parsed.search = "";

  return parsed.toString().replace(/\/$/, "");
}

export function localLoginEndpoint(serverUrl: string): string {
  return `${normalizeBasecampServerUrl(serverUrl)}/api/auth/login`;
}

export function createMobileLoginRequest(input: {
  serverUrl: string;
  username: string;
  password: string;
}): MobileLoginRequest {
  const username = input.username.trim();

  if (username.length === 0) {
    throw new Error("Username is required.");
  }

  if (input.password.length === 0) {
    throw new Error("Password is required.");
  }

  return {
    endpoint: localLoginEndpoint(input.serverUrl),
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: {
      username,
      password: input.password
    }
  };
}
