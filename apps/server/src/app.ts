import { createDashboardSummary, createSeedContentResponse, type HealthResponse } from "@basecamp/api";
import { basecampSeed, seedValidation } from "@basecamp/content";
import Fastify, { type FastifyInstance } from "fastify";

export interface BuildServerOptions {
  logger?: boolean;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: options.logger ?? false
  });

  server.get("/health", async (): Promise<HealthResponse> => ({
    ok: true,
    service: "basecamp-server",
    version: "0.2.0-m1",
    checkedAt: new Date().toISOString()
  }));

  server.get("/api/seed", async () => ({
    ...createSeedContentResponse(basecampSeed),
    validation: seedValidation
  }));

  server.get("/api/dashboard", async () => createDashboardSummary(basecampSeed));

  return server;
}
