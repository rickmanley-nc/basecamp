import { createDashboardSummary } from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import { buildServer } from "@basecamp/server";
import { describe, expect, it } from "vitest";

describe("server routes", () => {
  it("serves health, seed, dashboard, and M2 mutation responses", async () => {
    const server = buildServer();

    const health = await server.inject("/health");
    const seed = await server.inject("/api/seed");
    const dashboard = await server.inject("/api/dashboard");
    const categoryUpdate = await server.inject({
      method: "PATCH",
      url: "/api/categories/water/pursuit",
      payload: { pursuitState: "later" }
    });
    const startedQuest = await server.inject({
      method: "POST",
      url: "/api/quests/home-label-utility-shutoffs/actions",
      payload: { action: "start" }
    });
    const completedQuest = await server.inject({
      method: "POST",
      url: "/api/quests/home-label-utility-shutoffs/actions",
      payload: { action: "complete" }
    });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, service: "basecamp-server" });
    expect(seed.statusCode).toBe(200);
    expect(seed.json().counts.categories).toBe(basecampSeed.categories.length);
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json()).toMatchObject(createDashboardSummary(basecampSeed));
    expect(categoryUpdate.statusCode).toBe(200);
    expect(categoryUpdate.json().categories.find((category: { id: string }) => category.id === "water")).toMatchObject({
      pursuitState: "later"
    });
    expect(startedQuest.statusCode).toBe(200);
    expect(startedQuest.json().instance.status).toBe("active");
    expect(completedQuest.statusCode).toBe(200);
    expect(completedQuest.json().dashboard.gamification.totalXp).toBeGreaterThan(0);

    await server.close();
  });
});
