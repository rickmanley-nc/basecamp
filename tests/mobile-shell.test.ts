import { createDashboardSummary } from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import {
  createMobileAppShell,
  createMobileLoginRequest,
  localLoginEndpoint,
  mobileBetaDistribution,
  normalizeBasecampServerUrl
} from "@basecamp/mobile";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile app shell", () => {
  it("builds the M4 mobile navigation and offline preview from shared packages", () => {
    const shell = createMobileAppShell(createDashboardSummary(basecampSeed, {
      questInstances: [
        {
          id: "quest-instance-water",
          templateId: "water-store-24-hour-drinking-water",
          status: "active",
          selectedByUser: true,
          categoryPursuitState: "active",
          progressPercent: 10,
          startedAt: "2026-08-21T00:00:00.000Z"
        }
      ]
    }), {
      clientId: "iphone-test",
      generatedAt: "2026-08-21T00:00:00.000Z",
      cursor: "sync:0"
    });

    expect(shell.stack).toBe("Expo React Native");
    expect(shell.minimumIosVersion).toBe("17.0");
    expect(shell.installChannel).toBe("TestFlight configured");
    expect(shell.screens.map((screen) => screen.route)).toEqual([
      "home",
      "capture",
      "scan",
      "quests",
      "inventory",
      "offline"
    ]);
    expect(shell.offline.firstSyncRequired).toBe(true);
    expect(shell.offline.readModel.references.length).toBeGreaterThan(0);
    expect(shell.sampleCapture.command.intent).toMatchObject({
      type: "inventory.adjust_quantity",
      quantityDelta: 4
    });
    expect(shell.sampleScan).toMatchObject({
      target: "asset",
      assetId: "asset-backup-generator"
    });
  });

  it("defines the iPhone beta distribution metadata and local sign-in request", () => {
    expect(mobileBetaDistribution).toMatchObject({
      appName: "Basecamp Mobile",
      appVersion: "1.0.0-beta.1",
      iosBuildNumber: "1",
      minimumIosVersion: "17.0",
      installChannel: "TestFlight",
      iosBundleIdentifier: "com.basecamppreparedness.mobile",
      betaExpiresAfterDays: 90,
      serverUrlSetup: "manual_url_or_pairing_qr",
      authModel: "local_username_password"
    });
    expect(mobileBetaDistribution.buildCommand).toBe("pnpm --filter @basecamp/mobile build:ios:testflight");
    expect(mobileBetaDistribution.submitCommand).toBe("pnpm --filter @basecamp/mobile submit:ios:testflight");
    expect(normalizeBasecampServerUrl("basecamp.local:4317")).toBe("http://basecamp.local:4317");
    expect(localLoginEndpoint("https://basecamp.example/")).toBe("https://basecamp.example/api/auth/login");
    expect(() => normalizeBasecampServerUrl("ftp://basecamp.example")).toThrow(/http or https/);
    expect(() => normalizeBasecampServerUrl("https://admin:secret@basecamp.example")).toThrow(/credentials/);

    expect(createMobileLoginRequest({
      serverUrl: "https://basecamp.example",
      username: " admin ",
      password: "correct horse battery staple"
    })).toEqual({
      endpoint: "https://basecamp.example/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        username: "admin",
        password: "correct horse battery staple"
      }
    });
  });

  it("keeps Expo and EAS iOS build config aligned with the distribution contract", () => {
    const appConfig = JSON.parse(readFileSync(new URL("../apps/mobile/app.json", import.meta.url), "utf8"));
    const easConfig = JSON.parse(readFileSync(new URL("../apps/mobile/eas.json", import.meta.url), "utf8"));

    expect(appConfig.expo.name).toBe(mobileBetaDistribution.appName);
    expect(appConfig.expo.version).toBe(mobileBetaDistribution.appVersion);
    expect(appConfig.expo.ios.bundleIdentifier).toBe(mobileBetaDistribution.iosBundleIdentifier);
    expect(appConfig.expo.ios.buildNumber).toBe(mobileBetaDistribution.iosBuildNumber);
    expect(appConfig.expo.ios.infoPlist.MinimumOSVersion).toBe(mobileBetaDistribution.minimumIosVersion);
    expect(appConfig.expo.extra.basecamp).toMatchObject({
      installChannel: "TestFlight",
      authModel: "local_username_password"
    });
    expect(easConfig.cli.version).toBe(">= 22.2.0");
    expect(easConfig.build.testflight).toMatchObject({
      distribution: "store",
      channel: "testflight",
      autoIncrement: "buildNumber"
    });
    expect(easConfig.submit.testflight.ios).toEqual({});
  });
});
