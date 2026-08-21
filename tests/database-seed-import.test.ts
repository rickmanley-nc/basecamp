import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  applyPersistedQuestAction,
  applySyncCommandBatch,
  createBasecampAssetTag,
  countRows,
  createDatabase,
  importSeed,
  listDrillRuns,
  listDrillTemplates,
  listEvidenceRecords,
  listQuestEvents,
  listSkillProgress,
  readHouseholdProgress,
  readInventoryState,
  listSyncConflicts,
  recordDrillRun,
  recordMaintenanceCompletion,
  recordQuickInventoryEntry,
  recordSkillTraining,
  setCategoryPursuit,
  upsertAsset,
  upsertEvidenceRecord,
  upsertLocation,
  upsertMaintenancePolicy
} from "@basecamp/database";
import { describe, expect, it } from "vitest";
import { createOfflineCommand } from "@basecamp/sync";

describe("database seed import", () => {
  it("applies the baseline migration and imports seed content", () => {
    const database = createDatabase();

    const migrations = applyMigrations(database);
    const imported = importSeed(database, basecampSeed);

    expect(migrations.applied).toEqual([
      "0001_basecamp_seed_baseline",
      "0002_household_progress_state",
      "0003_inventory_location_maintenance",
      "0004_offline_sync_commands",
      "0005_drills_skills_evidence",
      "0006_ops_audit"
    ]);
    expect(imported.categories).toBe(basecampSeed.categories.length);
    expect(imported.levels).toBe(basecampSeed.levels.length);
    expect(imported.quests).toBe(basecampSeed.quests.length);
    expect(imported.drillTemplates).toBeGreaterThan(0);
    expect(countRows(database, "seed_imports")).toBe(1);

    database.close();
  });

  it("persists category pursuit, quest lifecycle state, and audit events", () => {
    const database = createDatabase();

    applyMigrations(database);
    importSeed(database, basecampSeed);
    setCategoryPursuit(database, "water", "later", "2026-08-20T00:00:00Z");
    const started = applyPersistedQuestAction(
      database,
      basecampSeed,
      "water-calculate-household-requirements",
      "start",
      { now: "2026-08-20T00:01:00Z" }
    );
    const completed = applyPersistedQuestAction(
      database,
      basecampSeed,
      "water-calculate-household-requirements",
      "complete",
      { now: "2026-08-20T00:02:00Z" }
    );
    const progress = readHouseholdProgress(database);

    expect(started.instance.status).toBe("active");
    expect(completed.instance.status).toBe("complete");
    expect(progress.categoryPursuits?.[0]).toMatchObject({
      categoryId: "water",
      pursuitState: "later"
    });
    expect(progress.completedQuestIds).toContain("water-calculate-household-requirements");
    expect(listQuestEvents(database)).toHaveLength(2);

    database.close();
  });

  it("persists quick inventory entry, asset tags, and maintenance events", () => {
    const database = createDatabase();

    applyMigrations(database);
    importSeed(database, basecampSeed);
    const entry = recordQuickInventoryEntry(
      database,
      {
        itemName: "Commercial sealed water",
        quantity: 3,
        unit: "gallon",
        locationName: "Primary Home",
        categoryId: "water",
        type: "water_storage",
        expiresAt: "2027-08-21",
        notes: "Shelf A"
      },
      "2026-08-21T00:00:00.000Z"
    );
    const location = upsertLocation(
      database,
      { name: "Field Cache", kind: "cache", maturity: "known_location" },
      "2026-08-21T00:01:00.000Z"
    );
    const asset = upsertAsset(
      database,
      {
        name: "Backup Generator",
        type: "power_asset",
        categoryId: "power",
        locationId: location.id,
        state: "in_service"
      },
      "2026-08-21T00:02:00.000Z"
    );
    const tag = createBasecampAssetTag(
      database,
      asset.id,
      "2026-08-21T00:03:00.000Z",
      "https://basecamp.example"
    );
    const policy = upsertMaintenancePolicy(
      database,
      {
        name: "Generator monthly run",
        scopeType: "asset",
        assetId: asset.id,
        locationId: location.id,
        intervalCount: 1,
        intervalUnit: "month",
        nextDueAt: "2026-08-20T00:00:00.000Z"
      },
      "2026-08-21T00:04:00.000Z"
    );
    const completion = recordMaintenanceCompletion(database, policy.id, {
      now: "2026-08-21T00:05:00.000Z",
      outcome: "issue_found",
      notes: "Starter battery weak."
    });
    const inventory = readInventoryState(database, "2026-08-21T00:06:00.000Z");

    expect(entry.location.name).toBe("Primary Home");
    expect(entry.event.eventType).toBe("add");
    expect(tag.qrPayload).toBe("https://basecamp.example/assets/asset-backup-generator");
    expect(completion.event.followUpQuestTitle).toBe("Resolve maintenance issue: Generator monthly run");
    expect(inventory.locations.map((candidate) => candidate.name)).toEqual([
      "Field Cache",
      "Primary Home"
    ]);
    expect(inventory.events.map((event) => event.eventType)).toEqual(["add", "tag"]);
    expect(inventory.maintenanceDue[0]).toMatchObject({
      policyId: policy.id,
      status: "upcoming"
    });

    database.close();
  });

  it("persists idempotent sync commands and user-visible conflicts", () => {
    const database = createDatabase();

    applyMigrations(database);
    importSeed(database, basecampSeed);
    const inventoryCommand = createOfflineCommand({
      clientId: "iphone-test",
      localSequence: 1,
      createdAt: "2026-08-21T00:00:00.000Z",
      entityType: "inventory",
      intent: {
        type: "inventory.adjust_quantity",
        source: "quick_capture",
        itemName: "Water",
        quantityDelta: 2,
        unit: "gallon",
        locationName: "Primary Home"
      }
    });
    const questConflict = createOfflineCommand({
      clientId: "iphone-test",
      localSequence: 2,
      createdAt: "2026-08-21T00:01:00.000Z",
      entityType: "quest",
      entityId: "water-store-24-hour-drinking-water",
      entityVersion: 0,
      intent: {
        type: "quest.set_status",
        questId: "water-store-24-hour-drinking-water",
        action: "complete"
      }
    });

    applyPersistedQuestAction(
      database,
      basecampSeed,
      "water-store-24-hour-drinking-water",
      "start",
      { now: "2026-08-21T00:00:30.000Z" }
    );

    const first = applySyncCommandBatch(
      database,
      basecampSeed,
      {
        clientId: "iphone-test",
        commands: [inventoryCommand, questConflict]
      },
      "2026-08-21T00:02:00.000Z"
    );
    const replay = applySyncCommandBatch(
      database,
      basecampSeed,
      {
        clientId: "iphone-test",
        sinceCursor: first.nextCursor,
        commands: [inventoryCommand]
      },
      "2026-08-21T00:03:00.000Z"
    );
    const inventory = readInventoryState(database, "2026-08-21T00:04:00.000Z");

    expect(first.accepted.map((result) => result.status)).toEqual(["accepted", "conflict"]);
    expect(first.conflicts[0]).toMatchObject({
      entityType: "quest",
      userVisible: true
    });
    expect(replay.replayedCommandCount).toBe(1);
    expect(inventory.items[0]).toMatchObject({
      name: "Water"
    });
    expect(listSyncConflicts(database)).toHaveLength(1);

    database.close();
  });

  it("persists M5 evidence, skill training, drill templates, and drill runs", () => {
    const database = createDatabase();

    applyMigrations(database);
    importSeed(database, basecampSeed);
    const evidence = upsertEvidenceRecord(database, {
      kind: "photo",
      title: "First aid card",
      links: [
        { entityType: "quest", entityId: "skills-record-first-aid-cpr-training" },
        { entityType: "skill", entityId: "skill-first-aid-cpr" }
      ],
      metadata: {
        capturedAt: "2026-08-21T00:00:00.000Z",
        fileName: "first-aid-card.jpg",
        mimeType: "image/jpeg"
      }
    });
    const skill = recordSkillTraining(database, {
      skillId: "skill-first-aid-cpr",
      name: "First Aid/CPR",
      categoryId: "skills-training",
      courseName: "First Aid/CPR",
      provider: "County training center",
      completedAt: "2026-08-21T00:01:00.000Z",
      expiresAt: "2027-08-21",
      evidenceIds: [evidence.id],
      stateAwarded: "validated"
    });
    const template = listDrillTemplates(database).find(
      (candidate) => candidate.id === "drill-drill-one-hour-power-outage"
    )!;
    const run = recordDrillRun(database, template.id, {
      completedAt: "2026-08-21T00:02:00.000Z",
      criteriaResults: [
        {
          criterionId: template.successCriteria[0]!.id,
          passed: false,
          notes: "Battery station was not charged."
        }
      ],
      evidenceIds: [evidence.id],
      lessons: "Add a charging reminder."
    });
    const progress = readHouseholdProgress(database);

    expect(listEvidenceRecords(database)[0]).toMatchObject({
      id: evidence.id,
      title: "First aid card"
    });
    expect(skill.skill).toMatchObject({
      skillId: "skill-first-aid-cpr",
      state: "validated"
    });
    expect(listSkillProgress(database)[0]?.trainingRecords?.[0]).toMatchObject({
      courseName: "First Aid/CPR"
    });
    expect(run.run.result).toBe("failed");
    expect(run.run.followUpQuestSuggestions).toHaveLength(1);
    expect(listDrillRuns(database)).toHaveLength(1);
    expect(progress.evidenceRecords).toHaveLength(1);
    expect(progress.skillProgress).toHaveLength(1);
    expect(progress.drillRuns).toHaveLength(1);

    database.close();
  });
});
