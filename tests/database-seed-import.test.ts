import { basecampSeed } from "@basecamp/content";
import { applyMigrations, countRows, createDatabase, importSeed } from "@basecamp/database";
import { describe, expect, it } from "vitest";

describe("database seed import", () => {
  it("applies the baseline migration and imports seed content", () => {
    const database = createDatabase();

    const migrations = applyMigrations(database);
    const imported = importSeed(database, basecampSeed);

    expect(migrations.applied).toContain("0001_basecamp_seed_baseline");
    expect(imported.categories).toBe(basecampSeed.categories.length);
    expect(imported.levels).toBe(basecampSeed.levels.length);
    expect(imported.quests).toBe(basecampSeed.quests.length);
    expect(countRows(database, "seed_imports")).toBe(1);

    database.close();
  });
});
