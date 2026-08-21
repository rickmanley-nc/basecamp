export type BasecampId = string;
export type CategoryId = BasecampId;
export type QuestId = BasecampId;
export type BadgeId = BasecampId;
export type OutpostId = BasecampId;
export type MilestoneId = BasecampId;
export type AssetId = BasecampId;
export type InventoryItemId = BasecampId;
export type EvidenceId = BasecampId;
export type MaintenancePolicyId = BasecampId;
export type SkillId = BasecampId;
export type DrillId = BasecampId;
export type LocationId = BasecampId;
export type InventoryLotId = BasecampId;
export type InventoryEventId = BasecampId;
export type KitId = BasecampId;
export type AssetTagId = BasecampId;

export type Criticality = "critical" | "important" | "supporting";

export type PursuitState =
  | "active"
  | "interested"
  | "later"
  | "paused"
  | "not_currently_pursuing";

export type CapabilityLevelNumber = 0 | 1 | 2 | 3 | 4 | 5;

export interface PreparednessCategory {
  id: CategoryId;
  name: string;
  description: string;
  criticality: Criticality;
  defaultPursuitState: PursuitState;
}

export interface CapabilityLevel {
  id: BasecampId;
  number: CapabilityLevelNumber;
  name: string;
  duration: string;
  description: string;
}

export type QuestTaxonomy =
  | "acquire"
  | "build"
  | "configure"
  | "drill"
  | "inspection"
  | "inventory"
  | "knowledge"
  | "learn"
  | "loadout"
  | "maintenance"
  | "offline-reference"
  | "practice"
  | "quick-win"
  | "skill"
  | "test"
  | "validation";

export type QuestPriority = "low" | "medium" | "high";

export type QuestStatus =
  | "available"
  | "saved"
  | "active"
  | "paused"
  | "snoozed"
  | "ignored"
  | "abandoned"
  | "complete"
  | "reopened";

export type QuestAction =
  | "save"
  | "start"
  | "pause"
  | "resume"
  | "snooze"
  | "abandon"
  | "complete"
  | "reopen";

export type DependencyType =
  | "knowledge"
  | "skill"
  | "equipment"
  | "supply"
  | "tool"
  | "machinery"
  | "drill"
  | "validation"
  | "optional_recommendation";

export type CapabilityContributionState =
  | "planned"
  | "needed"
  | "owned"
  | "installed"
  | "configured"
  | "learned"
  | "practiced"
  | "tested"
  | "validated"
  | "maintained"
  | "failed"
  | "expired"
  | "retired";

export interface CapabilityStateSnapshot {
  owned: boolean;
  configured: boolean;
  tested: boolean;
  validated: boolean;
  maintained: boolean;
}

export interface QuestFrictionGoal {
  targetClicks: number;
  manualFields: string[];
  inferredFields: string[];
  automation: string[];
}

export interface BillOfMaterialsItem {
  functionalRequirement: string;
  quantity: string | number;
  required: boolean;
  acceptableAlternatives: string[];
  specification?: string;
  purpose?: string;
  estimatedCostUsd?: number;
  consumable?: boolean;
  replacementInterval?: string;
  standardizationNotes?: string;
}

export interface InventoryReference {
  itemId?: InventoryItemId;
  assetId?: AssetId;
  categoryId?: CategoryId;
  requiredState: CapabilityContributionState;
  quantity?: string | number;
  locationHint?: string;
}

export type EvidenceKind =
  | "photo"
  | "document"
  | "note"
  | "scan"
  | "checklist"
  | "measurement"
  | "drill-result"
  | "training-record";

export interface EvidenceReference {
  id?: EvidenceId;
  kind: EvidenceKind;
  required: boolean;
  description: string;
}

export type EvidenceLinkEntityType =
  | "quest"
  | "accomplishment"
  | "skill"
  | "drill"
  | "asset"
  | "maintenance"
  | "inventory_event";

export interface EvidenceLink {
  entityType: EvidenceLinkEntityType;
  entityId: BasecampId;
}

