import { createDashboardSummary } from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import {
  applyMobileSyncResponse,
  createEvidenceUploadRequest,
  createMobileAppShell,
  createMobileFieldScreens,
  createMobileLoginRequest,
  createPendingEvidenceUpload,
  createSyncBatchRequest,
  defaultEvidenceLink,
  localLoginEndpoint,
  mobileDistribution,
  normalizeBasecampServerUrl,
  previewScanWorkflow,
  queueAssetActionCommand,
  queueQuickCaptureCommand,
  queueScanCommand,
  restoreMobileOutbox,
  routeForScannedCode,
  serializeMobileOutbox
} from "@basecamp/mobile";
import { createCommandOutbox } from "@basecamp/sync";
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
      clientId: "mobile-test",
      generatedAt: "2026-08-21T00:00:00.000Z",
      cursor: "sync:0"
    });

    expect(shell.stack).toBe("Expo React Native");
    expect(shell.minimumIosVersion).toBe("17.0");
    expect(shell.buildPath).toBe("local_admin_controlled_ios_v1");
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

  it("defines the local mobile distribution metadata and local sign-in request", () => {
    expect(mobileDistribution).toMatchObject({
      appName: "Basecamp Mobile",
      appVersion: "1.0.0-beta.1",
      iosBuildNumber: "1",
      minimumIosVersion: "17.0",
      androidVersionCode: 1,
      buildPath: "local_admin_controlled_ios_v1",
      androidStatus: "post_v1_deferred_pending_device_validation",
      iosBundleIdentifier: "com.basecamppreparedness.mobile",
      androidPackageIdentifier: "com.basecamppreparedness.mobile",
      serverUrlSetup: "manual_url_or_pairing_qr",
      authModel: "local_username_password"
    });
    expect(mobileDistribution.nativeProjectCommand).toBe("pnpm --filter @basecamp/mobile native:prebuild");
    expect(mobileDistribution.iosLocalRunCommand).toBe("pnpm --filter @basecamp/mobile ios");
    expect(mobileDistribution.androidLocalRunCommand).toBe("pnpm --filter @basecamp/mobile android");
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

  it("keeps Expo app metadata aligned with the local distribution contract", () => {
    const appConfig = JSON.parse(readFileSync(new URL("../apps/mobile/app.json", import.meta.url), "utf8"));

    expect(appConfig.expo.name).toBe(mobileDistribution.appName);
    expect(appConfig.expo.version).toBe(mobileDistribution.appVersion);
    expect(appConfig.expo.ios.bundleIdentifier).toBe(mobileDistribution.iosBundleIdentifier);
    expect(appConfig.expo.ios.buildNumber).toBe(mobileDistribution.iosBuildNumber);
    expect(appConfig.expo.ios.infoPlist.MinimumOSVersion).toBe(mobileDistribution.minimumIosVersion);
    expect(appConfig.expo.android.package).toBe(mobileDistribution.androidPackageIdentifier);
    expect(appConfig.expo.android.versionCode).toBe(mobileDistribution.androidVersionCode);
    expect(appConfig.expo.extra.basecamp).toMatchObject({
      buildPath: "local_admin_controlled_ios_v1",
      androidStatus: "post_v1_deferred_pending_device_validation",
      authModel: "local_username_password"
    });
    expect(appConfig.expo.plugins).toContain("expo-secure-store");
  });

  it("models native field screens and durable command queue behavior", () => {
    const screens = createMobileFieldScreens();
    let outbox = createCommandOutbox("mobile-field-test");

    expect(screens.map((screen) => screen.route)).toEqual([
      "home",
      "capture",
      "scan",
      "quests",
      "inventory",
      "offline"
    ]);
    expect(screens.every((screen) => screen.offlineCapable)).toBe(true);

    const quickCapture = queueQuickCaptureCommand(outbox, "completed water store 24 hour drinking water", "2026-08-21T00:00:00.000Z");
    outbox = quickCapture.outbox;

    expect(quickCapture.command).toMatchObject({
      commandId: "mobile-field-test-000001",
      entityType: "quest",
      intent: {
        type: "quest.set_status",
        action: "complete"
      }
    });

    const barcode = routeForScannedCode("012345678901");
    const barcodeWorkflow = previewScanWorkflow(outbox, barcode, "2026-08-21T00:01:00.000Z");
    const barcodeQueued = queueScanCommand(outbox, barcode, "2026-08-21T00:01:00.000Z");

    expect(barcodeWorkflow.target).toBe("inventory_barcode");
    expect(barcodeQueued?.command).toMatchObject({
      commandId: "mobile-field-test-000002",
      entityType: "inventory",
      intent: {
        type: "inventory.adjust_quantity",
        source: "barcode",
        barcode: "012345678901"
      }
    });

    outbox = barcodeQueued?.outbox ?? outbox;

    const assetWorkflow = previewScanWorkflow(outbox, routeForScannedCode("basecamp://assets/asset-backup-generator"));

    expect(assetWorkflow).toMatchObject({
      target: "asset",
      assetId: "asset-backup-generator",
      offlineBehavior: "open_cached_asset"
    });
    expect(assetWorkflow.availableAssetActions).toContain("maintain");

    const assetQueued = queueAssetActionCommand({
      outbox,
      assetId: "asset-backup-generator",
      action: "report_issue",
      notes: "Reported from mobile scan.",
      now: "2026-08-21T00:02:00.000Z"
    });

    outbox = assetQueued.outbox;

    expect(assetQueued.command).toMatchObject({
      commandId: "mobile-field-test-000003",
      entityType: "asset",
      intent: {
        type: "asset.report_issue",
        issue: "Reported from mobile scan."
      }
    });

    const restored = restoreMobileOutbox(serializeMobileOutbox(outbox), "fallback-client");

    expect(restored).toEqual(outbox);
    expect(createSyncBatchRequest(restored).commands.map((command) => command.commandId)).toEqual([
      "mobile-field-test-000001",
      "mobile-field-test-000002",
      "mobile-field-test-000003"
    ]);
  });

  it("creates evidence upload requests without leaking device-local URIs", () => {
    const link = defaultEvidenceLink();
    const pending = createPendingEvidenceUpload({
      kind: "photo",
      entityType: link.entityType,
      entityId: link.entityId,
      title: "Water shelf photo",
      fileName: "../private phone path/water shelf.jpg",
      contentType: "image/jpeg",
      localUri: "file:///private/var/mobile/Containers/Data/Application/example/water-shelf.jpg",
      capturedAt: "2026-08-21T00:03:00.000Z",
      notes: "Shelf state before rotation."
    });
    const request = createEvidenceUploadRequest(pending, "ZmllbGQgZXZpZGVuY2U=");

    expect(pending.localUri).toContain("file://");
    expect(request).toMatchObject({
      kind: "photo",
      title: "Water shelf photo",
      link,
      fileName: "..-private-phone-path-water-shelf.jpg",
      contentType: "image/jpeg",
      capturedAt: "2026-08-21T00:03:00.000Z"
    });
    expect(JSON.stringify(request)).not.toContain("file://");
    expect(JSON.stringify(request)).not.toContain("/private/var/mobile");
  });

  it("applies sync acknowledgements and user-visible conflicts to the mobile outbox", () => {
    let outbox = createCommandOutbox("iphone-sync-test");
    outbox = queueQuickCaptureCommand(outbox, "added 1 gallon of water", "2026-08-21T00:00:00.000Z").outbox;
    outbox = queueQuickCaptureCommand(outbox, "completed water store 24 hour drinking water", "2026-08-21T00:01:00.000Z").outbox;

    const synced = applyMobileSyncResponse(outbox, {
      clientId: "iphone-sync-test",
      nextCursor: "sync:2",
      accepted: [
        {
          commandId: "iphone-sync-test-000001",
          status: "accepted",
          policy: "clean_apply",
          cursor: "sync:1",
          message: "Accepted."
        }
      ],
      conflicts: [
        {
          id: "sync-conflict-quest",
          commandId: "iphone-sync-test-000002",
          entityType: "quest",
          policy: "user_visible_conflict",
          reason: "Quest changed before sync.",
          userVisible: true
        }
      ]
    });

    expect(synced.queued.map((queued) => queued.status)).toEqual(["acknowledged", "conflict"]);
    expect(synced.queued[1].lastError).toBe("Quest changed before sync.");
  });
});
