import type {
  AcquisitionNeed,
  Asset,
  AssetTag,
  BasecampSeed,
  DrillCriterionResult,
  DrillRun,
  DrillTemplate,
  EvidenceKind,
  EvidenceLink,
  EvidenceMetadata,
  EvidenceRecord,
  HouseholdProgressSnapshot,
  InventoryItem,
  InventoryLot,
  Kit,
  Location,
  LocationProgressionResult,
  MaintenanceDueItem,
  MaintenanceEvent,
  MaintenancePolicy,
  PreparednessCategory,
  QuestStatus,
  QuestTemplate,
  SkillState,
  TrainingRecord
} from "@basecamp/domain";
import { rollupAcquisitionNeeds } from "@basecamp/domain";
import {
  buildGapAnalysisReport,
  buildCategoryProgressionPaths,
  calculateBadgeProgress,
  calculateCapabilityOutpostProgress,
  calculateMilestoneProgress,
  calculateReadiness,
  createEmptyProgressSnapshot,
  recommendQuests,
  type BadgeProgress,
  type CategoryProgressionPath,
  type CapabilityOutpostProgress,
  type CriticalGap,
  type GapAnalysisReport,
  type MilestoneProgress,
  type ProgressionNodeState,
  type RecommendationKind
} from "@basecamp/gamification";
import * as QRCode from "qrcode";