export interface EvidenceMetadata {
  capturedAt: string;
  fileName?: string;
  mimeType?: string;
  byteSize?: number;
  localUri?: string;
  contentHash?: string;
  width?: number;
  height?: number;
  notes?: string;
}

export type EvidenceStatus = "active" | "superseded" | "deleted";

export interface EvidenceRecord {
  id: EvidenceId;
  kind: EvidenceKind;
  title: string;
  links: EvidenceLink[];
  metadata: EvidenceMetadata;
  status: EvidenceStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  supersedesEvidenceId?: EvidenceId;
  deletionReason?: string;
}

export interface MaintenanceReference {
  policyId?: MaintenancePolicyId;
  assetId?: AssetId;
  itemId?: InventoryItemId;
  cadence: string;
  nextDueBehavior: "manual" | "auto_calculated";
  completionState: Extract<
    CapabilityContributionState,
    "maintained" | "tested" | "failed"
  >;
}

export interface AccomplishmentTemplate {
  id: BasecampId;
  title: string;
  categoryId: CategoryId;
  targetLevel: CapabilityLevelNumber;
  taxonomy: QuestTaxonomy[];
  requiredStates: CapabilityContributionState[];
  inventory?: InventoryReference[];
  evidence?: EvidenceReference[];
  maintenance?: MaintenanceReference[];
  validation: string;
}

export interface QuestTemplate {
  id: QuestId;
  title: string;
  categoryId: CategoryId;
  targetLevel: CapabilityLevelNumber;
  taxonomy: QuestTaxonomy[];
  estimatedMinutes: number;
  estimatedCostUsd: number;
  xp: number;
  priority: QuestPriority;
  whyItMatters: string;
  validation: string;
  dependencies?: QuestId[];
  accomplishments?: string[];
  frictionGoal?: QuestFrictionGoal;
  bom?: BillOfMaterialsItem[];
}

export interface QuestInstance {
  id: BasecampId;
  templateId: QuestId;
  status: QuestStatus;
  selectedByUser: boolean;
  categoryPursuitState: PursuitState;
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  snoozedUntil?: string;
}

export interface QuestLifecycleEvent {
  id: BasecampId;
  templateId: QuestId;
  action: QuestAction;
  fromStatus: QuestStatus;
  toStatus: QuestStatus;
  reason: string;
  occurredAt: string;
}

export interface QuestLifecycleResult {
  instance: QuestInstance;
  event: QuestLifecycleEvent;
}

export interface CategoryPursuitSnapshot {
  categoryId: CategoryId;
  pursuitState: PursuitState;
  updatedAt?: string;
}

export interface XpEvent {
  id: BasecampId;
  sourceType: "quest" | "badge" | "capability_outpost" | "milestone";
  sourceId: BasecampId;
  reason: string;
  xpAwarded: number;
  occurredAt: string;
}

export interface HouseholdProgressSnapshot {
  completedQuestIds?: QuestId[];
  questInstances?: QuestInstance[];
  categoryPursuits?: CategoryPursuitSnapshot[];
  failedValidationQuestIds?: QuestId[];
  maintenanceRequiredQuestIds?: QuestId[];
  maintenanceRequiredCategoryIds?: CategoryId[];
  interestCategoryIds?: CategoryId[];
  xpEvents?: XpEvent[];
  skillProgress?: SkillProgress[];
  drillRuns?: DrillRun[];
  evidenceRecords?: EvidenceRecord[];
}

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "master";

export type ReadinessBias =
  | "validation"
  | "test"
  | "configuration_and_drill"
  | "practice"
  | "training_and_supplies"
  | "build_and_repair"
  | "inventory_and_maintenance"
  | "cross_category_validation";

export interface BadgeTemplate {
  id: BadgeId;
  name: string;
  categoryId: CategoryId;
  tiers: BadgeTier[];
  artDirection: string;
  readinessBias: ReadinessBias;
}

