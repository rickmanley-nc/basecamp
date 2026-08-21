import type {
  BadgeTemplate,
  BadgeTier,
  BasecampId,
  BasecampSeed,
  CategoryId,
  Criticality,
  DependencyType,
  HouseholdProgressSnapshot,
  MilestoneTemplate,
  OutpostTemplate,
  PursuitState,
  QuestId,
  QuestInstance,
  QuestStatus,
  QuestTemplate,
  QuestTaxonomy,
  XpEvent
} from "@basecamp/domain";

export type ReadinessComponent =
  | "knowledge"
  | "suppliesEquipment"
  | "configuration"
  | "practice"
  | "validation"
  | "maintenance"
  | "redundancy";

export type CategoryReadinessStatus =
  | "ready"
  | "active_gap"
  | "critical_gap"
  | "deferred"
  | "failed_validation"
  | "maintenance_required";

export interface CategoryReadiness {
  categoryId: CategoryId;
  categoryName: string;
  criticality: Criticality;
  pursuitState: PursuitState;
  score: number;
  level: number;
  status: CategoryReadinessStatus;
  components: Record<ReadinessComponent, number>;
  completedQuestIds: QuestId[];
  ceiling: number;
}

export interface CriticalGap {
  categoryId: CategoryId;
  categoryName: string;
  score: number;
  reason: "low_score" | "failed_validation" | "maintenance_required" | "deferred";
}

export interface ReadinessSummary {
  score: number;
  preparednessLevel: string;
  categories: CategoryReadiness[];
  criticalGaps: CriticalGap[];
}

export interface DependencyResolution {
  questId: QuestId;
  available: boolean;
  locked: boolean;
  missingDependencies: DependencyExplanation[];
  satisfiedDependencies: DependencyExplanation[];
}

export interface DependencyExplanation {
  questId: QuestId;
  title: string;
  type: DependencyType;
  optional: boolean;
  satisfied: boolean;
  reason: string;
}

export type RecommendationKind =
  | "best_risk_reduction"
  | "quick_win"
  | "build_project"
  | "skill"
  | "drill"
  | "maintenance";

export interface QuestRecommendation {
  quest: QuestTemplate;
  kind: RecommendationKind;
  score: number;
  reasons: string[];
  dependency: DependencyResolution;
}

interface RecommendationFactors {
  probability: number;
  consequence: number;
  capabilityGap: number;
  dependencyImportance: number;
  friction: number;
  userInterest: number;
  quickWin: number;
}

export type ProgressionNodeType =
  | "accomplishment"
  | "skill"
  | "build"
  | "test"
  | "drill"
  | "milestone"
  | "outpost";

export type ProgressionNodeState =
  | "completed"
  | "current"
  | "available"
  | "locked"
  | "deferred"
  | "failed_validation"
  | "maintenance_required";

export interface ProgressionNode {
  id: BasecampId;
  title: string;
  type: ProgressionNodeType;
  state: ProgressionNodeState;
  categoryId: CategoryId;
  targetLevel: number;
  detail: string;
}

export interface CategoryProgressionPath {
  categoryId: CategoryId;
  categoryName: string;
  pursuitState: PursuitState;
  nodes: ProgressionNode[];
}

export interface BadgeProgress {
  badgeId: BasecampId;
  name: string;
  categoryId: CategoryId;
  earnedTiers: BadgeTier[];
  nextTier?: BadgeTier;
  progressPercent: number;
}

export interface OutpostProgress {
  outpostId: BasecampId;
  name: string;
  categoryId: CategoryId;
  earned: boolean;
  satisfiedRequirements: string[];
  missingRequirements: string[];
  progressPercent: number;
}

export interface MilestoneProgress {
  milestoneId: BasecampId;
  name: string;
  earned: boolean;
  satisfiedRequirements: string[];
  missingRequirements: string[];
  progressPercent: number;
}

export const readinessComponentWeights: Record<ReadinessComponent, number> = {
  knowledge: 12,
  suppliesEquipment: 16,
  configuration: 14,
  practice: 16,
  validation: 22,
  maintenance: 12,
  redundancy: 8
};

