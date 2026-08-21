import { readdirSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import {
  applyQuestAction,
  calculateLocationProgression,
  calculateNextMaintenanceDue,
  completeMaintenancePolicy,
  createAssetTag,
  maintenanceDueStatus,
  slugify,
  type Asset,
  type AssetTag,
  type BasecampSeed,
  type CategoryId,
  type CategoryPursuitSnapshot,
  type HouseholdProgressSnapshot,
  type InventoryEvent,
  type InventoryItem,
  type InventoryItemType,
  type InventoryLot,
  type InventoryState,
  type Kit,
  type KitItem,
  type Location,
  type LocationKind,
  type LocationMaturity,
  type LocationProgressionResult,
  type LocationReadiness,
  type MaintenanceDueItem,
  type MaintenanceEvent,
  type MaintenancePolicy,
  type MaintenanceRecurrenceUnit,
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
import {
  resolveOfflineCommandConflict,
  type OfflineCommand,
  type SyncBatchRequest,
  type SyncBatchResponse,
  type SyncCommandResult,
  type SyncConflict
} from "@basecamp/sync";

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

export interface InventoryPersistenceState {
  locations: Location[];
  locationReadiness: LocationReadiness[];
  locationProgression: LocationProgressionResult[];
  items: InventoryItem[];
  lots: InventoryLot[];
  assets: Asset[];
  assetTags: AssetTag[];
  kits: Kit[];
  kitItems: KitItem[];
  events: InventoryEvent[];
  maintenancePolicies: MaintenancePolicy[];
  maintenanceEvents: MaintenanceEvent[];
  maintenanceDue: MaintenanceDueItem[];
}

export interface QuickInventoryEntryInput {
  itemName: string;
  quantity: number;
  locationName: string;
  unit?: string;
  categoryId?: CategoryId;
  type?: InventoryItemType;
  expiresAt?: string;
  notes?: string;
}

export interface QuickInventoryEntryResult {
  item: InventoryItem;
  lot: InventoryLot;
  location: Location;
  event: InventoryEvent;
  inventory: InventoryPersistenceState;
}

export interface MaintenancePolicyInput {
  name: string;
  scopeType: MaintenancePolicy["scopeType"];
  intervalCount: number;
  intervalUnit: MaintenanceRecurrenceUnit;
  active?: boolean;
  assetId?: string;
  itemId?: string;
  locationId?: string;
  categoryId?: CategoryId;
  lastCompletedAt?: string;
  nextDueAt?: string;
  instructions?: string;
}

export interface SyncPersistenceResult extends SyncBatchResponse {
  replayedCommandCount: number;
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

export function readInventoryState(
  database: DatabaseSync,
  now = new Date().toISOString()
): InventoryPersistenceState {
  const locations = database
    .prepare("SELECT id, name, kind, maturity, notes FROM locations ORDER BY name")
    .all()
    .map(rowToLocation);
  const locationReadiness = database
    .prepare(
      `SELECT location_id, category_id, score, status, source_capability_outpost_id, validated_at
       FROM location_readiness
       ORDER BY location_id, category_id`
    )
    .all()
    .map(rowToLocationReadiness);
  const items = database
    .prepare(
      `SELECT id, name, type, category_id, state, functional_requirement, unit, capability_state_json
       FROM inventory_items
       ORDER BY name`
    )
    .all()
    .map(rowToInventoryItem);
  const lots = database
    .prepare(
      `SELECT id, item_id, location_id, quantity, unit, state, expires_at, acquired_at, notes
       FROM inventory_lots
       ORDER BY created_at, id`
    )
    .all()
    .map(rowToInventoryLot);
  const assets = database
    .prepare(
      `SELECT id, item_id, name, type, category_id, location_id, state, serial_number, notes
       FROM assets
       ORDER BY name`
    )
    .all()
    .map(rowToAsset);
  const assetTags = database
    .prepare(
      `SELECT id, asset_id, tag_code, qr_payload, lookup_path, print_label, created_at
       FROM asset_tags
       ORDER BY created_at, id`
    )
    .all()
    .map(rowToAssetTag);
  const kits = database
    .prepare("SELECT id, name, location_id, category_id, state, notes FROM kits ORDER BY name")
    .all()
    .map(rowToKit);
  const kitItems = database
    .prepare(
      `SELECT id, kit_id, item_id, required_quantity, present_quantity, required, state, notes
       FROM kit_items
       ORDER BY kit_id, id`
    )
    .all()
    .map(rowToKitItem);
  const events = database
    .prepare(
      `SELECT id, event_type, item_id, asset_id, lot_id, from_location_id, to_location_id,
        quantity_delta, unit, state_after, notes, occurred_at
       FROM inventory_events
       ORDER BY occurred_at, id`
    )
    .all()
    .map(rowToInventoryEvent);
  const maintenancePolicies = database
    .prepare(
      `SELECT id, name, scope_type, asset_id, item_id, location_id, category_id,
        interval_count, interval_unit, active, last_completed_at, next_due_at, instructions
       FROM maintenance_policies
       ORDER BY next_due_at, name`
    )
    .all()
    .map(rowToMaintenancePolicy);
  const maintenanceEvents = database
    .prepare(
      `SELECT id, policy_id, event_type, outcome, occurred_at, next_due_at, notes, follow_up_quest_title
       FROM maintenance_events
       ORDER BY occurred_at, id`
    )
    .all()
    .map(rowToMaintenanceEvent);
  const maintenanceDue = maintenancePolicies
    .filter((policy) => policy.active && policy.nextDueAt !== undefined)
    .map((policy) => ({
      policyId: policy.id,
      title: policy.name,
      dueAt: policy.nextDueAt as string,
      status: maintenanceDueStatus(policy.nextDueAt as string, now),
      scopeLabel: maintenanceScopeLabel(policy, { locations, items, assets }),
      ...(maintenanceEvents.find((event) => event.policyId === policy.id)?.followUpQuestTitle === undefined
        ? {}
        : {
            followUpQuestTitle: maintenanceEvents.find((event) => event.policyId === policy.id)
              ?.followUpQuestTitle as string
          })
    }));
  const activeMaintenancePolicyCountByLocation = new Map<string, number>();

  for (const policy of maintenancePolicies) {
    if (!policy.active) {
      continue;
    }

    for (const location of locations) {
      if (policyAppliesToLocation(policy, location.id, { items, lots, assets, kits })) {
        activeMaintenancePolicyCountByLocation.set(
          location.id,
          (activeMaintenancePolicyCountByLocation.get(location.id) ?? 0) + 1
        );
      }
    }
  }

  const locationProgression = locations.map((location) =>
    calculateLocationProgression({
      location,
      inventoryItems: items,
      inventoryLots: lots,
      assets,
      kits,
      readiness: locationReadiness,
      maintenanceDue: maintenanceDue.filter((due) => {
        const policy = maintenancePolicies.find((candidate) => candidate.id === due.policyId);
        return policy === undefined
          ? false
          : policyAppliesToLocation(policy, location.id, { items, lots, assets, kits });
      }),
      activeMaintenancePolicyCount: activeMaintenancePolicyCountByLocation.get(location.id) ?? 0
    })
  );

  return {
    locations,
    locationReadiness,
    locationProgression,
    items,
    lots,
    assets,
    assetTags,
    kits,
    kitItems,
    events,
    maintenancePolicies,
    maintenanceEvents,
    maintenanceDue
  };
}

export function recordQuickInventoryEntry(
  database: DatabaseSync,
  input: QuickInventoryEntryInput,
  now = new Date().toISOString()
): QuickInventoryEntryResult {
  const location = upsertLocation(database, {
    name: input.locationName,
    kind: "home",
    maturity: "known_location"
  }, now);
  const item = upsertInventoryItem(database, {
    name: input.itemName,
    type: input.type ?? inferInventoryType(input.itemName),
    unit: input.unit ?? "each",
    functionalRequirement: input.itemName,
    state: "located",
    ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId })
  }, now);
  const lotState: InventoryState =
    input.expiresAt !== undefined && input.expiresAt < now.slice(0, 10) ? "expired" : "located";
  const lot: InventoryLot = {
    id: `lot-${slugify(item.id)}-${slugify(now)}`,
    itemId: item.id,
    locationId: location.id,
    quantity: input.quantity,
    unit: input.unit ?? item.unit ?? "each",
    state: lotState,
    acquiredAt: now,
    ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
    ...(input.notes === undefined ? {} : { notes: input.notes })
  };
  const event: InventoryEvent = {
    id: `inventory-event-${slugify(item.id)}-${slugify(now)}`,
    eventType: "add",
    itemId: item.id,
    lotId: lot.id,
    toLocationId: location.id,
    quantityDelta: input.quantity,
    unit: lot.unit,
    stateAfter: lotState,
    ...(input.notes === undefined ? {} : { notes: input.notes }),
    occurredAt: now
  };

  database.exec("BEGIN");

  try {
    database
      .prepare(
        `INSERT INTO inventory_lots
         (id, item_id, location_id, quantity, unit, state, expires_at, acquired_at, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        lot.id,
        lot.itemId,
        lot.locationId,
        lot.quantity,
        lot.unit,
        lot.state,
        lot.expiresAt ?? null,
        lot.acquiredAt ?? null,
        lot.notes ?? null,
        now
      );
    saveInventoryEvent(database, event);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  syncStoredLocationMaturity(database, location.id, now);

  return {
    item,
    lot,
    location,
    event,
    inventory: readInventoryState(database, now)
  };
}

export function upsertLocation(
  database: DatabaseSync,
  location: {
    name: string;
    kind?: LocationKind;
    maturity?: LocationMaturity;
    notes?: string;
  },
  now = new Date().toISOString()
): Location {
  const id = `location-${slugify(location.name)}`;
  const kind = location.kind ?? "other";
  const maturity = location.maturity ?? "known_location";

  database
    .prepare(
      `INSERT INTO locations (id, name, kind, maturity, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         kind = excluded.kind,
         notes = COALESCE(excluded.notes, locations.notes),
         updated_at = excluded.updated_at`
    )
    .run(id, location.name, kind, maturity, location.notes ?? null, now, now);

  const row = database.prepare("SELECT id, name, kind, maturity, notes FROM locations WHERE name = ?").get(location.name);

  if (row === undefined) {
    throw new Error(`Could not save location ${location.name}.`);
  }

  return rowToLocation(row);
}

export function upsertLocationReadiness(
  database: DatabaseSync,
  readiness: LocationReadiness
): LocationReadiness[] {
  database
    .prepare(
      `INSERT INTO location_readiness
       (location_id, category_id, score, status, source_capability_outpost_id, validated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(location_id, category_id) DO UPDATE SET
         score = excluded.score,
         status = excluded.status,
         source_capability_outpost_id = excluded.source_capability_outpost_id,
         validated_at = excluded.validated_at`
    )
    .run(
      readiness.locationId,
      readiness.categoryId,
      readiness.score,
      readiness.status,
      readiness.sourceCapabilityOutpostId ?? null,
      readiness.validatedAt ?? null
    );

  syncStoredLocationMaturity(database, readiness.locationId, readiness.validatedAt ?? new Date().toISOString());

  return readInventoryState(database).locationReadiness;
}

export function upsertInventoryItem(
  database: DatabaseSync,
  item: {
    name: string;
    type: InventoryItemType;
    state?: InventoryState;
    categoryId?: CategoryId;
    functionalRequirement?: string;
    unit?: string;
  },
  now = new Date().toISOString()
): InventoryItem {
  const id = `item-${slugify(item.name)}`;
  const state = item.state ?? "owned";
  const capabilityState = capabilityStateForInventoryState(state);

  database
    .prepare(
      `INSERT INTO inventory_items
       (
         id, name, type, category_id, state, functional_requirement, unit,
         capability_state_json, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         category_id = COALESCE(excluded.category_id, inventory_items.category_id),
         state = excluded.state,
         functional_requirement = COALESCE(excluded.functional_requirement, inventory_items.functional_requirement),
         unit = COALESCE(excluded.unit, inventory_items.unit),
         capability_state_json = excluded.capability_state_json,
         updated_at = excluded.updated_at`
    )
    .run(
      id,
      item.name,
      item.type,
      item.categoryId ?? null,
      state,
      item.functionalRequirement ?? null,
      item.unit ?? null,
      JSON.stringify(capabilityState),
      now,
      now
    );

  const row = database
    .prepare(
      `SELECT id, name, type, category_id, state, functional_requirement, unit, capability_state_json
       FROM inventory_items
       WHERE id = ?`
    )
    .get(id);

  if (row === undefined) {
    throw new Error(`Could not save inventory item ${item.name}.`);
  }

  return rowToInventoryItem(row);
}

export function upsertAsset(
  database: DatabaseSync,
  asset: {
    name: string;
    type: InventoryItemType;
    state?: InventoryState;
    itemId?: string;
    categoryId?: CategoryId;
    locationId?: string;
    serialNumber?: string;
    notes?: string;
  },
  now = new Date().toISOString()
): Asset {
  const id = `asset-${slugify(asset.name)}`;
  const state = asset.state ?? "owned";

  database
    .prepare(
      `INSERT INTO assets
       (id, item_id, name, type, category_id, location_id, state, serial_number, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         item_id = COALESCE(excluded.item_id, assets.item_id),
         name = excluded.name,
         type = excluded.type,
         category_id = COALESCE(excluded.category_id, assets.category_id),
         location_id = COALESCE(excluded.location_id, assets.location_id),
         state = excluded.state,
         serial_number = COALESCE(excluded.serial_number, assets.serial_number),
         notes = COALESCE(excluded.notes, assets.notes),
         updated_at = excluded.updated_at`
    )
    .run(
      id,
      asset.itemId ?? null,
      asset.name,
      asset.type,
      asset.categoryId ?? null,
      asset.locationId ?? null,
      state,
      asset.serialNumber ?? null,
      asset.notes ?? null,
      now,
      now
    );

  if (asset.locationId !== undefined) {
    syncStoredLocationMaturity(database, asset.locationId, now);
  }

  const row = database
    .prepare(
      `SELECT id, item_id, name, type, category_id, location_id, state, serial_number, notes
       FROM assets
       WHERE id = ?`
    )
    .get(id);

  if (row === undefined) {
    throw new Error(`Could not save asset ${asset.name}.`);
  }

  return rowToAsset(row);
}

export function createBasecampAssetTag(
  database: DatabaseSync,
  assetId: string,
  now = new Date().toISOString(),
  baseUrl?: string
): AssetTag {
  const asset = database.prepare("SELECT id FROM assets WHERE id = ?").get(assetId);

  if (asset === undefined) {
    throw new Error(`Unknown asset ${assetId}.`);
  }

  const tag = createAssetTag({ assetId, now, ...(baseUrl === undefined ? {} : { baseUrl }) });

  database
    .prepare(
      `INSERT OR REPLACE INTO asset_tags
       (id, asset_id, tag_code, qr_payload, lookup_path, print_label, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(tag.id, tag.assetId, tag.tagCode, tag.qrPayload, tag.lookupPath, tag.printLabel, tag.createdAt);

  saveInventoryEvent(database, {
    id: `inventory-event-${slugify(tag.id)}-${slugify(now)}`,
    eventType: "tag",
    assetId,
    stateAfter: "located",
    notes: `Generated asset tag ${tag.tagCode}.`,
    occurredAt: now
  });

  return tag;
}

export function readAssetWithTags(
  database: DatabaseSync,
  assetId: string
): { asset: Asset; tags: AssetTag[] } | undefined {
  const assetRow = database
    .prepare(
      `SELECT id, item_id, name, type, category_id, location_id, state, serial_number, notes
       FROM assets
       WHERE id = ?`
    )
    .get(assetId);

  if (assetRow === undefined) {
    return undefined;
  }

  const tags = database
    .prepare(
      `SELECT id, asset_id, tag_code, qr_payload, lookup_path, print_label, created_at
       FROM asset_tags
       WHERE asset_id = ?
       ORDER BY created_at`
    )
    .all(assetId)
    .map(rowToAssetTag);

  return {
    asset: rowToAsset(assetRow),
    tags
  };
}

export function upsertMaintenancePolicy(
  database: DatabaseSync,
  input: MaintenancePolicyInput,
  now = new Date().toISOString()
): MaintenancePolicy {
  const id = `maintenance-policy-${slugify(input.name)}`;
  const nextDueAt =
    input.nextDueAt ?? calculatePolicySeedDueDate(input.lastCompletedAt ?? now, input.intervalCount, input.intervalUnit);

  database
    .prepare(
      `INSERT INTO maintenance_policies
       (
         id, name, scope_type, asset_id, item_id, location_id, category_id,
         interval_count, interval_unit, active, last_completed_at, next_due_at,
         instructions, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         scope_type = excluded.scope_type,
         asset_id = COALESCE(excluded.asset_id, maintenance_policies.asset_id),
         item_id = COALESCE(excluded.item_id, maintenance_policies.item_id),
         location_id = COALESCE(excluded.location_id, maintenance_policies.location_id),
         category_id = COALESCE(excluded.category_id, maintenance_policies.category_id),
         interval_count = excluded.interval_count,
         interval_unit = excluded.interval_unit,
         active = excluded.active,
         last_completed_at = COALESCE(excluded.last_completed_at, maintenance_policies.last_completed_at),
         next_due_at = excluded.next_due_at,
         instructions = COALESCE(excluded.instructions, maintenance_policies.instructions),
         updated_at = excluded.updated_at`
    )
    .run(
      id,
      input.name,
      input.scopeType,
      input.assetId ?? null,
      input.itemId ?? null,
      input.locationId ?? null,
      input.categoryId ?? null,
      input.intervalCount,
      input.intervalUnit,
      input.active === false ? 0 : 1,
      input.lastCompletedAt ?? null,
      nextDueAt,
      input.instructions ?? null,
      now,
      now
    );

  if (input.locationId !== undefined) {
    syncStoredLocationMaturity(database, input.locationId, now);
  }

  const row = database
    .prepare(
      `SELECT id, name, scope_type, asset_id, item_id, location_id, category_id,
        interval_count, interval_unit, active, last_completed_at, next_due_at, instructions
       FROM maintenance_policies
       WHERE id = ?`
    )
    .get(id);

  if (row === undefined) {
    throw new Error(`Could not save maintenance policy ${input.name}.`);
  }

  return rowToMaintenancePolicy(row);
}

export function recordMaintenanceCompletion(
  database: DatabaseSync,
  policyId: string,
  options: { now?: string; outcome?: MaintenanceEvent["outcome"]; notes?: string } = {}
): { policy: MaintenancePolicy; event: MaintenanceEvent; inventory: InventoryPersistenceState } {
  const now = options.now ?? new Date().toISOString();
  const row = database
    .prepare(
      `SELECT id, name, scope_type, asset_id, item_id, location_id, category_id,
        interval_count, interval_unit, active, last_completed_at, next_due_at, instructions
       FROM maintenance_policies
       WHERE id = ?`
    )
    .get(policyId);

  if (row === undefined) {
    throw new Error(`Unknown maintenance policy ${policyId}.`);
  }

  const current = rowToMaintenancePolicy(row);
  const completion = completeMaintenancePolicy(current, {
    now,
    ...(options.outcome === undefined ? {} : { outcome: options.outcome }),
    ...(options.notes === undefined ? {} : { notes: options.notes })
  });

  database.exec("BEGIN");

  try {
    database
      .prepare(
        `UPDATE maintenance_policies
         SET last_completed_at = ?, next_due_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        completion.policy.lastCompletedAt ?? null,
        completion.policy.nextDueAt ?? null,
        now,
        completion.policy.id
      );
    database
      .prepare(
        `INSERT INTO maintenance_events
         (id, policy_id, event_type, outcome, occurred_at, next_due_at, notes, follow_up_quest_title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        completion.event.id,
        completion.event.policyId,
        completion.event.eventType,
        completion.event.outcome,
        completion.event.occurredAt,
        completion.event.nextDueAt ?? null,
        completion.event.notes ?? null,
        completion.event.followUpQuestTitle ?? null
      );
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  if (completion.policy.locationId !== undefined) {
    syncStoredLocationMaturity(database, completion.policy.locationId, now);
  }

  return {
    ...completion,
    inventory: readInventoryState(database, now)
  };
}

export function applySyncCommandBatch(
  database: DatabaseSync,
  seed: BasecampSeed,
  batch: SyncBatchRequest,
  now = new Date().toISOString()
): SyncPersistenceResult {
  if (batch.clientId.trim().length === 0) {
    throw new Error("Sync client ID is required.");
  }

  upsertSyncClient(database, batch.clientId, now);

  const accepted: SyncCommandResult[] = [];
  const conflicts: SyncConflict[] = [];

  for (const command of batch.commands) {
    validateSyncCommand(batch.clientId, command);

    const existing = readSyncCommandResult(database, command.commandId);

    if (existing !== undefined) {
      accepted.push({
        commandId: command.commandId,
        status: "duplicate",
        policy: "idempotent_duplicate",
        cursor: existing.cursor,
        message: "Command was already processed."
      });
      continue;
    }

    const currentEntityVersion = currentEntityVersionFor(database, command);
    const decision = resolveOfflineCommandConflict(
      command,
      currentEntityVersion === undefined ? {} : { currentEntityVersion }
    );
    const cursor = insertSyncCommand(database, command, decision.policy, decision.outcome, now);

    if (decision.outcome === "conflict") {
      const conflict = insertSyncConflict(database, command, decision, now);
      conflicts.push(conflict);
      accepted.push({
        commandId: command.commandId,
        status: "conflict",
        policy: decision.policy,
        cursor,
        message: decision.reason
      });
      continue;
    }

    applyAcceptedOfflineCommand(database, seed, command, now);
    accepted.push({
      commandId: command.commandId,
      status: decision.outcome === "duplicate" ? "duplicate" : "accepted",
      policy: decision.policy,
      cursor,
      message: decision.reason
    });
  }

  const nextCursor = latestSyncCursor(database);
  database
    .prepare("UPDATE sync_clients SET last_seen_at = ?, last_cursor = ? WHERE client_id = ?")
    .run(now, nextCursor, batch.clientId);

  return {
    clientId: batch.clientId,
    nextCursor,
    accepted,
    conflicts,
    replayedCommandCount: accepted.filter((result) => result.status === "duplicate").length
  };
}

export function listSyncConflicts(database: DatabaseSync): SyncConflict[] {
  return database
    .prepare(
      `SELECT id, command_id, entity_type, entity_id, policy, reason, user_visible
       FROM sync_conflicts
       ORDER BY created_at, id`
    )
    .all()
    .map(rowToSyncConflict);
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

function saveInventoryEvent(database: DatabaseSync, event: InventoryEvent): void {
  database
    .prepare(
      `INSERT OR REPLACE INTO inventory_events
       (
         id, event_type, item_id, asset_id, lot_id, from_location_id, to_location_id,
         quantity_delta, unit, state_after, notes, occurred_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      event.id,
      event.eventType,
      event.itemId ?? null,
      event.assetId ?? null,
      event.lotId ?? null,
      event.fromLocationId ?? null,
      event.toLocationId ?? null,
      event.quantityDelta ?? null,
      event.unit ?? null,
      event.stateAfter ?? null,
      event.notes ?? null,
      event.occurredAt
    );
}

function upsertSyncClient(database: DatabaseSync, clientId: string, now: string): void {
  database
    .prepare(
      `INSERT INTO sync_clients (client_id, registered_at, last_seen_at, last_cursor)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(client_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`
    )
    .run(clientId, now, now, "sync:0");
}

function validateSyncCommand(clientId: string, command: OfflineCommand): void {
  if (command.clientId !== clientId) {
    throw new Error(`Command ${command.commandId} belongs to a different client.`);
  }

  if (command.localSequence < 1) {
    throw new Error(`Command ${command.commandId} has an invalid local sequence.`);
  }

  if (command.commandId.trim().length === 0) {
    throw new Error("Command ID is required.");
  }
}

function readSyncCommandResult(
  database: DatabaseSync,
  commandId: string
): { cursor: string; result: SyncCommandResult } | undefined {
  const row = database
    .prepare(
      `SELECT server_sequence, result_json
       FROM sync_commands
       WHERE command_id = ?`
    )
    .get(commandId) as
    | {
        server_sequence: number;
        result_json: string;
      }
    | undefined;

  if (row === undefined) {
    return undefined;
  }

  return {
    cursor: syncCursor(row.server_sequence),
    result: JSON.parse(row.result_json) as SyncCommandResult
  };
}

function insertSyncCommand(
  database: DatabaseSync,
  command: OfflineCommand,
  policy: SyncCommandResult["policy"],
  outcome: "accepted" | "duplicate" | "conflict",
  now: string
): string {
  const result = {
    commandId: command.commandId,
    status: outcome,
    policy,
    message: `Stored command ${command.commandId}.`
  };

  database
    .prepare(
      `INSERT INTO sync_commands
       (
         command_id, client_id, local_sequence, created_at, received_at, entity_type,
         entity_id, entity_version, intent_json, status, policy, result_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      command.commandId,
      command.clientId,
      command.localSequence,
      command.createdAt,
      now,
      command.entityType,
      command.entityId ?? null,
      command.entityVersion ?? null,
      JSON.stringify(command.intent),
      outcome,
      policy,
      JSON.stringify(result)
    );

  const row = database
    .prepare("SELECT server_sequence FROM sync_commands WHERE command_id = ?")
    .get(command.commandId) as { server_sequence: number };

  return syncCursor(row.server_sequence);
}

function insertSyncConflict(
  database: DatabaseSync,
  command: OfflineCommand,
  decision: ReturnType<typeof resolveOfflineCommandConflict>,
  now: string
): SyncConflict {
  const conflict: SyncConflict = {
    id: `sync-conflict-${slugify(command.commandId)}`,
    commandId: command.commandId,
    entityType: command.entityType,
    ...(command.entityId === undefined ? {} : { entityId: command.entityId }),
    policy: decision.policy,
    reason: decision.reason,
    userVisible: decision.userVisible
  };

  database
    .prepare(
      `INSERT OR REPLACE INTO sync_conflicts
       (id, command_id, entity_type, entity_id, policy, reason, user_visible, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      conflict.id,
      conflict.commandId,
      conflict.entityType,
      conflict.entityId ?? null,
      conflict.policy,
      conflict.reason,
      conflict.userVisible ? 1 : 0,
      now
    );

  return conflict;
}

function applyAcceptedOfflineCommand(
  database: DatabaseSync,
  seed: BasecampSeed,
  command: OfflineCommand,
  now: string
): void {
  const intent = command.intent;

  if (intent.type === "inventory.adjust_quantity" && intent.quantityDelta > 0) {
    recordQuickInventoryEntry(
      database,
      {
        itemName: intent.itemName ?? intent.itemId ?? "Unknown inventory",
        quantity: intent.quantityDelta,
        locationName: intent.locationName ?? "Unassigned",
        ...(intent.unit === undefined ? {} : { unit: intent.unit }),
        ...(intent.expiresAt === undefined ? {} : { expiresAt: intent.expiresAt }),
        ...(intent.notes === undefined ? {} : { notes: intent.notes })
      },
      now
    );
    return;
  }

  if (intent.type === "maintenance.complete" && intent.policyId !== undefined) {
    recordMaintenanceCompletion(database, intent.policyId, {
      now,
      outcome: intent.outcome,
      ...(intent.notes === undefined ? {} : { notes: intent.notes })
    });
    return;
  }

  if (intent.type === "quest.set_status" && intent.questId !== undefined) {
    applyPersistedQuestAction(database, seed, intent.questId, intent.action, {
      now,
      ...(intent.notes === undefined ? {} : { reason: intent.notes })
    });
    return;
  }

  if (intent.type === "asset.report_issue") {
    saveInventoryEvent(database, {
      id: `inventory-event-${slugify(command.commandId)}`,
      eventType: "fail",
      assetId: intent.assetId,
      stateAfter: "failed",
      notes: intent.issue,
      occurredAt: now
    });
    return;
  }

  if (intent.type === "asset.inspect" || intent.type === "asset.maintain") {
    saveInventoryEvent(database, {
      id: `inventory-event-${slugify(command.commandId)}`,
      eventType: "inspect",
      assetId: intent.assetId,
      stateAfter: "maintained",
      ...(intent.notes === undefined ? {} : { notes: intent.notes }),
      occurredAt: now
    });
  }
}

function currentEntityVersionFor(database: DatabaseSync, command: OfflineCommand): number | undefined {
  if (command.entityId === undefined) {
    return undefined;
  }

  if (command.entityType === "quest") {
    return countRows(database, "quest_events");
  }

  if (command.entityType === "inventory" || command.entityType === "asset") {
    return countRows(database, "inventory_events");
  }

  if (command.entityType === "maintenance") {
    return countRows(database, "maintenance_events");
  }

  return undefined;
}

function latestSyncCursor(database: DatabaseSync): string {
  const row = database
    .prepare("SELECT COALESCE(MAX(server_sequence), 0) as sequence FROM sync_commands")
    .get() as { sequence: number };

  return syncCursor(row.sequence);
}

function syncCursor(sequence: number): string {
  return `sync:${sequence}`;
}

function rowToSyncConflict(row: unknown): SyncConflict {
  const value = row as {
    id: string;
    command_id: string;
    entity_type: SyncConflict["entityType"];
    entity_id: string | null;
    policy: SyncConflict["policy"];
    reason: string;
    user_visible: number;
  };

  return {
    id: value.id,
    commandId: value.command_id,
    entityType: value.entity_type,
    ...(value.entity_id === null ? {} : { entityId: value.entity_id }),
    policy: value.policy,
    reason: value.reason,
    userVisible: value.user_visible === 1
  };
}

function syncStoredLocationMaturity(
  database: DatabaseSync,
  locationId: string,
  now: string
): void {
  const inventory = readInventoryState(database, now);
  const progression = inventory.locationProgression.find((location) => location.locationId === locationId);

  if (progression === undefined) {
    return;
  }

  database
    .prepare("UPDATE locations SET maturity = ?, updated_at = ? WHERE id = ?")
    .run(progression.maturity, now, locationId);
}

function calculatePolicySeedDueDate(
  fromIso: string,
  intervalCount: number,
  intervalUnit: MaintenanceRecurrenceUnit
): string {
  return calculateNextMaintenanceDue(
    {
      id: "maintenance-policy-seed",
      name: "Maintenance seed",
      scopeType: "category",
      intervalCount,
      intervalUnit,
      active: true
    },
    fromIso
  );
}

function maintenanceScopeLabel(
  policy: MaintenancePolicy,
  state: Pick<InventoryPersistenceState, "locations" | "items" | "assets">
): string {
  if (policy.assetId !== undefined) {
    return state.assets.find((asset) => asset.id === policy.assetId)?.name ?? policy.assetId;
  }

  if (policy.itemId !== undefined) {
    return state.items.find((item) => item.id === policy.itemId)?.name ?? policy.itemId;
  }

  if (policy.locationId !== undefined) {
    return state.locations.find((location) => location.id === policy.locationId)?.name ?? policy.locationId;
  }

  return policy.categoryId ?? policy.scopeType;
}

function policyAppliesToLocation(
  policy: MaintenancePolicy,
  locationId: string,
  state: Pick<InventoryPersistenceState, "items" | "lots" | "assets" | "kits">
): boolean {
  if (policy.locationId !== undefined) {
    return policy.locationId === locationId;
  }

  if (policy.assetId !== undefined) {
    return state.assets.some((asset) => asset.id === policy.assetId && asset.locationId === locationId);
  }

  if (policy.itemId !== undefined) {
    return state.lots.some((lot) => lot.itemId === policy.itemId && lot.locationId === locationId);
  }

  if (policy.categoryId !== undefined) {
    const itemIds = new Set(
      state.items.filter((item) => item.categoryId === policy.categoryId).map((item) => item.id)
    );

    return (
      state.lots.some((lot) => lot.locationId === locationId && itemIds.has(lot.itemId)) ||
      state.assets.some((asset) => asset.locationId === locationId && asset.categoryId === policy.categoryId) ||
      state.kits.some((kit) => kit.locationId === locationId && kit.categoryId === policy.categoryId)
    );
  }

  return false;
}

function inferInventoryType(name: string): InventoryItemType {
  const normalized = name.toLowerCase();

  if (normalized.includes("water")) {
    return "water_storage";
  }

  if (normalized.includes("fuel") || normalized.includes("gas")) {
    return "fuel";
  }

  if (normalized.includes("radio")) {
    return "communications_asset";
  }

  if (normalized.includes("generator") || normalized.includes("battery")) {
    return "power_asset";
  }

  if (normalized.includes("kit") || normalized.includes("bag")) {
    return "kit";
  }

  if (normalized.includes("document")) {
    return "document";
  }

  if (normalized.includes("food")) {
    return "food_storage";
  }

  return "consumable_supply";
}

function capabilityStateForInventoryState(state: InventoryState): InventoryItem["capabilityState"] {
  return {
    owned: [
      "owned",
      "located",
      "installed",
      "configured",
      "tested",
      "validated",
      "in_service",
      "maintenance_due",
      "maintained"
    ].includes(state),
    configured: ["configured", "tested", "validated", "in_service", "maintenance_due", "maintained"].includes(state),
    tested: ["tested", "validated", "in_service", "maintenance_due", "maintained"].includes(state),
    validated: ["validated", "in_service", "maintained"].includes(state),
    maintained: state === "maintained" || state === "in_service"
  };
}

function rowToLocation(row: unknown): Location {
  const value = row as {
    id: string;
    name: string;
    kind: LocationKind;
    maturity: LocationMaturity;
    notes: string | null;
  };

  return {
    id: value.id,
    name: value.name,
    kind: value.kind,
    maturity: value.maturity,
    ...(value.notes === null ? {} : { notes: value.notes })
  };
}

function rowToLocationReadiness(row: unknown): LocationReadiness {
  const value = row as {
    location_id: string;
    category_id: CategoryId;
    score: number;
    status: LocationReadiness["status"];
    source_capability_outpost_id: string | null;
    validated_at: string | null;
  };

  return {
    locationId: value.location_id,
    categoryId: value.category_id,
    score: value.score,
    status: value.status,
    ...(value.source_capability_outpost_id === null
      ? {}
      : { sourceCapabilityOutpostId: value.source_capability_outpost_id }),
    ...(value.validated_at === null ? {} : { validatedAt: value.validated_at })
  };
}

function rowToInventoryItem(row: unknown): InventoryItem {
  const value = row as {
    id: string;
    name: string;
    type: InventoryItemType;
    category_id: CategoryId | null;
    state: InventoryState;
    functional_requirement: string | null;
    unit: string | null;
    capability_state_json: string;
  };

  return {
    id: value.id,
    name: value.name,
    type: value.type,
    ...(value.category_id === null ? {} : { categoryId: value.category_id }),
    state: value.state,
    ...(value.functional_requirement === null
      ? {}
      : { functionalRequirement: value.functional_requirement }),
    ...(value.unit === null ? {} : { unit: value.unit }),
    capabilityState: JSON.parse(value.capability_state_json) as InventoryItem["capabilityState"]
  };
}

function rowToInventoryLot(row: unknown): InventoryLot {
  const value = row as {
    id: string;
    item_id: string;
    location_id: string;
    quantity: number;
    unit: string;
    state: InventoryState;
    expires_at: string | null;
    acquired_at: string | null;
    notes: string | null;
  };

  return {
    id: value.id,
    itemId: value.item_id,
    locationId: value.location_id,
    quantity: value.quantity,
    unit: value.unit,
    state: value.state,
    ...(value.expires_at === null ? {} : { expiresAt: value.expires_at }),
    ...(value.acquired_at === null ? {} : { acquiredAt: value.acquired_at }),
    ...(value.notes === null ? {} : { notes: value.notes })
  };
}

function rowToAsset(row: unknown): Asset {
  const value = row as {
    id: string;
    item_id: string | null;
    name: string;
    type: InventoryItemType;
    category_id: CategoryId | null;
    location_id: string | null;
    state: InventoryState;
    serial_number: string | null;
    notes: string | null;
  };

  return {
    id: value.id,
    name: value.name,
    type: value.type,
    state: value.state,
    ...(value.location_id === null ? {} : { locationId: value.location_id }),
    ...(value.item_id === null ? {} : { itemId: value.item_id }),
    ...(value.category_id === null ? {} : { categoryId: value.category_id }),
    ...(value.serial_number === null ? {} : { serialNumber: value.serial_number }),
    ...(value.notes === null ? {} : { notes: value.notes })
  };
}

function rowToAssetTag(row: unknown): AssetTag {
  const value = row as {
    id: string;
    asset_id: string;
    tag_code: string;
    qr_payload: string;
    lookup_path: string;
    print_label: string;
    created_at: string;
  };

  return {
    id: value.id,
    assetId: value.asset_id,
    tagCode: value.tag_code,
    qrPayload: value.qr_payload,
    lookupPath: value.lookup_path,
    printLabel: value.print_label,
    createdAt: value.created_at
  };
}

function rowToKit(row: unknown): Kit {
  const value = row as {
    id: string;
    name: string;
    location_id: string | null;
    category_id: CategoryId | null;
    state: InventoryState;
    notes: string | null;
  };

  return {
    id: value.id,
    name: value.name,
    ...(value.location_id === null ? {} : { locationId: value.location_id }),
    ...(value.category_id === null ? {} : { categoryId: value.category_id }),
    state: value.state,
    ...(value.notes === null ? {} : { notes: value.notes })
  };
}

function rowToKitItem(row: unknown): KitItem {
  const value = row as {
    id: string;
    kit_id: string;
    item_id: string;
    required_quantity: number;
    present_quantity: number;
    required: number;
    state: InventoryState;
    notes: string | null;
  };

  return {
    id: value.id,
    kitId: value.kit_id,
    itemId: value.item_id,
    requiredQuantity: value.required_quantity,
    presentQuantity: value.present_quantity,
    required: value.required === 1,
    state: value.state,
    ...(value.notes === null ? {} : { notes: value.notes })
  };
}

function rowToInventoryEvent(row: unknown): InventoryEvent {
  const value = row as {
    id: string;
    event_type: InventoryEvent["eventType"];
    item_id: string | null;
    asset_id: string | null;
    lot_id: string | null;
    from_location_id: string | null;
    to_location_id: string | null;
    quantity_delta: number | null;
    unit: string | null;
    state_after: InventoryState | null;
    notes: string | null;
    occurred_at: string;
  };

  return {
    id: value.id,
    eventType: value.event_type,
    ...(value.item_id === null ? {} : { itemId: value.item_id }),
    ...(value.asset_id === null ? {} : { assetId: value.asset_id }),
    ...(value.lot_id === null ? {} : { lotId: value.lot_id }),
    ...(value.from_location_id === null ? {} : { fromLocationId: value.from_location_id }),
    ...(value.to_location_id === null ? {} : { toLocationId: value.to_location_id }),
    ...(value.quantity_delta === null ? {} : { quantityDelta: value.quantity_delta }),
    ...(value.unit === null ? {} : { unit: value.unit }),
    ...(value.state_after === null ? {} : { stateAfter: value.state_after }),
    ...(value.notes === null ? {} : { notes: value.notes }),
    occurredAt: value.occurred_at
  };
}

function rowToMaintenancePolicy(row: unknown): MaintenancePolicy {
  const value = row as {
    id: string;
    name: string;
    scope_type: MaintenancePolicy["scopeType"];
    asset_id: string | null;
    item_id: string | null;
    location_id: string | null;
    category_id: CategoryId | null;
    interval_count: number;
    interval_unit: MaintenanceRecurrenceUnit;
    active: number;
    last_completed_at: string | null;
    next_due_at: string | null;
    instructions: string | null;
  };

  return {
    id: value.id,
    name: value.name,
    scopeType: value.scope_type,
    intervalCount: value.interval_count,
    intervalUnit: value.interval_unit,
    active: value.active === 1,
    ...(value.asset_id === null ? {} : { assetId: value.asset_id }),
    ...(value.item_id === null ? {} : { itemId: value.item_id }),
    ...(value.location_id === null ? {} : { locationId: value.location_id }),
    ...(value.category_id === null ? {} : { categoryId: value.category_id }),
    ...(value.last_completed_at === null ? {} : { lastCompletedAt: value.last_completed_at }),
    ...(value.next_due_at === null ? {} : { nextDueAt: value.next_due_at }),
    ...(value.instructions === null ? {} : { instructions: value.instructions })
  };
}

function rowToMaintenanceEvent(row: unknown): MaintenanceEvent {
  const value = row as {
    id: string;
    policy_id: string;
    event_type: MaintenanceEvent["eventType"];
    outcome: MaintenanceEvent["outcome"];
    occurred_at: string;
    next_due_at: string | null;
    notes: string | null;
    follow_up_quest_title: string | null;
  };

  return {
    id: value.id,
    policyId: value.policy_id,
    eventType: value.event_type,
    outcome: value.outcome,
    occurredAt: value.occurred_at,
    ...(value.next_due_at === null ? {} : { nextDueAt: value.next_due_at }),
    ...(value.notes === null ? {} : { notes: value.notes }),
    ...(value.follow_up_quest_title === null
      ? {}
      : { followUpQuestTitle: value.follow_up_quest_title })
  };
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