// Capability outposts are category achievements. Physical location outposts
// are modeled by inventory/location work.
export interface OutpostTemplate {
  id: OutpostId;
  name: string;
  categoryId: CategoryId;
  requirements: string[];
}

export interface MilestoneTemplate {
  id: MilestoneId;
  name: string;
  description: string;
  requirements: string[];
}

export type InventoryItemType =
  | "consumable_supply"
  | "durable_equipment"
  | "tool"
  | "machinery"
  | "medical_item"
  | "power_asset"
  | "communications_asset"
  | "container"
  | "kit"
  | "document"
  | "fuel"
  | "water_storage"
  | "food_storage"
  | "spare_part";

export type InventoryState =
  | "planned"
  | "need_to_acquire"
  | "owned"
  | "located"
  | "installed"
  | "configured"
  | "tested"
  | "validated"
  | "in_service"
  | "maintenance_due"
  | "maintained"
  | "failed"
  | "retired"
  | "expired";

export interface InventoryItem {
  id: InventoryItemId;
  name: string;
  type: InventoryItemType;
  categoryId?: CategoryId;
  state: InventoryState;
  functionalRequirement?: string;
  unit?: string;
  capabilityState: CapabilityStateSnapshot;
}

export type LocationKind =
  | "home"
  | "family_home"
  | "work"
  | "vehicle"
  | "room"
  | "storage"
  | "cache"
  | "field"
  | "other";

export type LocationMaturity = "known_location" | "stash" | "outpost" | "basecamp" | "home_base";

export interface Location {
  id: LocationId;
  name: string;
  kind: LocationKind;
  maturity: LocationMaturity;
  notes?: string;
}

export interface LocationRelationship {
  id: BasecampId;
  parentLocationId: LocationId;
  childLocationId: LocationId;
  relationship: "contains" | "near" | "supports" | "fallback_for";
}

export interface LocationReadiness {
  locationId: LocationId;
  categoryId: CategoryId;
  score: number;
  status: "unknown" | "building" | "validated" | "maintenance_due" | "failed";
  sourceCapabilityOutpostId?: OutpostId;
  validatedAt?: string;
}

export interface InventoryLot {
  id: InventoryLotId;
  itemId: InventoryItemId;
  locationId: LocationId;
  quantity: number;
  unit: string;
  state: InventoryState;
  expiresAt?: string;
  acquiredAt?: string;
  notes?: string;
}

export interface Asset {
  id: AssetId;
  name: string;
  type: InventoryItemType;
  state: InventoryState;
  locationId?: LocationId;
  itemId?: InventoryItemId;
  categoryId?: CategoryId;
  serialNumber?: string;
  notes?: string;
}

export interface AssetTag {
  id: AssetTagId;
  assetId: AssetId;
  tagCode: string;
  qrPayload: string;
  lookupPath: string;
  printLabel: string;
  createdAt: string;
}

export interface Kit {
  id: KitId;
  name: string;
  locationId?: LocationId;
  categoryId?: CategoryId;
  state: InventoryState;
  notes?: string;
}

export interface KitItem {
  id: BasecampId;
  kitId: KitId;
  itemId: InventoryItemId;
  requiredQuantity: number;
  presentQuantity: number;
  required: boolean;
  state: InventoryState;
  notes?: string;
}

export type InventoryEventType =
  | "add"
  | "remove"
  | "move"
  | "consume"
  | "expire"
  | "inspect"
  | "fail"
  | "adjust"
  | "tag";

export interface InventoryEvent {
  id: InventoryEventId;
  eventType: InventoryEventType;
  itemId?: InventoryItemId;
  assetId?: AssetId;
  lotId?: InventoryLotId;
  fromLocationId?: LocationId;
  toLocationId?: LocationId;
  quantityDelta?: number;
  unit?: string;
  stateAfter?: InventoryState;
  notes?: string;
  occurredAt: string;
}

export type AcquisitionState =
  | "already_owned"
  | "need_to_purchase"
  | "need_to_make"
  | "need_to_build"
  | "need_to_replenish"
  | "optional"
  | "substituted";