export const dependencyTypes = [
  "knowledge",
  "skill",
  "equipment",
  "supply",
  "tool",
  "machinery",
  "drill",
  "validation",
  "optional_recommendation"
] as const satisfies readonly DependencyType[];

const suppressedPursuitStates = new Set<PursuitState>([
  "later",
  "paused",
  "not_currently_pursuing"
]);

const tierThresholds: Record<BadgeTier, number> = {
  bronze: 20,
  silver: 40,
  gold: 60,
  platinum: 80,
  master: 95
};

export function createEmptyProgressSnapshot(): HouseholdProgressSnapshot {
  return {
    completedQuestIds: [],
    questInstances: [],
    categoryPursuits: [],
    failedValidationQuestIds: [],
    maintenanceRequiredQuestIds: [],
    maintenanceRequiredCategoryIds: [],
    interestCategoryIds: [],
    xpEvents: []
  };
}

export function calculateReadiness(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot()
): ReadinessSummary {
  const categories = seed.categories.map((category) => calculateCategoryReadiness(seed, progress, category.id));
  const weighted = categories.reduce(
    (total, category) => total + category.score * criticalityWeight(category.criticality),
    0
  );
  const weights = categories.reduce((total, category) => total + criticalityWeight(category.criticality), 0);
  const score = weights === 0 ? 0 : Math.round(weighted / weights);

  return {
    score,
    preparednessLevel: preparednessLevelFor(score),
    categories,
    criticalGaps: categories
      .filter((category) => shouldListGap(category))
      .map((category) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        score: category.score,
        reason: gapReason(category)
      }))
  };
}

export function calculateCategoryReadiness(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot,
  categoryId: CategoryId
): CategoryReadiness {
  const category = requiredCategory(seed, categoryId);
  const completedIds = completedQuestIds(progress);
  const categoryCompletedQuests = seed.quests.filter(
    (quest) => quest.categoryId === categoryId && completedIds.has(quest.id)
  );
  const components = emptyComponents();

  for (const quest of categoryCompletedQuests) {
    addQuestComponentContributions(components, quest);
  }

  if (categoryCompletedQuests.length > 1) {
    components.redundancy = Math.max(components.redundancy, 0.5);
  }

  const failed = hasAny(progress.failedValidationQuestIds, categoryCompletedQuests.map((quest) => quest.id));
  const maintenanceRequired =
    hasAny(progress.maintenanceRequiredQuestIds, categoryCompletedQuests.map((quest) => quest.id)) ||
    new Set(progress.maintenanceRequiredCategoryIds ?? []).has(categoryId);
  const purchaseOnly = categoryCompletedQuests.length > 0 && categoryCompletedQuests.every(isPurchaseOnlyQuest);
  const hasValidation = components.validation > 0;
  let ceiling = 100;

  if (purchaseOnly) {
    ceiling = Math.min(ceiling, 35);
  }

  if (!hasValidation && categoryCompletedQuests.length > 0) {
    ceiling = Math.min(ceiling, 65);
  }

  if (maintenanceRequired) {
    ceiling = Math.min(ceiling, 70);
  }

  if (failed) {
    ceiling = Math.min(ceiling, 50);
  }

  const rawScore = Object.entries(components).reduce(
    (total, [component, value]) => total + readinessComponentWeights[component as ReadinessComponent] * value,
    0
  );
  const score = Math.round(Math.min(ceiling, rawScore));
  const pursuitState = pursuitStateFor(seed, progress, categoryId);

  return {
    categoryId,
    categoryName: category.name,
    criticality: category.criticality,
    pursuitState,
    score,
    level: Math.max(0, Math.min(5, Math.floor(score / 20))),
    status: categoryStatus(category.criticality, pursuitState, score, failed, maintenanceRequired),
    components,
    completedQuestIds: categoryCompletedQuests.map((quest) => quest.id),
    ceiling
  };
}

export function resolveQuestDependencies(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot()
): DependencyResolution[] {
  return seed.quests.map((quest) => resolveQuestDependency(seed, progress, quest));
}

