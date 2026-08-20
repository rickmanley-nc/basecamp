import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { BasecampSeed } from "@basecamp/domain";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultMigrationsDir = path.join(packageRoot, "migrations");

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export interface SeedImportResult {
  categories: number;
  levels: number;
  quests: number;
}

export function createDatabase(filename = ":memory:"): DatabaseSync {
  return new DatabaseSync(filename);
}

export async function ensureDatabaseDirectory(filename: string): Promise<void> {
  if (filename === ":memory:") {
    return;
  }

  await mkdir(path.dirname(filename), { recursive: true });
}

export function applyMigrations(
  database: DatabaseSync,
  migrationsDir = defaultMigrationsDir
): MigrationResult {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied: string[] = [];
  const skipped: string[] = [];
  const migrationId = "0001_basecamp_seed_baseline";
  const existing = database
    .prepare("SELECT id FROM schema_migrations WHERE id = ?")
    .get(migrationId);

  if (existing) {
    skipped.push(migrationId);
    return { applied, skipped };
  }

  const migrationSql = readFileSync(
    path.join(migrationsDir, `${migrationId}.sql`),
    "utf8"
  );
  database.exec(migrationSql);
  database
    .prepare("INSERT INTO schema_migrations (id) VALUES (?)")
    .run(migrationId);
  applied.push(migrationId);

  return { applied, skipped };
}

export function importSeed(database: DatabaseSync, seed: BasecampSeed): SeedImportResult {
  database.exec("BEGIN");

  try {
    database
      .prepare(
        "INSERT OR REPLACE INTO seed_imports (schema_version, generated_on) VALUES (?, ?)"
      )
      .run(seed.schemaVersion, seed.generatedOn);

    const insertCategory = database.prepare(`
      INSERT OR REPLACE INTO categories
      (id, name, description, criticality, default_pursuit_state)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const category of seed.categories) {
      insertCategory.run(
        category.id,
        category.name,
        category.description,
        category.criticality,
        category.defaultPursuitState
      );
    }

    const insertLevel = database.prepare(`
      INSERT OR REPLACE INTO capability_levels
      (id, number, name, duration, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const level of seed.levels) {
      insertLevel.run(
        level.id,
        level.number,
        level.name,
        level.duration,
        level.description
      );
    }

    const insertQuest = database.prepare(`
      INSERT OR REPLACE INTO quest_templates
      (
        id,
        title,
        category_id,
        target_level,
        taxonomy_json,
        estimated_minutes,
        estimated_cost_usd,
        xp,
        priority,
        why_it_matters,
        validation,
        dependencies_json,
        accomplishments_json,
        friction_goal_json,
        bom_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const quest of seed.quests) {
      insertQuest.run(
        quest.id,
        quest.title,
        quest.categoryId,
        quest.targetLevel,
        JSON.stringify(quest.taxonomy),
        quest.estimatedMinutes,
        quest.estimatedCostUsd,
        quest.xp,
        quest.priority,
        quest.whyItMatters,
        quest.validation,
        JSON.stringify(quest.dependencies ?? []),
        JSON.stringify(quest.accomplishments ?? []),
        quest.frictionGoal === undefined ? null : JSON.stringify(quest.frictionGoal),
        quest.bom === undefined ? null : JSON.stringify(quest.bom)
      );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return {
    categories: countRows(database, "categories"),
    levels: countRows(database, "capability_levels"),
    quests: countRows(database, "quest_templates")
  };
}

export function countRows(database: DatabaseSync, table: string): number {
  const result = database.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
    count: number;
  };
  return result.count;
}
