import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  applyPersistedQuestAction,
  countRows,
  createDatabase,
  importSeed,
  listQuestEvents,
  readHouseholdProgress,
  setCategoryPursuit
} from "@basecamp/database";
import { describe, expect, it } from "vitest";

describe("database seed import", () => {
  it("applies the baseline migration and imports seed content", () => {
    const database = createDatabase();

    const migrations = applyMigrations(database);
    const imported = importSeed(database, basecampSeed);

    expect(migrations.applied).toEqual([
      "0001_basecamp_seed_baseline",
      "0002_household_progress_state"
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
});