export function resolveQuestDependency(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot,
  quest: QuestTemplate
): DependencyResolution {
  const completed = completedQuestIds(progress);
  const explanations = (quest.dependencies ?? []).map((dependencyId): DependencyExplanation => {
    const dependencyQuest = seed.quests.find((candidate) => candidate.id === dependencyId);

    if (dependencyQuest === undefined) {
      return {
        questId: dependencyId,
        title: dependencyId,
        type: "optional_recommendation",
        optional: true,
        satisfied: false,
        reason: "Dependency is not in the current seed and is treated as an optional recommendation."
      };
    }

    const satisfied = completed.has(dependencyId);

    return {
      questId: dependencyId,
      title: dependencyQuest.title,
      type: inferDependencyType(dependencyQuest),
      optional: false,
      satisfied,
      reason: satisfied
        ? `${dependencyQuest.title} is complete.`
        : `${dependencyQuest.title} must be completed first.`
    };
  });
  const missingDependencies = explanations.filter((dependency) => !dependency.optional && !dependency.satisfied);

  return {
    questId: quest.id,
    available: missingDependencies.length === 0,
    locked: missingDependencies.length > 0,
    missingDependencies,
    satisfiedDependencies: explanations.filter((dependency) => dependency.satisfied)
  };
}

export function inferDependencyType(quest: QuestTemplate): DependencyType {
  if (quest.taxonomy.includes("validation") || quest.taxonomy.includes("test")) {
    return "validation";
  }

  if (quest.taxonomy.includes("drill")) {
    return "drill";
  }

  if (quest.taxonomy.includes("skill") || quest.taxonomy.includes("practice")) {
    return "skill";
  }

  if (quest.taxonomy.includes("knowledge") || quest.taxonomy.includes("learn")) {
    return "knowledge";
  }

  if (quest.categoryId === "tools-repair") {
    return quest.taxonomy.includes("build") ? "machinery" : "tool";
  }

  if (quest.categoryId === "food" || quest.categoryId === "water" || quest.categoryId === "sanitation") {
    return "supply";
  }

  return "equipment";
}

export function recommendQuests(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot(),
  limit = 4
): QuestRecommendation[] {
  const readiness = calculateReadiness(seed, progress);
  const completed = completedQuestIds(progress);
  const instanceStatus = questStatusMap(progress.questInstances ?? []);
  const dependencies = new Map(
    resolveQuestDependencies(seed, progress).map((resolution) => [resolution.questId, resolution])
  );
  const categoryReadiness = new Map(
    readiness.categories.map((category) => [category.categoryId, category])
  );

  return seed.quests
    .filter((quest) => !completed.has(quest.id))
    .filter((quest) => !["active", "complete", "abandoned"].includes(instanceStatus.get(quest.id) ?? "available"))
    .map((quest) => {
      const category = requiredCategory(seed, quest.categoryId);
      const pursuitState = pursuitStateFor(seed, progress, quest.categoryId);
      const dependency = dependencies.get(quest.id) ?? resolveQuestDependency(seed, progress, quest);

      if (suppressedPursuitStates.has(pursuitState) || dependency.locked) {
        return undefined;
      }

      const readinessScore = categoryReadiness.get(quest.categoryId)?.score ?? 0;
      const factorScores = {
        probability: quest.priority === "high" ? 18 : quest.priority === "medium" ? 10 : 4,
        consequence: category.criticality === "critical" ? 22 : category.criticality === "important" ? 12 : 6,
        capabilityGap: Math.max(0, 100 - readinessScore) / 4,
        dependencyImportance: downstreamUnlockCount(seed, quest.id) * 8,
        friction: frictionScore(quest),
        userInterest: pursuitState === "active" ? 12 : pursuitState === "interested" ? 7 : 0,
        quickWin: quest.taxonomy.includes("quick-win") ? 16 : 0
      };
      const score = Math.round(Object.values(factorScores).reduce((total, value) => total + value, 0));
      const kind = recommendationKindFor(quest, factorScores);
      const reasons = recommendationReasons(quest, category.criticality, factorScores);

      return {
        quest,
        kind,
        score,
        reasons,
        dependency
      };
    })
    .filter((recommendation): recommendation is QuestRecommendation => recommendation !== undefined)
    .sort((left, right) => right.score - left.score || left.quest.estimatedMinutes - right.quest.estimatedMinutes)
    .slice(0, limit);
}

