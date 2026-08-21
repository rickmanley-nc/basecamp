import {
  createDashboardSummary,
  createSeedContentResponse,
  type CategoryPursuitUpdateRequest,
  type HealthResponse,
  type QuestActionRequest
} from "@basecamp/api";
import { basecampSeed, seedValidation } from "@basecamp/content";
import {
  applyMigrations,
  applyPersistedQuestAction,
  createDatabase,
  importSeed,
  readHouseholdProgress,
  recordXpEvent,
  setCategoryPursuit
} from "@basecamp/database";
import { questActions, type PursuitState } from "@basecamp/domain";
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
    version: "0.3.0-m2",
    checkedAt: new Date().toISOString()
  }));

  server.get("/api/seed", async () => ({
    ...createSeedContentResponse(basecampSeed),
    validation: seedValidation
  }));

  server.get("/api/dashboard", async () =>
    createDashboardSummary(basecampSeed, readHouseholdProgress(database))
  );

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
