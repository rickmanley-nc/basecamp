import { createDashboardSummary } from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import { createMobileAppShell } from "@basecamp/mobile";
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
});