export function buildCategoryProgressionPaths(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot()
): CategoryProgressionPath[] {
  const completed = completedQuestIds(progress);
  const failed = new Set(progress.failedValidationQuestIds ?? []);
  const maintenance = new Set(progress.maintenanceRequiredQuestIds ?? []);
  const dependencyMap = new Map(
    resolveQuestDependencies(seed, progress).map((resolution) => [resolution.questId, resolution])
  );

  return seed.categories.map((category) => {
    const pursuitState = pursuitStateFor(seed, progress, category.id);
    const questNodes = seed.quests
      .filter((quest) => quest.categoryId === category.id)
      .sort((left, right) => left.targetLevel - right.targetLevel || left.estimatedMinutes - right.estimatedMinutes)
      .map((quest): ProgressionNode => {
        const dependency = dependencyMap.get(quest.id);
        const state = progressionStateForQuest(quest, pursuitState, completed, failed, maintenance, dependency);

        return {
          id: quest.id,
          title: quest.title,
          type: progressionNodeTypeForQuest(quest),
          state,
          categoryId: category.id,
          targetLevel: quest.targetLevel,
          detail: quest.validation
        };
      });
    const outpostNodes = seed.outposts
      .filter((outpost) => outpost.categoryId === category.id)
      .map((outpost): ProgressionNode => {
        const progressResult = evaluateOutpost(seed, progress, outpost);

        return {
          id: outpost.id,
          title: outpost.name,
          type: "outpost",
          state: progressResult.earned ? "completed" : suppressedPursuitStates.has(pursuitState) ? "deferred" : "locked",
          categoryId: category.id,
          targetLevel: 3,
          detail: `${progressResult.satisfiedRequirements.length}/${outpost.requirements.length} requirements complete`
        };
      });
    const milestoneNodes = seed.milestones
      .filter((milestone) => milestoneReferencesCategory(milestone, category.id, category.name))
      .map((milestone): ProgressionNode => {
        const progressResult = evaluateMilestone(seed, progress, milestone);

        return {
          id: `${category.id}-${milestone.id}`,
          title: milestone.name,
          type: "milestone",
          state: progressResult.earned ? "completed" : "locked",
          categoryId: category.id,
          targetLevel: 5,
          detail: milestone.description
        };
      });

    return {
      categoryId: category.id,
      categoryName: category.name,
      pursuitState,
      nodes: markCurrentNode([...questNodes, ...outpostNodes, ...milestoneNodes])
    };
  });
}

export function createXpEventForQuest(
  quest: QuestTemplate,
  reason: string,
  occurredAt: string
): XpEvent {
  return {
    id: `xp-${quest.id}-${occurredAt.replaceAll(/[^0-9A-Za-z]/g, "")}`,
    sourceType: "quest",
    sourceId: quest.id,
    reason,
    xpAwarded: isPurchaseOnlyQuest(quest) ? Math.min(quest.xp, 30) : quest.xp,
    occurredAt
  };
}

export function calculateBadgeProgress(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot()
): BadgeProgress[] {
  const readiness = calculateReadiness(seed, progress);
  const categoryScores = new Map(readiness.categories.map((category) => [category.categoryId, category.score]));

  return seed.badges.map((badge) => evaluateBadge(badge, categoryScores.get(badge.categoryId) ?? 0));
}

export function calculateOutpostProgress(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot()
): OutpostProgress[] {
  return seed.outposts.map((outpost) => evaluateOutpost(seed, progress, outpost));
}

export function calculateMilestoneProgress(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot()
): MilestoneProgress[] {
  return seed.milestones.map((milestone) => evaluateMilestone(seed, progress, milestone));
}

export function pursuitStateFor(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot,
  categoryId: CategoryId
): PursuitState {
  return (
    progress.categoryPursuits?.find((pursuit) => pursuit.categoryId === categoryId)?.pursuitState ??
    requiredCategory(seed, categoryId).defaultPursuitState
  );
}