export const apiRoutes = {
  health: "/health",
  seed: "/api/seed",
  dashboard: "/api/dashboard",
  inventory: "/api/inventory",
  quickInventoryEntry: "/api/inventory/quick-entry",
  assetTag: "/api/assets/:assetId/tags",
  assetLookup: "/api/assets/:assetId",
  maintenancePolicy: "/api/maintenance/policies",
  maintenanceCompletion: "/api/maintenance/:policyId/completions",
  evidence: "/api/evidence",
  skillTraining: "/api/skills/training",
  drillTemplates: "/api/drills/templates",
  drillRun: "/api/drills/:templateId/runs",
  gapReport: "/api/reports/gaps",
  sync: "/api/sync",
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

export interface InventoryDashboardSource {
  locations: Location[];
  locationProgression: LocationProgressionResult[];
  items: InventoryItem[];
  lots: InventoryLot[];
  assets: Asset[];
  assetTags: AssetTag[];
  kits: Kit[];
  maintenanceDue: MaintenanceDueItem[];
}

export interface LocationSummary {
  id: string;
  name: string;
  kind: Location["kind"];
  maturity: Location["maturity"];
  categoryCount: number;
  inventoryCount: number;
  assetCount: number;
  kitCount: number;
  missingForNext: string[];
  linkedCapabilityOutpostIds: string[];
}

export interface InventoryItemSummary {
  id: string;
  name: string;
  type: InventoryItem["type"];
  categoryId?: string;
  state: InventoryItem["state"];
  quantity: number;
  unit: string;
  locationNames: string[];
  nextExpiration?: string;
}

export interface AssetSummary {
  id: string;
  name: string;
  type: Asset["type"];
  state: Asset["state"];
  locationId?: string;
  locationName?: string;
  tagCount: number;
}

export interface KitSummary {
  id: string;
  name: string;
  state: Kit["state"];
  locationId?: string;
  locationName?: string;
}

export interface AcquisitionNeedSummary extends AcquisitionNeed {}

export interface MaintenanceDueSummary extends MaintenanceDueItem {}

export interface AssetTagSummary extends AssetTag {
  qrSvg?: string;
}

export interface InventoryDashboardSummary {
  locations: LocationSummary[];
  items: InventoryItemSummary[];
  assets: AssetSummary[];
  kits: KitSummary[];
  acquisitionNeeds: AcquisitionNeedSummary[];
  maintenanceDue: MaintenanceDueSummary[];
  assetTags: AssetTagSummary[];
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
  gapReport: GapAnalysisReport;
  inventory: InventoryDashboardSummary;
  recentBadges: Array<{
    id: string;
    name: string;
  }>;
  gamification: {
    totalXp: number;
    badges: BadgeProgress[];
    capabilityOutposts: CapabilityOutpostProgress[];
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

export interface QuickInventoryEntryRequest {
  itemName: string;
  quantity: number;
  locationName: string;
  unit?: string;
  categoryId?: string;
  type?: InventoryItem["type"];
  expiresAt?: string;
  notes?: string;
}

export interface MaintenancePolicyRequest {
  name: string;
  scopeType: MaintenancePolicy["scopeType"];
  intervalCount: number;
  intervalUnit: MaintenancePolicy["intervalUnit"];
  assetId?: string;
  itemId?: string;
  locationId?: string;
  categoryId?: string;
  nextDueAt?: string;
  instructions?: string;
}

export interface MaintenanceCompletionRequest {
  outcome?: MaintenanceEvent["outcome"];
  notes?: string;
}

export interface AssetTagResponse extends AssetTagSummary {
  asset: AssetSummary;
}

export interface EvidenceRecordRequest {
  kind: EvidenceKind;
  title: string;
  links: EvidenceLink[];
  metadata: EvidenceMetadata;
  id?: string;
}

export interface EvidenceRecordResponse {
  evidence: EvidenceRecord;
}

export interface SkillTrainingRequest {
  skillId: string;
  courseName: string;
  completedAt: string;
  name?: string;
  categoryId?: string;
  provider?: string;
  expiresAt?: string;
  evidenceIds?: string[];
  notes?: string;
  stateAwarded?: Exclude<SkillState, "untrained">;
}

export interface SkillTrainingResponse {
  skill: {
    skillId: string;
    name?: string;
    categoryId?: string;
    state: SkillState;
    expiresAt?: string;
  };
  trainingRecord: TrainingRecord;
  dashboard: DashboardSummary;
}

export interface DrillRunRequest {
  completedAt: string;
  criteriaResults: DrillCriterionResult[];
  startedAt?: string;
  lessons?: string;
  evidenceIds?: string[];
}

export interface DrillTemplatesResponse {
  templates: DrillTemplate[];
}

export interface DrillRunResponse {
  run: DrillRun;
  dashboard: DashboardSummary;
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
  progress: HouseholdProgressSnapshot = createEmptyProgressSnapshot(),
  inventorySource: InventoryDashboardSource = emptyInventorySource()
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
  const capabilityOutpostProgress = calculateCapabilityOutpostProgress(seed, progress);
  const milestoneProgress = calculateMilestoneProgress(seed, progress);
  const totalXp = (progress.xpEvents ?? []).reduce((total, event) => total + event.xpAwarded, 0);
  const inventory = createInventoryDashboardSummary(seed, progress, inventorySource);
  const gapReport = buildGapAnalysisReport(seed, progress, {
    acquisitionNeeds: inventory.acquisitionNeeds,
    maintenanceDue: inventory.maintenanceDue
  });
  const pathMaintenance = categoryPaths
    .flatMap((path) => path.nodes)
    .filter((node) => node.state === "maintenance_required")
    .slice(0, 3)
    .map((node) => ({
      id: node.id,
      title: node.title,
      due: "Needs review"
    }));

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
    upcomingMaintenance: [
      ...inventory.maintenanceDue.slice(0, 3).map((item) => ({
        id: item.policyId,
        title: item.title,
        due: `${item.status} ${item.dueAt.slice(0, 10)}`
      })),
      ...pathMaintenance
    ].slice(0, 3),
    gapReport,
    inventory,
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
      capabilityOutposts: capabilityOutpostProgress,
      milestones: milestoneProgress
    }
  };
}

export function createInventoryDashboardSummary(
  seed: BasecampSeed,
  progress: HouseholdProgressSnapshot,
  source: InventoryDashboardSource
): InventoryDashboardSummary {
  const locationsById = new Map(source.locations.map((location) => [location.id, location]));
  const lotsByItemId = new Map<string, InventoryLot[]>();
  const activeQuestIds = (progress.questInstances ?? [])
    .filter((instance) => instance.status === "active" || instance.status === "reopened")
    .map((instance) => instance.templateId);

  for (const lot of source.lots) {
    lotsByItemId.set(lot.itemId, [...(lotsByItemId.get(lot.itemId) ?? []), lot]);
  }

  return {
    locations: source.locationProgression.map((progression) => {
      const location = locationsById.get(progression.locationId);

      return {
        id: progression.locationId,
        name: progression.locationName,
        kind: location?.kind ?? "other",
        maturity: progression.maturity,
        categoryCount: progression.categoryCount,
        inventoryCount: progression.inventoryCount,
        assetCount: progression.assetCount,
        kitCount: progression.kitCount,
        missingForNext: progression.missingForNext,
        linkedCapabilityOutpostIds: progression.linkedCapabilityOutpostIds
      };
    }),
    items: source.items.map((item) => {
      const lots = lotsByItemId.get(item.id) ?? [];
      const activeLots = lots.filter((lot) => lot.state !== "expired" && lot.state !== "retired");
      const locationNames = Array.from(
        new Set(
          activeLots
            .map((lot) => locationsById.get(lot.locationId)?.name)
            .filter((name): name is string => name !== undefined)
        )
      );
      const expirations = activeLots
        .map((lot) => lot.expiresAt)
        .filter((expiresAt): expiresAt is string => expiresAt !== undefined)
        .sort();

      return {
        id: item.id,
        name: item.name,
        type: item.type,
        ...(item.categoryId === undefined ? {} : { categoryId: item.categoryId }),
        state: item.state,
        quantity: activeLots.reduce((total, lot) => total + lot.quantity, 0),
        unit: item.unit ?? activeLots[0]?.unit ?? "each",
        locationNames,
        ...(expirations[0] === undefined ? {} : { nextExpiration: expirations[0] })
      };
    }),
    assets: source.assets.map((asset) => {
      const tagCount = source.assetTags.filter((tag) => tag.assetId === asset.id).length;
      const locationName =
        asset.locationId === undefined ? undefined : locationsById.get(asset.locationId)?.name;

      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        state: asset.state,
        ...(asset.locationId === undefined ? {} : { locationId: asset.locationId }),
        ...(locationName === undefined ? {} : { locationName }),
        tagCount
      };
    }),
    kits: source.kits.map((kit) => {
      const locationName = kit.locationId === undefined ? undefined : locationsById.get(kit.locationId)?.name;

      return {
        id: kit.id,
        name: kit.name,
        state: kit.state,
        ...(kit.locationId === undefined ? {} : { locationId: kit.locationId }),
        ...(locationName === undefined ? {} : { locationName })
      };
    }),
    acquisitionNeeds: rollupAcquisitionNeeds(seed, activeQuestIds, source),
    maintenanceDue: source.maintenanceDue,
    assetTags: source.assetTags
  };
}

export async function createAssetTagQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
    width: 180
  });
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

function emptyInventorySource(): InventoryDashboardSource {
  return {
    locations: [],
    locationProgression: [],
    items: [],
    lots: [],
    assets: [],
    assetTags: [],
    kits: [],
    maintenanceDue: []
  };
}

function requiredQuest(quests: Map<string, QuestTemplate>, questId: string): QuestTemplate {
  const quest = quests.get(questId);

  if (quest === undefined) {
    throw new Error(`Unknown quest ${questId}.`);
  }

  return quest;
}
