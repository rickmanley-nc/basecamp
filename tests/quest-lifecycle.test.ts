import { basecampSeed } from "@basecamp/content";
import { applyQuestAction, listQuestBuckets } from "@basecamp/domain";
import { describe, expect, it } from "vitest";

describe("quest lifecycle", () => {
  const waterRequirements = basecampSeed.quests.find(
    (quest) => quest.id === "water-calculate-household-requirements"
  )!;
  const utilityShutoffs = basecampSeed.quests.find(
    (quest) => quest.id === "home-label-utility-shutoffs"
  )!;

  it("supports save, start, pause, resume, complete, and reopen transitions", () => {
    const saved = applyQuestAction(waterRequirements, undefined, "save", {
      now: "2026-08-20T00:00:00Z"
    });
    const active = applyQuestAction(waterRequirements, saved.instance, "start", {
      now: "2026-08-20T00:01:00Z"
    });
    const paused = applyQuestAction(waterRequirements, active.instance, "pause", {
      now: "2026-08-20T00:02:00Z"
    });
    const resumed = applyQuestAction(waterRequirements, paused.instance, "resume", {
      now: "2026-08-20T00:03:00Z"
    });
    const completed = applyQuestAction(waterRequirements, resumed.instance, "complete", {
      now: "2026-08-20T00:04:00Z"
    });
    const reopened = applyQuestAction(waterRequirements, completed.instance, "reopen", {
      now: "2026-08-20T00:05:00Z"
    });

    expect(saved.instance.status).toBe("saved");
    expect(active.instance.status).toBe("active");
    expect(paused.instance.status).toBe("paused");
    expect(resumed.instance.status).toBe("active");
    expect(completed.instance.status).toBe("complete");
    expect(reopened.instance.status).toBe("reopened");
    expect(completed.event.fromStatus).toBe("active");
    expect(completed.event.toStatus).toBe("complete");
  });

  it("supports multiple active quests and keeps saved quests separate", () => {
    const activeWater = applyQuestAction(waterRequirements, undefined, "start");
    const activeHome = applyQuestAction(utilityShutoffs, undefined, "start");
    const savedHome = applyQuestAction(utilityShutoffs, activeHome.instance, "pause");
    const buckets = listQuestBuckets([
      activeWater.instance,
      activeHome.instance,
      savedHome.instance
    ]);

    expect(buckets.active).toHaveLength(2);
    expect(buckets.paused).toHaveLength(1);
  });

  it("rejects invalid lifecycle moves", () => {
    expect(() => applyQuestAction(waterRequirements, undefined, "complete")).toThrow(
      "Cannot complete"
    );
  });
});