function addQuestComponentContributions(
  components: Record<ReadinessComponent, number>,
  quest: QuestTemplate
): void {
  const taxonomy = new Set<QuestTaxonomy>(quest.taxonomy);

  if (hasAnyTaxonomy(taxonomy, ["knowledge", "learn", "offline-reference"])) {
    components.knowledge = Math.max(components.knowledge, 1);
  }

  if (hasAnyTaxonomy(taxonomy, ["acquire", "inventory", "loadout"])) {
    components.suppliesEquipment = Math.max(components.suppliesEquipment, 1);
  }

  if (hasAnyTaxonomy(taxonomy, ["configure", "build"])) {
    components.configuration = Math.max(components.configuration, 1);
  }

  if (hasAnyTaxonomy(taxonomy, ["practice", "skill"])) {
    components.practice = Math.max(components.practice, 1);
  }

  if (hasAnyTaxonomy(taxonomy, ["test", "drill", "validation"])) {
    components.validation = Math.max(components.validation, 1);
    components.practice = Math.max(components.practice, 0.6);
  }

  if (hasAnyTaxonomy(taxonomy, ["maintenance", "inspection"])) {
    components.maintenance = Math.max(components.maintenance, 1);
  }

  if (hasAnyTaxonomy(taxonomy, ["build", "test", "validation"])) {
    components.redundancy = Math.max(components.redundancy, 0.5);
  }
}

function progressionStateForQuest(
  quest: QuestTemplate,
  pursuitState: PursuitState,
  completed: Set<QuestId>,
  failed: Set<QuestId>,
  maintenance: Set<QuestId>,
  dependency: DependencyResolution | undefined
): ProgressionNodeState {
  if (completed.has(quest.id)) {
    return "completed";
  }

  if (failed.has(quest.id)) {
    return "failed_validation";
  }

  if (maintenance.has(quest.id)) {
    return "maintenance_required";
  }

  if (suppressedPursuitStates.has(pursuitState)) {
    return "deferred";
  }

  return dependency?.locked ? "locked" : "available";
}

function markCurrentNode(nodes: ProgressionNode[]): ProgressionNode[] {
  const currentIndex = nodes.findIndex((node) => node.state === "available");

  if (currentIndex === -1) {
    return nodes;
  }

  return nodes.map((node, index) => (index === currentIndex ? { ...node, state: "current" } : node));
}

function progressionNodeTypeForQuest(quest: QuestTemplate): ProgressionNodeType {
  if (quest.taxonomy.includes("drill")) {
    return "drill";
  }

  if (quest.taxonomy.includes("test") || quest.taxonomy.includes("validation")) {
    return "test";
  }

  if (quest.taxonomy.includes("skill") || quest.taxonomy.includes("practice") || quest.taxonomy.includes("learn")) {
    return "skill";
  }

  if (quest.taxonomy.includes("build") || quest.taxonomy.includes("loadout")) {
    return "build";
  }

  return "accomplishment";
}

function evaluateBadge(badge: BadgeTemplate, score: number): BadgeProgress {
  const earnedTiers = badge.tiers.filter((tier) => score >= tierThresholds[tier]);
  const nextTier = badge.tiers.find((tier) => score < tierThresholds[tier]);

  return {
    badgeId: badge.id,
    name: badge.name,
    categoryId: badge.categoryId,
    earnedTiers,
    ...(nextTier === undefined ? {} : { nextTier }),
    progressPercent: Math.min(100, score)
  };
}

function evaluateOutpost(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot,
  outpost: OutpostTemplate
): OutpostProgress {
  const readiness = calculateCategoryReadiness(seed, progress, outpost.categoryId);
  const completed = completedQuestTitles(seed, progress);
  const satisfiedRequirements = outpost.requirements.filter((requirement) =>
    requirementSatisfied(requirement, readiness, completed)
  );
  const missingRequirements = outpost.requirements.filter(
    (requirement) => !satisfiedRequirements.includes(requirement)
  );

  return {
    outpostId: outpost.id,
    name: outpost.name,
    categoryId: outpost.categoryId,
    earned: missingRequirements.length === 0,
    satisfiedRequirements,
    missingRequirements,
    progressPercent: percentage(satisfiedRequirements.length, outpost.requirements.length)
  };
}

