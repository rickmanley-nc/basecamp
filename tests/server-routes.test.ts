import { createDashboardSummary } from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import { createDatabase, upsertAsset, upsertLocation } from "@basecamp/database";
import { buildServer } from "@basecamp/server";
import { createOfflineCommand } from "@basecamp/sync";
import { describe, expect, it } from "vitest";

describe("server routes", () => {
  it("serves health, seed, dashboard, M2 mutations, and M3 inventory routes", async () => {
    const database = createDatabase();
    const server = buildServer({ database });

    const health = await server.inject("/health");
    const seed = await server.inject("/api/seed");
    const dashboard = await server.inject("/api/dashboard");
    const categoryUpdate = await server.inject({
      method: "PATCH",
      url: "/api/categories/water/pursuit",
      payload: { pursuitState: "later" }
    });
    const startedQuest = await server.inject({
      method: "POST",
      url: "/api/quests/home-label-utility-shutoffs/actions",
      payload: { action: "start" }
    });
    const completedQuest = await server.inject({
      method: "POST",
      url: "/api/quests/home-label-utility-shutoffs/actions",
      payload: { action: "complete" }
    });
    const startedBomQuest = await server.inject({
      method: "POST",
      url: "/api/quests/water-store-24-hour-drinking-water/actions",
      payload: { action: "start" }
    });
    const quickInventory = await server.inject({
      method: "POST",
      url: "/api/inventory/quick-entry",
      payload: {
        itemName: "Commercial sealed water",
        quantity: 3,
        unit: "gallon",
        locationName: "Primary Home",
        categoryId: "water",
        type: "water_storage",
        expiresAt: "2027-08-21"
      }
    });
    const location = upsertLocation(database, {
      name: "Primary Home",
      kind: "home",
      maturity: "known_location"
    });
    const asset = upsertAsset(database, {
      name: "Backup Generator",
      type: "power_asset",
      categoryId: "power",
      locationId: location.id,
      state: "in_service"
    });
    const assetTag = await server.inject({
      method: "POST",
      url: `/api/assets/${asset.id}/tags`,
      payload: { baseUrl: "https://basecamp.example" }
    });
    const policy = await server.inject({
      method: "POST",
      url: "/api/maintenance/policies",
      payload: {
        name: "Generator monthly run",
        scopeType: "asset",
        assetId: asset.id,
        locationId: location.id,
        intervalCount: 1,
        intervalUnit: "month",
        nextDueAt: "2026-08-20T00:00:00.000Z"
      }
    });
    const maintenanceCompletion = await server.inject({
      method: "POST",
      url: `/api/maintenance/${policy.json().policy.id}/completions`,
      payload: {
        outcome: "issue_found",
        notes: "Starter battery weak."
      }
    });
    const syncInventoryCommand = createOfflineCommand({
      clientId: "iphone-test",
      localSequence: 1,
      createdAt: "2026-08-21T00:00:00.000Z",
      entityType: "inventory",
      intent: {
        type: "inventory.adjust_quantity",
        source: "quick_capture",
        itemName: "Water",
        quantityDelta: 1,
        unit: "gallon",
        locationName: "Primary Home"
      }
    });
    const syncQuestConflictCommand = createOfflineCommand({
      clientId: "iphone-test",
      localSequence: 2,
      createdAt: "2026-08-21T00:01:00.000Z",
      entityType: "quest",
      entityId: "home-label-utility-shutoffs",
      entityVersion: 0,
      intent: {
        type: "quest.set_status",
        questId: "home-label-utility-shutoffs",
        action: "complete"
      }
    });
    const syncBatch = await server.inject({
      method: "POST",
      url: "/api/sync",
      payload: {
        clientId: "iphone-test",
        commands: [syncInventoryCommand, syncQuestConflictCommand]
      }
    });
    const syncReplay = await server.inject({
      method: "POST",
      url: "/api/sync",
      payload: {
        clientId: "iphone-test",
        sinceCursor: syncBatch.json().nextCursor,
        commands: [syncInventoryCommand]
      }
    });
    const drillTemplates = await server.inject("/api/drills/templates");
    const drillTemplate = drillTemplates
      .json()
      .templates.find((candidate: { id: string }) => candidate.id === "drill-drill-one-hour-power-outage");
    const evidence = await server.inject({
      method: "POST",
      url: "/api/evidence",
      payload: {
        kind: "photo",
        title: "Power drill evidence",
        links: [
          { entityType: "drill", entityId: drillTemplate.id },
          { entityType: "asset", entityId: asset.id }
        ],
        metadata: {
          capturedAt: "2026-08-21T00:10:00.000Z",
          fileName: "power-drill.jpg",
          mimeType: "image/jpeg"
        }
      }
    });
    const skillTraining = await server.inject({
      method: "POST",
      url: "/api/skills/training",
      payload: {
        skillId: "skill-first-aid-cpr",
        name: "First Aid/CPR",
        categoryId: "skills-training",
        courseName: "First Aid/CPR",
        completedAt: "2026-08-21T00:11:00.000Z",
        expiresAt: "2027-08-21",
        evidenceIds: [evidence.json().evidence.id],
        stateAwarded: "validated"
      }
    });
    const drillRun = await server.inject({
      method: "POST",
      url: `/api/drills/${drillTemplate.id}/runs`,
      payload: {
        completedAt: "2026-08-21T00:12:00.000Z",
        criteriaResults: [
          {
            criterionId: drillTemplate.successCriteria[0].id,
            passed: false,
            notes: "Battery station was empty."
          }
        ],
        evidenceIds: [evidence.json().evidence.id],
        lessons: "Charge the station before the next drill."
      }
    });
    const gapReport = await server.inject("/api/reports/gaps");

    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, service: "basecamp-server" });
    expect(seed.statusCode).toBe(200);
    expect(seed.json().counts.categories).toBe(basecampSeed.categories.length);
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json()).toMatchObject(createDashboardSummary(basecampSeed));
    expect(categoryUpdate.statusCode).toBe(200);
    expect(categoryUpdate.json().categories.find((category: { id: string }) => category.id === "water")).toMatchObject({
      pursuitState: "later"
    });
    expect(startedQuest.statusCode).toBe(200);
    expect(startedQuest.json().instance.status).toBe("active");
    expect(completedQuest.statusCode).toBe(200);
    expect(completedQuest.json().dashboard.gamification.totalXp).toBeGreaterThan(0);
    expect(startedBomQuest.statusCode).toBe(200);
    expect(quickInventory.statusCode).toBe(200);
    expect(quickInventory.json().dashboard.inventory.locations[0]).toMatchObject({
      name: "Primary Home",
      maturity: "stash"
    });
    expect(quickInventory.json().dashboard.inventory.acquisitionNeeds[0]).toMatchObject({
      state: "substituted"
    });
    expect(assetTag.statusCode).toBe(200);
    expect(assetTag.json()).toMatchObject({
      assetId: asset.id,
      qrPayload: "https://basecamp.example/assets/asset-backup-generator"
    });
    expect(assetTag.json().qrSvg).toContain("<svg");
    expect(policy.statusCode).toBe(200);
    expect(maintenanceCompletion.statusCode).toBe(200);
    expect(maintenanceCompletion.json().event.followUpQuestTitle).toBe(
      "Resolve maintenance issue: Generator monthly run"
    );
    expect(syncBatch.statusCode).toBe(200);
    expect(syncBatch.json().accepted.map((result: { status: string }) => result.status)).toEqual([
      "accepted",
      "conflict"
    ]);
    expect(syncBatch.json().conflicts[0]).toMatchObject({
      entityType: "quest",
      userVisible: true
    });
    expect(syncReplay.statusCode).toBe(200);
    expect(syncReplay.json().replayedCommandCount).toBe(1);
    expect(drillTemplates.statusCode).toBe(200);
    expect(drillTemplates.json().templates.length).toBeGreaterThan(0);
    expect(evidence.statusCode).toBe(200);
    expect(evidence.json().evidence.links).toHaveLength(2);
    expect(skillTraining.statusCode).toBe(200);
    expect(skillTraining.json().skill).toMatchObject({
      skillId: "skill-first-aid-cpr",
      state: "validated"
    });
    expect(drillRun.statusCode).toBe(200);
    expect(drillRun.json().run).toMatchObject({
      result: "failed"
    });
    expect(drillRun.json().dashboard.gapReport.followUpQuests.some(
      (followUp: { sourceType: string }) => followUp.sourceType === "drill"
    )).toBe(true);
    expect(gapReport.statusCode).toBe(200);
    expect(gapReport.json().validationGaps.length).toBeGreaterThan(0);

    await server.close();
    database.close();
  });
});
