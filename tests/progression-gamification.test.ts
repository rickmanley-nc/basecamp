import { basecampSeed } from "@basecamp/content";
import {
  buildCategoryProgressionPaths,
  calculateBadgeProgress,
  calculateCapabilityOutpostProgress,
  calculateOutpostProgress,
  createXpEventForQuest
} from "@basecamp/gamification";
import { describe, expect, it } from "vitest";

describe("progression paths and gamification", () => {
  it("builds accessible path nodes across accomplishments, skills, builds, drills, milestones, and capability outposts", () => {
    const paths = buildCategoryProgressionPaths(basecampSeed, {
      completedQuestIds: ["water-calculate-household-requirements"],
      failedValidationQuestIds: ["water-establish-basic-purification"],
      maintenanceRequiredQuestIds: ["medical-inspect-supplies"],
      categoryPursuits: [{ categoryId: "navigation", pursuitState: "later" }]
    });
    const nodeTypes = new Set(paths.flatMap((path) => path.nodes.map((node) => node.type)));
    const nodeStates = new Set(paths.flatMap((path) => path.nodes.map((node) => node.state)));

    expect(nodeTypes.has("accomplishment")).toBe(true);
    expect(nodeTypes.has("skill")).toBe(true);
    expect(nodeTypes.has("build")).toBe(true);
    expect(nodeTypes.has("drill")).toBe(true);
    expect(nodeTypes.has("capability_outpost")).toBe(true);
    expect(nodeTypes.has("milestone")).toBe(true);
    expect(nodeStates.has("completed")).toBe(true);
    expect(nodeStates.has("failed_validation")).toBe(true);
    expect(nodeStates.has("maintenance_required")).toBe(true);
    expect(nodeStates.has("deferred")).toBe(true);
  });

  it("calculates badge and capability outpost progress without treating XP as readiness", () => {
    const progress = {
      completedQuestIds: [
        "communications-add-handheld-radios",
        "communications-configure-local-channels",
        "communications-test-two-location-radio"
      ]
    };
    const badges = calculateBadgeProgress(basecampSeed, progress);
    const outposts = calculateCapabilityOutpostProgress(basecampSeed, progress);
    const radioBadge = badges.find((badge) => badge.badgeId === "radio-operator")!;
    const communicationsOutpost = outposts.find(
      (outpost) => outpost.outpostId === "communications-outpost"
    )!;

    expect(radioBadge.earnedTiers.length).toBeGreaterThan(0);
    expect(communicationsOutpost.progressPercent).toBeGreaterThan(0);
    expect(communicationsOutpost.earned).toBe(false);
  });

  it("keeps the original capability outpost progress helper as a compatibility alias", () => {
    expect(calculateOutpostProgress(basecampSeed)).toEqual(calculateCapabilityOutpostProgress(basecampSeed));
  });

  it("limits purchase-only XP while preserving validation XP", () => {
    const purchaseOnlyQuest = basecampSeed.quests.find(
      (quest) => quest.id === "water-store-24-hour-drinking-water"
    )!;
    const validationQuest = basecampSeed.quests.find(
      (quest) => quest.id === "communications-test-two-location-radio"
    )!;

    expect(createXpEventForQuest(purchaseOnlyQuest, "completed", "2026-08-20T00:00:00Z").xpAwarded).toBeLessThan(
      purchaseOnlyQuest.xp
    );
    expect(createXpEventForQuest(validationQuest, "completed", "2026-08-20T00:00:00Z").xpAwarded).toBe(
      validationQuest.xp
    );
  });
});