function evaluateMilestone(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot,
  milestone: MilestoneTemplate
): MilestoneProgress {
  const readiness = calculateReadiness(seed, progress);
  const completed = completedQuestTitles(seed, progress);
  const outpostProgress = calculateOutpostProgress(seed, progress);
  const satisfiedRequirements = milestone.requirements.filter((requirement) => {
    if (requirement.includes("outposts earned")) {
      return outpostProgress.filter((outpost) => outpost.earned).length >= 3;
    }

    const categoryLevelMatch = requirement.match(/^(.+) level ([0-5])$/);

    if (categoryLevelMatch) {
      const categoryName = categoryLevelMatch[1] ?? "";
      const level = Number(categoryLevelMatch[2]);
      const category = readiness.categories.find(
        (candidate) => normalize(candidate.categoryName) === normalize(categoryName)
      );
      return (category?.level ?? 0) >= level;
    }

    return requirementSatisfied(requirement, undefined, completed);
  });
  const missingRequirements = milestone.requirements.filter(
    (requirement) => !satisfiedRequirements.includes(requirement)
  );

  return {
    milestoneId: milestone.id,
    name: milestone.name,
    earned: missingRequirements.length === 0,
    satisfiedRequirements,
    missingRequirements,
    progressPercent: percentage(satisfiedRequirements.length, milestone.requirements.length)
  };
}

function recommendationKindFor(
  quest: QuestTemplate,
  factors: RecommendationFactors
): RecommendationKind {
  if (quest.taxonomy.includes("maintenance") || quest.taxonomy.includes("inspection")) {
    return "maintenance";
  }

  if (quest.taxonomy.includes("drill") || quest.taxonomy.includes("validation")) {
    return "drill";
  }

  if (quest.taxonomy.includes("skill") || quest.taxonomy.includes("practice") || quest.taxonomy.includes("learn")) {
    return "skill";
  }

  if (quest.taxonomy.includes("build") || quest.taxonomy.includes("loadout")) {
    return "build_project";
  }

  if (factors.quickWin >= 16 || quest.estimatedMinutes <= 30) {
    return "quick_win";
  }

  return "best_risk_reduction";
}

function recommendationReasons(
  quest: QuestTemplate,
  criticality: Criticality,
  factors: RecommendationFactors
): string[] {
  const reasons: string[] = [];

  if (criticality === "critical") {
    reasons.push("Reduces a critical capability gap.");
  }

  if (factors.quickWin > 0 || quest.estimatedMinutes <= 30) {
    reasons.push("Small enough to finish quickly.");
  }

  if (factors.dependencyImportance > 0) {
    reasons.push("Unlocks downstream work.");
  }

  if (quest.estimatedCostUsd === 0) {
    reasons.push("No purchase required.");
  }

  return reasons.length === 0 ? [quest.whyItMatters] : reasons;
}

function frictionScore(quest: QuestTemplate): number {
  const minutes = quest.estimatedMinutes <= 30 ? 12 : quest.estimatedMinutes <= 60 ? 8 : 3;
  const cost = quest.estimatedCostUsd === 0 ? 10 : quest.estimatedCostUsd <= 25 ? 6 : 1;
  return minutes + cost;
}

function downstreamUnlockCount(seed: BasecampSeed, questId: QuestId): number {
  return seed.quests.filter((quest) => (quest.dependencies ?? []).includes(questId)).length;
}

function categoryStatus(
  criticality: Criticality,
  pursuitState: PursuitState,
  score: number,
  failed: boolean,
  maintenanceRequired: boolean
): CategoryReadinessStatus {
  if (failed) {
    return "failed_validation";
  }

  if (maintenanceRequired) {
    return "maintenance_required";
  }

  if (suppressedPursuitStates.has(pursuitState)) {
    return "deferred";
  }

  if (score >= 80) {
    return "ready";
  }

  return criticality === "critical" && score < 40 ? "critical_gap" : "active_gap";
}

