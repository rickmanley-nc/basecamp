import { basecampSeed } from "@basecamp/content";
import {
  calculateReadiness,
  recommendQuests,
  resolveQuestDependency,
  type QuestRecommendation
} from "@basecamp/gamification";
import { describe, expect, it } from "vitest";

describe("readiness scoring and recommendations", () => {
  it("caps purchase-only readiness below validated capability", () => {
    const purchaseOnly = calculateReadiness(basecampSeed, {
      completedQuestIds: ["water-store-24-hour-drinking-water"]
    });
    const validated = calculateReadiness(basecampSeed, {
      completedQuestIds: [
        "water-calculate-household-requirements",
        "water-store-24-hour-drinking-water",
        "water-establish-basic-purification"
      ]
    });
    const purchaseOnlyWater = purchaseOnly.categories.find((category) => category.categoryId === "water")!;
    const validatedWater = validated.categories.find((category) => category.categoryId === "water")!;

    expect(purchaseOnlyWater.score).toBeLessThanOrEqual(35);
    expect(validatedWater.score).toBeGreaterThan(purchaseOnlyWater.score);
    expect(validatedWater.components.validation).toBeGreaterThan(0);
  });

  it("locks dependent work while unrelated quests remain available", () => {
    const buildReserve = basecampSeed.quests.find((quest) => quest.id === "water-build-72-hour-reserve")!;
    const storeWater = basecampSeed.quests.find((quest) => quest.id === "water-store-24-hour-drinking-water")!;

    expect(resolveQuestDependency(basecampSeed, {}, buildReserve)).toMatchObject({
      locked: true,
      available: false
    });
    expect(resolveQuestDependency(basecampSeed, {}, storeWater)).toMatchObject({
      locked: false,
      available: true
    });
    expect(
      resolveQuestDependency(
        basecampSeed,
        { completedQuestIds: ["water-calculate-household-requirements"] },
        buildReserve
      )
    ).toMatchObject({ locked: false, available: true });
  });

  it("ranks quick wins and suppresses deferred categories", () => {
    const baseline = recommendQuests(basecampSeed, {}, 3);
    const deferredWater = recommendQuests(
      basecampSeed,
      {
        categoryPursuits: [{ categoryId: "water", pursuitState: "later" }]
      },
      10
    );

    expect(firstQuestId(baseline)).toBe("water-calculate-household-requirements");
    expect(deferredWater.some((recommendation) => recommendation.quest.categoryId === "water")).toBe(false);
  });
});

function firstQuestId(recommendations: QuestRecommendation[]): string | undefined {
  return recommendations[0]?.quest.id;
}
