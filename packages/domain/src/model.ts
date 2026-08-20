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
  capabilityState: CapabilityStateSnapshot;
}

export type SkillState =
  | "untrained"
  | "familiar"
  | "practiced"
  | "competent"
  | "validated"
  | "advanced";

export interface SkillProgress {
  skillId: SkillId;
  state: SkillState;
  evidence?: EvidenceReference[];
  lastPracticedAt?: string;
  validatedAt?: string;
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