export interface AcquisitionNeed {
  id: BasecampId;
  questId: QuestId;
  questTitle: string;
  categoryId: CategoryId;
  functionalRequirement: string;
  quantity: string | number;
  required: boolean;
  state: AcquisitionState;
  acceptableAlternatives: string[];
  specification?: string;
  estimatedCostUsd?: number;
  replacementInterval?: string;
  matchedItemIds: InventoryItemId[];
}

export type MaintenanceRecurrenceUnit = "day" | "week" | "month" | "year";

export interface MaintenancePolicy {
  id: MaintenancePolicyId;
  name: string;
  scopeType: "asset" | "item" | "location" | "category";
  intervalCount: number;
  intervalUnit: MaintenanceRecurrenceUnit;
  active: boolean;
  assetId?: AssetId;
  itemId?: InventoryItemId;
  locationId?: LocationId;
  categoryId?: CategoryId;
  lastCompletedAt?: string;
  nextDueAt?: string;
  instructions?: string;
}

export type MaintenanceEventType = "completed" | "failed" | "inspection" | "replacement" | "skipped";

export interface MaintenanceEvent {
  id: BasecampId;
  policyId: MaintenancePolicyId;
  eventType: MaintenanceEventType;
  outcome: "passed" | "issue_found" | "failed" | "skipped";
  occurredAt: string;
  nextDueAt?: string;
  notes?: string;
  followUpQuestTitle?: string;
}

export interface MaintenanceDueItem {
  policyId: MaintenancePolicyId;
  title: string;
  dueAt: string;
  status: "upcoming" | "due" | "overdue";
  scopeLabel: string;
  followUpQuestTitle?: string;
}

export type SkillState =
  | "untrained"
  | "familiar"
  | "practiced"
  | "competent"
  | "validated"
  | "advanced";

export interface TrainingRecord {
  id: BasecampId;
  skillId: SkillId;
  courseName: string;
  completedAt: string;
  provider?: string;
  expiresAt?: string;
  evidenceIds?: EvidenceId[];
  notes?: string;
}

export interface SkillProgress {
  skillId: SkillId;
  name?: string;
  categoryId?: CategoryId;
  state: SkillState;
  trainingRecords?: TrainingRecord[];
  evidenceIds?: EvidenceId[];
  evidence?: EvidenceReference[];
  lastPracticedAt?: string;
  validatedAt?: string;
  expiresAt?: string;
}

export interface DrillSuccessCriterion {
  id: BasecampId;
  label: string;
  required: boolean;
}

export interface DrillTemplate {
  id: DrillId;
  title: string;
  categoryId: CategoryId;
  scenario: string;
  estimatedMinutes: number;
  successCriteria: DrillSuccessCriterion[];
  evidence?: EvidenceReference[];
  recommendedQuestIds?: QuestId[];
}

export interface DrillCriterionResult {
  criterionId: BasecampId;
  passed: boolean;
  notes?: string;
}

export interface FollowUpQuestSuggestion {
  id: BasecampId;
  title: string;
  categoryId: CategoryId;
  reason: string;
  sourceType: "drill" | "skill" | "validation" | "maintenance" | "gap_report";
  sourceId: BasecampId;
}

export type DrillRunResult = "passed" | "partial" | "failed";

export interface DrillRun {
  id: BasecampId;
  templateId: DrillId;
  categoryId: CategoryId;
  result: DrillRunResult;
  startedAt?: string;
  completedAt: string;
  criteriaResults: DrillCriterionResult[];
  failures: string[];
  lessons?: string;
  evidenceIds?: EvidenceId[];
  followUpQuestSuggestions: FollowUpQuestSuggestion[];
}

export interface BasecampSeed {
  schemaVersion: string;
  generatedOn: string;
  categories: PreparednessCategory[];
  levels: CapabilityLevel[];
  quests: QuestTemplate[];
  badges: BadgeTemplate[];
  outposts: OutpostTemplate[];
  milestones: MilestoneTemplate[];
}
