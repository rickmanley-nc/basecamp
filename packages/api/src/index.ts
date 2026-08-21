import type {
  BasecampSeed,
  HouseholdProgressSnapshot,
  PreparednessCategory,
  QuestStatus,
  QuestTemplate
} from "@basecamp/domain";
import {
  buildCategoryProgressionPaths,
  calculateBadgeProgress,
  calculateMilestoneProgress,
  calculateOutpostProgress,
  calculateReadiness,
  createEmptyProgressSnapshot,
  recommendQuests,
  type BadgeProgress,
  type CategoryProgressionPath,
  type CriticalGap,
  type MilestoneProgress,
  type OutpostProgress,
  type ProgressionNodeState,
  type RecommendationKind
} from "@basecamp/gamification";

export const apiRoutes = {
  health: "/health",
  seed: "/api/seed",
  dashboard: "/api/dashboard",
  categoryPursuit: "/api/categories/:categoryId/pursuit",
  questAction: "/api/quests/:questId/actions"
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
  readinessScore: number;
  progressPercent: number;
  status: string;
  nextNodeState?: ProgressionNodeState;
}

export interface QuestSummary {
  id: string;
  title: string;
  categoryId: string;
  targetLevel: number;
  priority: QuestTemplate["priority"];
  estimatedMinutes: number;
  xp: number;
  status: QuestStatus;
  locked: boolean;
  recommendationKind?: RecommendationKind;
  reasons?: string[];
}

export interface DashboardSummary {
  readinessScore: number;
  preparednessLevel: string;
  categories: CategorySummary[];
  activeQuests: QuestSummary[];
  savedQuests: QuestSummary[];
  deferredQuests: QuestSummary[];
  recommendedQuests: QuestSummary[];
  criticalGaps: CriticalGap[];
  categoryPaths: CategoryProgressionPath[];
  upcomingMaintenance: Array<{
    id: string;
    title: string;
    due: string;
  }>;
  recentBadges: Array<{
    id: string;
    name: string;
  }>;
  gamification: {
    totalXp: number;
    badges: BadgeProgress[];
    outposts: OutpostProgress[];
    milestones: MilestoneProgress[];
  };
}

export interface CategoryPursuitUpdateRequest {
  pursuitState: PreparednessCategory["defaultPursuitState"];
}

export interface QuestActionRequest {
  action: "save" | "start" | "pause" | "resume" | "snooze" | "abandon" | "complete" | "reopen";
  reason?: string;
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

export function createDashboardSummary(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot()
): DashboardSummary {
  const readiness = calculateReadiness(seed, progress);
  const categoryPaths = buildCategoryProgressionPaths(seed, progress);
  const recommendations = recommendQuests(seed, progress, 5);
  const questInstances = progress.questInstances ?? [];
  const questTemplates = new Map(seed.quests.map((quest) => [quest.id, quest]));
  const activeQuests = questInstances
    .filter((instance) => instance.status === "active" || instance.status === "reopened")
    .map((instance) => toQuestSummary(requiredQuest(questTemplates, instance.templateId), instance.status, false));
  const savedQuests = questInstances
    .filter((instance) => instance.status === "saved")
    .map((instance) => toQuestSummary(requiredQuest(questTemplates, instance.templateId), instance.status, false));
  const deferredQuests = questInstances
    .filter((instance) => instance.status === "paused" || instance.status === "snoozed")
    .map((instance) => toQuestSummary(requiredQuest(questTemplates, instance.templateId), instance.status, false));
  const badgeProgress = calculateBadgeProgress(seed, progress);
  const outpostProgress = calculateOutpostProgress(seed, progress);
  const milestoneProgress = calculateMilestoneProgress(seed, progress);
  const totalXp = (progress.xpEvents ?? []).reduce((total, event) => total + event.xpAwarded, 0);

  return {
    readinessScore: readiness.score,
    preparednessLevel: readiness.preparednessLevel,
    categories: readiness.categories.map((category) => {
      const nextNodeState = categoryPaths
        .find((path) => path.categoryId === category.categoryId)
        ?.nodes.find((node) => node.state !== "completed")?.state;
      const summary: CategorySummary = {
        id: category.categoryId,
        name: category.categoryName,
        criticality: category.criticality,
        pursuitState: category.pursuitState,
        level: category.level,
        readinessScore: category.score,
        progressPercent: category.score,
        status: category.status
      };

      if (nextNodeState !== undefined) {
        summary.nextNodeState = nextNodeState;
      }

      return summary;
    }),
    activeQuests,
    savedQuests,
    deferredQuests,
    recommendedQuests: recommendations.map((recommendation) =>
      toQuestSummary(recommendation.quest, "available", recommendation.dependency.locked, {
        recommendationKind: recommendation.kind,
        reasons: recommendation.reasons
      })
    ),
    criticalGaps: readiness.criticalGaps,
    categoryPaths,
    upcomingMaintenance: categoryPaths
      .flatMap((path) => path.nodes)
      .filter((node) => node.state === "maintenance_required")
      .slice(0, 3)
      .map((node) => ({
        id: node.id,
        title: node.title,
        due: "Needs review"
      })),
    recentBadges: badgeProgress
      .filter((badge) => badge.earnedTiers.length > 0)
      .slice(0, 2)
      .map((badge) => ({
        id: badge.badgeId,
        name: `${badge.name} ${badge.earnedTiers.at(-1) ?? ""}`.trim()
      })),
    gamification: {
      totalXp,
      badges: badgeProgress,
      outposts: outpostProgress,
      milestones: milestoneProgress
    }
  };
}

function toQuestSummary(
  quest: QuestTemplate,
  status: QuestStatus,
  locked: boolean,
  recommendation?: {
    recommendationKind?: RecommendationKind;
    reasons?: string[];
  }
): QuestSummary {
  const summary: QuestSummary = {
    id: quest.id,
    title: quest.title,
    categoryId: quest.categoryId,
    targetLevel: quest.targetLevel,
    priority: quest.priority,
    estimatedMinutes: quest.estimatedMinutes,
    xp: quest.xp,
    status,
    locked
  };

  if (recommendation?.recommendationKind !== undefined) {
    summary.recommendationKind = recommendation.recommendationKind;
  }

  if (recommendation?.reasons !== undefined) {
    summary.reasons = recommendation.reasons;
  }

  return summary;
}

function requiredQuest(quests: Map<string, QuestTemplate>, questId: string): QuestTemplate {
  const quest = quests.get(questId);

  if (quest === undefined) {
    throw new Error(`Unknown quest ${questId}.`);
  }

  return quest;
}
