import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  applyPersistedQuestAction,
  createBasecampAssetTag,
  countRows,
  createDatabase,
  importSeed,
  listQuestEvents,
  readHouseholdProgress,
  readInventoryState,
  recordMaintenanceCompletion,
  recordQuickInventoryEntry,
  setCategoryPursuit,
  upsertAsset,
  upsertLocation,
  upsertMaintenancePolicy
} from "@basecamp/database";
import { describe, expect, it } from "vitest";

describe("database seed import", () => {
  it("applies the baseline migration and imports seed content", () => {
    const database = createDatabase();

    const migrations = applyMigrations(database);
    const imported = importSeed(database, basecampSeed);

    expect(migrations.applied).toEqual([
      "0001_basecamp_seed_baseline",
      "0002_household_progress_state",
      "0003_inventory_location_maintenance"
    ]);
    expect(imported.categories).toBe(basecampSeed.categories.length);
    expect(imported.levels).toBe(basecampSeed.levels.length);
    expect(imported.quests).toBe(basecampSeed.quests.length);
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
});
