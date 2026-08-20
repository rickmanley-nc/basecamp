import type { BasecampSeed, PreparednessCategory, QuestTemplate } from "@basecamp/domain";

export const apiRoutes = {
  health: "/health",
  seed: "/api/seed",
  dashboard: "/api/dashboard"
} as const;

export interface HealthResponse {
  ok: true;
  service: "basecamp-server";
  version: string;
  checkedAt: string;
}

export interface SeedContentResponse {
  schemaVersion: string;
  generatedOn: string;
  counts: {
    categories: number;
    levels: number;
    quests: number;
    badges: number;
    outposts: number;
    milestones: number;
  };
  seed: BasecampSeed;
}

export interface CategorySummary {
  id: string;
  name: string;
  criticality: PreparednessCategory["criticality"];
  pursuitState: PreparednessCategory["defaultPursuitState"];
  level: number;
  progressPercent: number;
}

export interface QuestSummary {
  id: string;
  title: string;
  categoryId: string;
  targetLevel: number;
  priority: QuestTemplate["priority"];
  estimatedMinutes: number;
  xp: number;
}

export interface DashboardSummary {
  readinessScore: number;
  preparednessLevel: string;
  categories: CategorySummary[];
  activeQuests: QuestSummary[];
  recommendedQuests: QuestSummary[];
  upcomingMaintenance: Array<{
    id: string;
    title: string;
    due: string;
  }>;
  recentBadges: Array<{
    id: string;
    name: string;
  }>;
}

export function createSeedContentResponse(seed: BasecampSeed): SeedContentResponse {
  return {
    schemaVersion: seed.schemaVersion,
    generatedOn: seed.generatedOn,
    counts: {
      categories: seed.categories.length,
      levels: seed.levels.length,
      quests: seed.quests.length,
      badges: seed.badges.length,
      outposts: seed.outposts.length,
      milestones: seed.milestones.length
    },
    seed
  };
}

export function createDashboardSummary(seed: BasecampSeed): DashboardSummary {
  const activeCategoryIds = new Set(
    seed.categories
      .filter((category) => category.defaultPursuitState === "active")
      .map((category) => category.id)
  );
  const highPriorityQuests = seed.quests
    .filter((quest) => quest.priority === "high")
    .slice(0, 4)
    .map(toQuestSummary);
  const activeQuests = seed.quests
    .filter((quest) => activeCategoryIds.has(quest.categoryId))
    .slice(0, 3)
    .map(toQuestSummary);

  return {
    readinessScore: 12,
    preparednessLevel: "Trailhead",
    categories: seed.categories.map((category, index) => ({
      id: category.id,
      name: category.name,
      criticality: category.criticality,
      pursuitState: category.defaultPursuitState,
      level: category.defaultPursuitState === "active" ? 1 : 0,
      progressPercent: Math.min(72, 8 + index * 3)
    })),
    activeQuests,
    recommendedQuests: highPriorityQuests,
    upcomingMaintenance: [
      {
        id: "medical-kit-inspection",
        title: "Inspect medical supplies",
        due: "This week"
      },
      {
        id: "radio-charge-check",
        title: "Charge and test handheld radios",
        due: "Next 7 days"
      }
    ],
    recentBadges: seed.badges.slice(0, 2).map((badge) => ({
      id: badge.id,
      name: badge.name
    }))
  };
}

function toQuestSummary(quest: QuestTemplate): QuestSummary {
  return {
    id: quest.id,
    title: quest.title,
    categoryId: quest.categoryId,
    targetLevel: quest.targetLevel,
    priority: quest.priority,
    estimatedMinutes: quest.estimatedMinutes,
    xp: quest.xp
  };
}
