import { readdirSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import {
  applyQuestAction,
  type BasecampSeed,
  type CategoryId,
  type CategoryPursuitSnapshot,
  type HouseholdProgressSnapshot,
  type PursuitState,
  type QuestAction,
  type QuestActionOptions,
  type QuestId,
  type QuestInstance,
  type QuestLifecycleEvent,
  type QuestLifecycleResult,
  type QuestStatus,
  type XpEvent
} from "@basecamp/domain";

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

export interface QuestActionPersistenceResult extends QuestLifecycleResult {
  progress: HouseholdProgressSnapshot;
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
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migrationId = migrationFile.replace(/\.sql$/, "");
    const existing = database
      .prepare("SELECT id FROM schema_migrations WHERE id = ?")
      .get(migrationId);

    if (existing) {
      skipped.push(migrationId);
      continue;
    }

    const migrationSql = readFileSync(path.join(migrationsDir, migrationFile), "utf8");
    database.exec(migrationSql);
    database.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(migrationId);
    applied.push(migrationId);
  }

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

export function readHouseholdProgress(database: DatabaseSync): HouseholdProgressSnapshot {
  const categoryPursuits = database
    .prepare("SELECT category_id, pursuit_state, updated_at FROM category_pursuits ORDER BY category_id")
    .all()
    .map(rowToCategoryPursuit);
  const questInstances = database
    .prepare(
      `SELECT id, template_id, status, selected_by_user, category_pursuit_state,
        progress_percent, started_at, completed_at, snoozed_until
       FROM quest_instances
       ORDER BY updated_at, template_id`
    )
    .all()
    .map(rowToQuestInstance);
  const xpEvents = database
    .prepare(
      `SELECT id, source_type, source_id, reason, xp_awarded, occurred_at
       FROM xp_events
       ORDER BY occurred_at`
    )
    .all()
    .map(rowToXpEvent);

  return {
    completedQuestIds: questInstances
      .filter((instance) => instance.status === "complete")
      .map((instance) => instance.templateId),
    questInstances,
    categoryPursuits,
    failedValidationQuestIds: [],
    maintenanceRequiredQuestIds: [],
    maintenanceRequiredCategoryIds: [],
    interestCategoryIds: [],
    xpEvents
  };
}

export function setCategoryPursuit(
  database: DatabaseSync,
  categoryId: CategoryId,
  pursuitState: PursuitState,
  now = new Date().toISOString()
): HouseholdProgressSnapshot {
  database
    .prepare(
      `INSERT INTO category_pursuits (category_id, pursuit_state, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(category_id) DO UPDATE SET
         pursuit_state = excluded.pursuit_state,
         updated_at = excluded.updated_at`
    )
    .run(categoryId, pursuitState, now);

  database
    .prepare(
      `UPDATE quest_instances
       SET category_pursuit_state = ?, updated_at = ?
       WHERE template_id IN (SELECT id FROM quest_templates WHERE category_id = ?)`
    )
    .run(pursuitState, now, categoryId);

  return readHouseholdProgress(database);
}

export function applyPersistedQuestAction(
  database: DatabaseSync,
  seed: BasecampSeed,
  questId: QuestId,
  action: QuestAction,
  options: QuestActionOptions = {}
): QuestActionPersistenceResult {
  const template = seed.quests.find((quest) => quest.id === questId);

  if (template === undefined) {
    throw new Error(`Unknown quest ${questId}.`);
  }

  const current = getQuestInstance(database, questId);
  const categoryPursuitState =
    options.categoryPursuitState ?? readCategoryPursuit(database, template.categoryId) ?? templateCategoryState(seed, template.categoryId);
  const result = applyQuestAction(template, current, action, {
    ...options,
    categoryPursuitState
  });

  database.exec("BEGIN");

  try {
    saveQuestInstance(database, result.instance, result.event.occurredAt);
    saveQuestEvent(database, result.instance.id, result.event);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return {
    ...result,
    progress: readHouseholdProgress(database)
  };
}

export function recordXpEvent(database: DatabaseSync, event: XpEvent): HouseholdProgressSnapshot {
  database
    .prepare(
      `INSERT OR REPLACE INTO xp_events
       (id, source_type, source_id, reason, xp_awarded, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(event.id, event.sourceType, event.sourceId, event.reason, event.xpAwarded, event.occurredAt);

  return readHouseholdProgress(database);
}

export function listQuestEvents(database: DatabaseSync): QuestLifecycleEvent[] {
  return database
    .prepare(
      `SELECT id, template_id, action, from_status, to_status, reason, occurred_at
       FROM quest_events
       ORDER BY occurred_at`
    )
    .all()
    .map(rowToQuestEvent);
}

function getQuestInstance(
  database: DatabaseSync,
  templateId: QuestId
): QuestInstance | undefined {
  const row = database
    .prepare(
      `SELECT id, template_id, status, selected_by_user, category_pursuit_state,
        progress_percent, started_at, completed_at, snoozed_until
       FROM quest_instances
       WHERE template_id = ?`
    )
    .get(templateId);

  return row === undefined ? undefined : rowToQuestInstance(row);
}

function saveQuestInstance(
  database: DatabaseSync,
  instance: QuestInstance,
  updatedAt: string
): void {
  database
    .prepare(
      `INSERT INTO quest_instances
       (
         id, template_id, status, selected_by_user, category_pursuit_state,
         progress_percent, started_at, completed_at, snoozed_until, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(template_id) DO UPDATE SET
         status = excluded.status,
         selected_by_user = excluded.selected_by_user,
         category_pursuit_state = excluded.category_pursuit_state,
         progress_percent = excluded.progress_percent,
         started_at = excluded.started_at,
         completed_at = excluded.completed_at,
         snoozed_until = excluded.snoozed_until,
         updated_at = excluded.updated_at`
    )
    .run(
      instance.id,
      instance.templateId,
      instance.status,
      instance.selectedByUser ? 1 : 0,
      instance.categoryPursuitState,
      instance.progressPercent,
      instance.startedAt ?? null,
      instance.completedAt ?? null,
      instance.snoozedUntil ?? null,
      updatedAt
    );
}

function saveQuestEvent(
  database: DatabaseSync,
  questInstanceId: string,
  event: QuestLifecycleEvent
): void {
  database
    .prepare(
      `INSERT INTO quest_events
       (id, quest_instance_id, template_id, action, from_status, to_status, reason, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      event.id,
      questInstanceId,
      event.templateId,
      event.action,
      event.fromStatus,
      event.toStatus,
      event.reason,
      event.occurredAt
    );
}

function readCategoryPursuit(
  database: DatabaseSync,
  categoryId: CategoryId
): PursuitState | undefined {
  const row = database
    .prepare("SELECT pursuit_state FROM category_pursuits WHERE category_id = ?")
    .get(categoryId) as { pursuit_state: PursuitState } | undefined;

  return row?.pursuit_state;
}

function templateCategoryState(seed: BasecampSeed, categoryId: CategoryId): PursuitState {
  const category = seed.categories.find((candidate) => candidate.id === categoryId);

  if (category === undefined) {
    throw new Error(`Unknown category ${categoryId}.`);
  }

  return category.defaultPursuitState;
}

function rowToCategoryPursuit(row: unknown): CategoryPursuitSnapshot {
  const value = row as {
    category_id: CategoryId;
    pursuit_state: PursuitState;
    updated_at: string;
  };

  return {
    categoryId: value.category_id,
    pursuitState: value.pursuit_state,
    updatedAt: value.updated_at
  };
}

function rowToQuestInstance(row: unknown): QuestInstance {
  const value = row as {
    id: string;
    template_id: QuestId;
    status: QuestStatus;
    selected_by_user: number;
    category_pursuit_state: PursuitState;
    progress_percent: number;
    started_at: string | null;
    completed_at: string | null;
    snoozed_until: string | null;
  };

  return {
    id: value.id,
    templateId: value.template_id,
    status: value.status,
    selectedByUser: value.selected_by_user === 1,
    categoryPursuitState: value.category_pursuit_state,
    progressPercent: value.progress_percent,
    ...(value.started_at === null ? {} : { startedAt: value.started_at }),
    ...(value.completed_at === null ? {} : { completedAt: value.completed_at }),
    ...(value.snoozed_until === null ? {} : { snoozedUntil: value.snoozed_until })
  };
}

function rowToQuestEvent(row: unknown): QuestLifecycleEvent {
  const value = row as {
    id: string;
    template_id: QuestId;
    action: QuestAction;
    from_status: QuestStatus;
    to_status: QuestStatus;
    reason: string;
    occurred_at: string;
  };

  return {
    id: value.id,
    templateId: value.template_id,
    action: value.action,
    fromStatus: value.from_status,
    toStatus: value.to_status,
    reason: value.reason,
    occurredAt: value.occurred_at
  };
}

function rowToXpEvent(row: unknown): XpEvent {
  const value = row as {
    id: string;
    source_type: XpEvent["sourceType"];
    source_id: string;
    reason: string;
    xp_awarded: number;
    occurred_at: string;
  };

  return {
    id: value.id,
    sourceType: value.source_type,
    sourceId: value.source_id,
    reason: value.reason,
    xpAwarded: value.xp_awarded,
    occurredAt: value.occurred_at
  };
}