function shouldListGap(category: CategoryReadiness): boolean {
  return (
    category.status === "critical_gap" ||
    category.status === "failed_validation" ||
    category.status === "maintenance_required" ||
    (category.criticality === "critical" && category.status === "deferred")
  );
}

function gapReason(category: CategoryReadiness): CriticalGap["reason"] {
  if (category.status === "failed_validation") {
    return "failed_validation";
  }

  if (category.status === "maintenance_required") {
    return "maintenance_required";
  }

  if (category.status === "deferred") {
    return "deferred";
  }

  return "low_score";
}

function completedQuestIds(progress: HouseholdProgressSnapshot): Set<QuestId> {
  return new Set([
    ...(progress.completedQuestIds ?? []),
    ...(progress.questInstances ?? [])
      .filter((instance) => instance.status === "complete")
      .map((instance) => instance.templateId)
  ]);
}

function questStatusMap(instances: QuestInstance[]): Map<QuestId, QuestStatus> {
  return new Map(instances.map((instance) => [instance.templateId, instance.status]));
}

function completedQuestTitles(seed: BasecampSeed, progress: HouseholdProgressSnapshot): string[] {
  const completed = completedQuestIds(progress);
  return seed.quests
    .filter((quest) => completed.has(quest.id))
    .map((quest) => `${quest.id} ${quest.title}`);
}

function requirementSatisfied(
  requirement: string,
  readiness: CategoryReadiness | undefined,
  completedQuestText: string[]
): boolean {
  const normalizedRequirement = normalize(requirement);
  const levelMatch = normalizedRequirement.match(/level ([0-5])/);

  if (levelMatch && readiness !== undefined) {
    return readiness.level >= Number(levelMatch[1]);
  }

  return completedQuestText.some((questText) => {
    const normalizedQuest = normalize(questText);
    const tokens = normalizedRequirement
      .split(" ")
      .filter((token) => token.length > 3 && !["complete", "active", "tested", "required"].includes(token));

    return tokens.length > 0 && tokens.every((token) => normalizedQuest.includes(token));
  });
}

function isPurchaseOnlyQuest(quest: QuestTemplate): boolean {
  return quest.taxonomy.every((taxonomy) => ["acquire", "inventory", "loadout"].includes(taxonomy));
}

function hasAny<T>(values: T[] | undefined, candidates: T[]): boolean {
  const valueSet = new Set(values ?? []);
  return candidates.some((candidate) => valueSet.has(candidate));
}

function hasAnyTaxonomy(taxonomy: Set<QuestTaxonomy>, candidates: QuestTaxonomy[]): boolean {
  return candidates.some((candidate) => taxonomy.has(candidate));
}

function emptyComponents(): Record<ReadinessComponent, number> {
  return {
    knowledge: 0,
    suppliesEquipment: 0,
    configuration: 0,
    practice: 0,
    validation: 0,
    maintenance: 0,
    redundancy: 0
  };
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function criticalityWeight(criticality: Criticality): number {
  if (criticality === "critical") {
    return 1.5;
  }

  if (criticality === "important") {
    return 1;
  }

  return 0.75;
}

function preparednessLevelFor(score: number): string {
  if (score >= 80) {
    return "Outpost Ready";
  }

  if (score >= 60) {
    return "Trail Tested";
  }

  if (score >= 40) {
    return "Camp Established";
  }

  if (score >= 20) {
    return "Trailhead";
  }

  return "Unproven";
}

function requiredCategory(seed: BasecampSeed, categoryId: CategoryId) {
  const category = seed.categories.find((candidate) => candidate.id === categoryId);

  if (category === undefined) {
    throw new Error(`Unknown category ${categoryId}.`);
  }

  return category;
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

function milestoneReferencesCategory(
  milestone: MilestoneTemplate,
  categoryId: CategoryId,
  categoryName: string
): boolean {
  const searchable = normalize(`${milestone.name} ${milestone.description} ${milestone.requirements.join(" ")}`);
  return searchable.includes(normalize(categoryId)) || searchable.includes(normalize(categoryName));
}
