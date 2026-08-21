import {
  createAssetTagQrSvg,
  createDashboardSummary,
  createInventoryDashboardSummary,
  createSeedContentResponse,
  type AssetTagResponse,
  type CategoryPursuitUpdateRequest,
  type HealthResponse,
  type MaintenanceCompletionRequest,
  type MaintenancePolicyRequest,
  type QuickInventoryEntryRequest,
  type QuestActionRequest
} from "@basecamp/api";
import { basecampSeed, seedValidation } from "@basecamp/content";
import {
  applyMigrations,
  applyPersistedQuestAction,
  createBasecampAssetTag,
  createDatabase,
  importSeed,
  readAssetWithTags,
  readHouseholdProgress,
  readInventoryState,
  recordXpEvent,
  recordMaintenanceCompletion,
  recordQuickInventoryEntry,
  setCategoryPursuit,
  upsertMaintenancePolicy
} from "@basecamp/database";
import { questActions, type InventoryItemType, type PursuitState } from "@basecamp/domain";
import { createXpEventForQuest } from "@basecamp/gamification";
import Fastify, { type FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";

export interface BuildServerOptions {
  closeDatabaseOnClose?: boolean;
  database?: DatabaseSync;
  logger?: boolean;
}

const pursuitStates = new Set<PursuitState>([
  "active",
  "interested",
  "later",
  "paused",
  "not_currently_pursuing"
]);

const inventoryItemTypes = new Set<InventoryItemType>([
  "consumable_supply",
  "durable_equipment",
  "tool",
  "machinery",
  "medical_item",
  "power_asset",
  "communications_asset",
  "container",
  "kit",
  "document",
  "fuel",
  "water_storage",
  "food_storage",
  "spare_part"
]);

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const database = options.database ?? createDatabase();
  const ownsDatabase = options.database === undefined || options.closeDatabaseOnClose === true;
  const server = Fastify({
    logger: options.logger ?? false
  });

  applyMigrations(database);
  importSeed(database, basecampSeed);

  server.addHook("onClose", async () => {
    if (ownsDatabase) {
      database.close();
    }
  });

  server.get("/health", async (): Promise<HealthResponse> => ({
    ok: true,
    service: "basecamp-server",
    version: "0.4.0-m3",
    checkedAt: new Date().toISOString()
  }));

  server.get("/api/seed", async () => ({
    ...createSeedContentResponse(basecampSeed),
    validation: seedValidation
  }));

  server.get("/api/dashboard", async () =>
    createDashboardSummary(
      basecampSeed,
      readHouseholdProgress(database),
      readInventoryState(database)
    )
  );

  server.get("/api/inventory", async () =>
    createInventoryDashboardSummary(
      basecampSeed,
      readHouseholdProgress(database),
      readInventoryState(database)
    )
  );

  server.post<{
    Body: QuickInventoryEntryRequest;
  }>("/api/inventory/quick-entry", async (request, reply) => {
    const validationError = validateQuickInventoryEntry(request.body);

    if (validationError !== undefined) {
      return reply.code(400).send({ error: validationError });
    }

    if (
      request.body.categoryId !== undefined &&
      !basecampSeed.categories.some((category) => category.id === request.body.categoryId)
    ) {
      return reply.code(400).send({ error: "Unknown category." });
    }

    const result = recordQuickInventoryEntry(database, {
      itemName: request.body.itemName,
      quantity: request.body.quantity,
      locationName: request.body.locationName,
      ...(request.body.unit === undefined ? {} : { unit: request.body.unit }),
      ...(request.body.categoryId === undefined ? {} : { categoryId: request.body.categoryId }),
      ...(request.body.type === undefined ? {} : { type: request.body.type }),
      ...(request.body.expiresAt === undefined ? {} : { expiresAt: request.body.expiresAt }),
      ...(request.body.notes === undefined ? {} : { notes: request.body.notes })
    });

    return {
      item: result.item,
      lot: result.lot,
      location: result.location,
      event: result.event,
      dashboard: createDashboardSummary(basecampSeed, readHouseholdProgress(database), result.inventory)
    };
  });

  server.get<{
    Params: { assetId: string };
  }>("/api/assets/:assetId", async (request, reply) => {
    const result = readAssetWithTags(database, request.params.assetId);

    if (result === undefined) {
      return reply.code(404).send({ error: "Unknown asset." });
    }

    return result;
  });

  server.post<{
    Params: { assetId: string };
    Body?: { baseUrl?: string };
  }>("/api/assets/:assetId/tags", async (request, reply): Promise<AssetTagResponse | unknown> => {
    try {
      const tag = createBasecampAssetTag(
        database,
        request.params.assetId,
        new Date().toISOString(),
        request.body?.baseUrl ?? publicBaseUrl(request.headers.host)
      );
      const lookup = readAssetWithTags(database, request.params.assetId);

      if (lookup === undefined) {
        return reply.code(404).send({ error: "Unknown asset." });
      }

      return {
        ...tag,
        qrSvg: await createAssetTagQrSvg(tag.qrPayload),
        asset: {
          id: lookup.asset.id,
          name: lookup.asset.name,
          type: lookup.asset.type,
          state: lookup.asset.state,
          ...(lookup.asset.locationId === undefined ? {} : { locationId: lookup.asset.locationId }),
          tagCount: lookup.tags.length
        }
      };
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : "Asset tag generation failed."
      });
    }
  });

  server.post<{
    Body: MaintenancePolicyRequest;
  }>("/api/maintenance/policies", async (request, reply) => {
    if (request.body.name.trim().length === 0) {
      return reply.code(400).send({ error: "Maintenance policy name is required." });
    }

    if (request.body.intervalCount < 1) {
      return reply.code(400).send({ error: "Maintenance interval must be at least one." });
    }

    const policy = upsertMaintenancePolicy(database, {
      name: request.body.name,
      scopeType: request.body.scopeType,
      intervalCount: request.body.intervalCount,
      intervalUnit: request.body.intervalUnit,
      ...(request.body.assetId === undefined ? {} : { assetId: request.body.assetId }),
      ...(request.body.itemId === undefined ? {} : { itemId: request.body.itemId }),
      ...(request.body.locationId === undefined ? {} : { locationId: request.body.locationId }),
      ...(request.body.categoryId === undefined ? {} : { categoryId: request.body.categoryId }),
      ...(request.body.nextDueAt === undefined ? {} : { nextDueAt: request.body.nextDueAt }),
      ...(request.body.instructions === undefined ? {} : { instructions: request.body.instructions })
    });

    return {
      policy,
      dashboard: createDashboardSummary(
        basecampSeed,
        readHouseholdProgress(database),
        readInventoryState(database)
      )
    };
  });

  server.post<{
    Params: { policyId: string };
    Body: MaintenanceCompletionRequest;
  }>("/api/maintenance/:policyId/completions", async (request, reply) => {
    try {
      const result = recordMaintenanceCompletion(database, request.params.policyId, {
        ...(request.body.outcome === undefined ? {} : { outcome: request.body.outcome }),
        ...(request.body.notes === undefined ? {} : { notes: request.body.notes })
      });

      return {
        policy: result.policy,
        event: result.event,
        dashboard: createDashboardSummary(basecampSeed, readHouseholdProgress(database), result.inventory)
      };
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : "Maintenance completion failed."
      });
    }
  });

  server.patch<{
    Params: { categoryId: string };
    Body: CategoryPursuitUpdateRequest;
  }>("/api/categories/:categoryId/pursuit", async (request, reply) => {
    const category = basecampSeed.categories.find(
      (candidate) => candidate.id === request.params.categoryId
    );

    if (category === undefined) {
      return reply.code(404).send({ error: "Unknown category." });
    }

    if (!pursuitStates.has(request.body.pursuitState)) {
      return reply.code(400).send({ error: "Invalid pursuit state." });
    }

    const progress = setCategoryPursuit(
      database,
      category.id,
      request.body.pursuitState
    );

    return createDashboardSummary(basecampSeed, progress);
  });

  server.post<{
    Params: { questId: string };
    Body: QuestActionRequest;
  }>("/api/quests/:questId/actions", async (request, reply) => {
    const quest = basecampSeed.quests.find((candidate) => candidate.id === request.params.questId);

    if (quest === undefined) {
      return reply.code(404).send({ error: "Unknown quest." });
    }

    if (!questActions.includes(request.body.action)) {
      return reply.code(400).send({ error: "Invalid quest action." });
    }

    try {
      const result = applyPersistedQuestAction(
        database,
        basecampSeed,
        quest.id,
        request.body.action,
        request.body.reason === undefined ? {} : { reason: request.body.reason }
      );
      const progress =
        request.body.action === "complete"
          ? recordXpEvent(
              database,
              createXpEventForQuest(quest, result.event.reason, result.event.occurredAt)
            )
          : result.progress;

      return {
        instance: result.instance,
        event: result.event,
        dashboard: createDashboardSummary(basecampSeed, progress)
      };
    } catch (error) {
      return reply.code(409).send({
        error: error instanceof Error ? error.message : "Quest action failed."
      });
    }
  });

  return server;
}

function validateQuickInventoryEntry(body: QuickInventoryEntryRequest): string | undefined {
  if (body.itemName.trim().length === 0) {
    return "Item name is required.";
  }

  if (body.locationName.trim().length === 0) {
    return "Location name is required.";
  }

  if (!Number.isFinite(body.quantity) || body.quantity <= 0) {
    return "Quantity must be greater than zero.";
  }

  if (body.type !== undefined && !inventoryItemTypes.has(body.type)) {
    return "Invalid inventory item type.";
  }

  return undefined;
}

function publicBaseUrl(host: string | undefined): string {
  const configured = process.env.BASECAMP_PUBLIC_URL;

  if (configured !== undefined && configured.trim().length > 0) {
    return configured;
  }

  return `http://${host ?? "127.0.0.1:4317"}`;
}
