import {
  createAssetTagQrSvg,
  createDashboardSummary,
  createInventoryDashboardSummary,
  createSeedContentResponse,
  type AssetTagResponse,
  type AdminAuditEventSummary,
  type CategoryPursuitUpdateRequest,
  type DrillRunRequest,
  type DrillRunResponse,
  type DrillTemplatesResponse,
  type EvidenceRecordRequest,
  type EvidenceRecordResponse,
  type HealthResponse,
  type MaintenanceCompletionRequest,
  type MaintenancePolicyRequest,
  type OperationalStatusResponse,
  type QuickInventoryEntryRequest,
  type QuestActionRequest,
  type SkillTrainingRequest,
  type SkillTrainingResponse
} from "@basecamp/api";
import { basecampSeed, seedValidation } from "@basecamp/content";
import {
  applyMigrations,
  applyPersistedQuestAction,
  buildOperationalStatus,
  createBasecampAssetTag,
  createDatabase,
  createPortableExport,
  importSeed,
  importPortableExport,
  listAuditEvents,
  listDrillTemplates,
  readAssetWithTags,
  readHouseholdProgress,
  readInventoryState,
  recordAuditEvent,
  recordXpEvent,
  applySyncCommandBatch,
  recordDrillRun,
  recordMaintenanceCompletion,
  recordQuickInventoryEntry,
  recordSkillTraining,
  setCategoryPursuit,
  upsertEvidenceRecord,
  upsertMaintenancePolicy
} from "@basecamp/database";
import { questActions, type InventoryItemType, type PursuitState } from "@basecamp/domain";
import { createXpEventForQuest } from "@basecamp/gamification";
import type { PortableExportArchive } from "@basecamp/database";
import type { SyncBatchRequest } from "@basecamp/sync";
import Fastify, { type FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";

export interface BuildServerOptions {
  adminToken?: string;
  appVersion?: string;
  backupDir?: string;
  closeDatabaseOnClose?: boolean;
  database?: DatabaseSync;
  databasePath?: string;
  logger?: boolean;
  remoteAccessMode?: "lan" | "vpn" | "reverse_proxy" | "unknown";
  storageDir?: string;
  webUrl?: string;
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
  const appVersion = options.appVersion ?? process.env.BASECAMP_APP_VERSION ?? "0.7.0-m6";
  const adminToken = options.adminToken ?? process.env.BASECAMP_ADMIN_TOKEN;
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
    version: appVersion,
    checkedAt: new Date().toISOString()
  }));

  server.get("/health/live", async () => ({
    ok: true,
    service: "basecamp-server",
    checkedAt: new Date().toISOString()
  }));

  server.get("/health/ready", async (request, reply) => {
    const status = operationalStatus(database, options, appVersion, adminToken);

    if (!status.database.ok || !status.storage.ok) {
      return reply.code(503).send(status);
    }

    return status;
  });

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

  server.get("/api/reports/gaps", async () =>
    createDashboardSummary(
      basecampSeed,
      readHouseholdProgress(database),
      readInventoryState(database)
    ).gapReport
  );

  server.get("/api/admin/status", async (request, reply): Promise<OperationalStatusResponse | unknown> => {
    if (!isAdminAuthorized(request.headers, adminToken)) {
      recordAdminAudit(database, "admin.status", "failure");
      return reply.code(adminToken === undefined ? 503 : 401).send({
        error: adminToken === undefined ? "Admin token is not configured." : "Admin authorization failed."
      });
    }

    recordAdminAudit(database, "admin.status", "success");
    return operationalStatus(database, options, appVersion, adminToken);
  });

  server.get("/api/admin/export", async (request, reply) => {
    if (!isAdminAuthorized(request.headers, adminToken)) {
      recordAdminAudit(database, "export.create", "failure");
      return reply.code(adminToken === undefined ? 503 : 401).send({
        error: adminToken === undefined ? "Admin token is not configured." : "Admin authorization failed."
      });
    }

    const archive = createPortableExport(database, {
      appVersion,
      contentSchemaVersion: basecampSeed.schemaVersion
    });

    recordAdminAudit(database, "export.create", "success", {
      tableCounts: archive.manifest.tableCounts
    });

    return archive;
  });

  server.post<{
    Body: PortableExportArchive;
  }>("/api/admin/import", async (request, reply) => {
    if (!isAdminAuthorized(request.headers, adminToken)) {
      recordAdminAudit(database, "import.apply", "failure");
      return reply.code(adminToken === undefined ? 503 : 401).send({
        error: adminToken === undefined ? "Admin token is not configured." : "Admin authorization failed."
      });
    }

    try {
      const result = importPortableExport(database, request.body, {
        expectedContentSchemaVersion: basecampSeed.schemaVersion
      });

      recordAdminAudit(database, "import.apply", "success", {
        tableCounts: result.tableCounts
      });

      return result;
    } catch (error) {
      recordAdminAudit(database, "import.apply", "failure", {
        message: error instanceof Error ? error.message : "Import failed."
      });

      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Import failed."
      });
    }
  });

  server.get("/api/admin/audit", async (request, reply): Promise<{ events: AdminAuditEventSummary[] } | unknown> => {
    if (!isAdminAuthorized(request.headers, adminToken)) {
      recordAdminAudit(database, "audit.list", "failure");
      return reply.code(adminToken === undefined ? 503 : 401).send({
        error: adminToken === undefined ? "Admin token is not configured." : "Admin authorization failed."
      });
    }

    recordAdminAudit(database, "audit.list", "success");

    return {
      events: listAuditEvents(database).map((event) => ({
        id: event.id,
        action: event.action,
        actor: event.actor,
        result: event.result,
        occurredAt: event.occurredAt
      }))
    };
  });

  server.get("/api/drills/templates", async (): Promise<DrillTemplatesResponse> => ({
    templates: listDrillTemplates(database)
  }));

  server.post<{
    Params: { templateId: string };
    Body: DrillRunRequest;
  }>("/api/drills/:templateId/runs", async (request, reply): Promise<DrillRunResponse | unknown> => {
    if (request.body.completedAt.trim().length === 0) {
      return reply.code(400).send({ error: "Drill completion time is required." });
    }

    if (!Array.isArray(request.body.criteriaResults)) {
      return reply.code(400).send({ error: "Drill criteria results are required." });
    }

    try {
      const result = recordDrillRun(database, request.params.templateId, {
        completedAt: request.body.completedAt,
        criteriaResults: request.body.criteriaResults,
        ...(request.body.startedAt === undefined ? {} : { startedAt: request.body.startedAt }),
        ...(request.body.lessons === undefined ? {} : { lessons: request.body.lessons }),
        ...(request.body.evidenceIds === undefined ? {} : { evidenceIds: request.body.evidenceIds })
      });

      return {
        run: result.run,
        dashboard: createDashboardSummary(basecampSeed, result.progress, readInventoryState(database))
      };
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : "Drill run failed."
      });
    }
  });

  server.post<{
    Body: EvidenceRecordRequest;
  }>("/api/evidence", async (request, reply): Promise<EvidenceRecordResponse | unknown> => {
    if (request.body.title.trim().length === 0) {
      return reply.code(400).send({ error: "Evidence title is required." });
    }

    if (!Array.isArray(request.body.links) || request.body.links.length === 0) {
      return reply.code(400).send({ error: "Evidence must link to at least one entity." });
    }

    if (
      request.body.metadata === undefined ||
      typeof request.body.metadata.capturedAt !== "string" ||
      request.body.metadata.capturedAt.trim().length === 0
    ) {
      return reply.code(400).send({ error: "Evidence capture time is required." });
    }

    const evidence = upsertEvidenceRecord(database, {
      kind: request.body.kind,
      title: request.body.title,
      links: request.body.links,
      metadata: request.body.metadata,
      ...(request.body.id === undefined ? {} : { id: request.body.id })
    });

    return { evidence };
  });

  server.post<{
    Body: SkillTrainingRequest;
  }>("/api/skills/training", async (request, reply): Promise<SkillTrainingResponse | unknown> => {
    if (request.body.skillId.trim().length === 0) {
      return reply.code(400).send({ error: "Skill ID is required." });
    }

    if (request.body.courseName.trim().length === 0) {
      return reply.code(400).send({ error: "Course name is required." });
    }

    if (request.body.completedAt.trim().length === 0) {
      return reply.code(400).send({ error: "Training completion time is required." });
    }

    if (
      request.body.categoryId !== undefined &&
      !basecampSeed.categories.some((category) => category.id === request.body.categoryId)
    ) {
      return reply.code(400).send({ error: "Unknown category." });
    }

    const result = recordSkillTraining(database, {
      skillId: request.body.skillId,
      courseName: request.body.courseName,
      completedAt: request.body.completedAt,
      ...(request.body.name === undefined ? {} : { name: request.body.name }),
      ...(request.body.categoryId === undefined ? {} : { categoryId: request.body.categoryId }),
      ...(request.body.provider === undefined ? {} : { provider: request.body.provider }),
      ...(request.body.expiresAt === undefined ? {} : { expiresAt: request.body.expiresAt }),
      ...(request.body.evidenceIds === undefined ? {} : { evidenceIds: request.body.evidenceIds }),
      ...(request.body.notes === undefined ? {} : { notes: request.body.notes }),
      ...(request.body.stateAwarded === undefined ? {} : { stateAwarded: request.body.stateAwarded })
    });

    return {
      skill: {
        skillId: result.skill.skillId,
        ...(result.skill.name === undefined ? {} : { name: result.skill.name }),
        ...(result.skill.categoryId === undefined ? {} : { categoryId: result.skill.categoryId }),
        state: result.skill.state,
        ...(result.skill.expiresAt === undefined ? {} : { expiresAt: result.skill.expiresAt })
      },
      trainingRecord: result.trainingRecord,
      dashboard: createDashboardSummary(basecampSeed, result.progress, readInventoryState(database))
    };
  });

  server.post<{
    Body: SyncBatchRequest;
  }>("/api/sync", async (request, reply) => {
    if (!Array.isArray(request.body.commands)) {
      return reply.code(400).send({ error: "Sync commands must be an array." });
    }

    try {
      return applySyncCommandBatch(database, basecampSeed, request.body);
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Sync failed."
      });
    }
  });

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

