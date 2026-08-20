import { createDashboardSummary } from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import { buildServer } from "@basecamp/server";
import { describe, expect, it } from "vitest";

describe("server routes", () => {
  it("serves health, seed, and dashboard responses", async () => {
    const server = buildServer();

    const health = await server.inject("/health");
    const seed = await server.inject("/api/seed");
    const dashboard = await server.inject("/api/dashboard");

    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, service: "basecamp-server" });
    expect(seed.statusCode).toBe(200);
    expect(seed.json().counts.categories).toBe(basecampSeed.categories.length);
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json()).toMatchObject(createDashboardSummary(basecampSeed));

    await server.close();
  });
});