function operationalStatus(
  database: DatabaseSync,
  options: BuildServerOptions,
  appVersion: string,
  adminToken: string | undefined
): OperationalStatusResponse {
  const statusOptions: Parameters<typeof buildOperationalStatus>[1] = {
    version: appVersion,
    adminTokenConfigured: adminToken !== undefined && adminToken.trim().length > 0,
    remoteAccessMode: options.remoteAccessMode ?? remoteAccessModeFromEnv(process.env.BASECAMP_REMOTE_ACCESS)
  };
  const databasePath = options.databasePath ?? process.env.BASECAMP_DB_PATH;
  const storageDir = options.storageDir ?? process.env.BASECAMP_STORAGE_DIR;
  const backupDir = options.backupDir ?? process.env.BASECAMP_BACKUP_DIR;
  const webUrl = options.webUrl ?? process.env.BASECAMP_WEB_URL ?? process.env.BASECAMP_PUBLIC_URL;

  if (databasePath !== undefined) {
    statusOptions.databasePath = databasePath;
  }

  if (storageDir !== undefined) {
    statusOptions.storageDir = storageDir;
  }

  if (backupDir !== undefined) {
    statusOptions.backupDir = backupDir;
  }

  if (webUrl !== undefined) {
    statusOptions.webUrl = webUrl;
  }

  return buildOperationalStatus(database, statusOptions);
}

function isAdminAuthorized(
  headers: Record<string, string | string[] | undefined>,
  adminToken: string | undefined
): boolean {
  if (adminToken === undefined || adminToken.trim().length === 0) {
    return false;
  }

  const headerToken = firstHeader(headers["x-basecamp-admin-token"]);
  const authorization = firstHeader(headers.authorization);
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;

  return headerToken === adminToken || bearerToken === adminToken;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function recordAdminAudit(
  database: DatabaseSync,
  action: string,
  result: "success" | "failure",
  metadata: Record<string, unknown> = {}
): void {
  recordAuditEvent(database, {
    action,
    actor: "admin-token",
    result,
    metadata
  });
}

function remoteAccessModeFromEnv(value: string | undefined): NonNullable<BuildServerOptions["remoteAccessMode"]> {
  if (value === "lan" || value === "vpn" || value === "reverse_proxy") {
    return value;
  }

  return "unknown";
}
