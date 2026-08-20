import type {
  BadgeTemplate,
  BadgeTier,
  BasecampSeed,
  BillOfMaterialsItem,
  CapabilityLevel,
  CapabilityLevelNumber,
  Criticality,
  MilestoneTemplate,
  OutpostTemplate,
  PreparednessCategory,
  PursuitState,
  QuestPriority,
  QuestTaxonomy,
  QuestTemplate,
  ReadinessBias
} from "./model";

export interface BasecampSeedInput {
  schemaVersion: string;
  generatedOn: string;
  categories: PreparednessCategoryInput[];
  levels: CapabilityLevelInput[];
  quests: QuestTemplateInput[];
  badges: BadgeTemplateInput[];
  outposts: OutpostTemplateInput[];
  milestones: MilestoneTemplateInput[];
}

export interface PreparednessCategoryInput {
  id: string;
  name: string;
  description: string;
  criticality: string;
  defaultPursuitState: string;
}

export interface CapabilityLevelInput {
  id: string;
  number: number;
  name: string;
  duration: string;
  description: string;
}

export interface QuestTemplateInput {
  id: string;
  title: string;
  categoryId: string;
  targetLevel: number;
  taxonomy: string[];
  estimatedMinutes: number;
  estimatedCostUsd: number;
  xp: number;
  priority: string;
  whyItMatters: string;
  validation: string;
  dependencies?: string[];
  accomplishments?: string[];
  frictionGoal?: {
    targetClicks: number;
    manualFields: string[];
    inferredFields: string[];
    automation: string[];
  };
  bom?: BillOfMaterialsItemInput[];
}

export interface BillOfMaterialsItemInput {
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

export interface BadgeTemplateInput {
  id: string;
  name: string;
  categoryId: string;
  tiers: string[];
  artDirection: string;
  readinessBias: string;
}

export interface OutpostTemplateInput {
  id: string;
  name: string;
  categoryId: string;
  requirements: string[];
}

export interface MilestoneTemplateInput {
  id: string;
  name: string;
  description: string;
  requirements: string[];
}

const criticalities = ["critical", "important", "supporting"] as const;
const pursuitStates = [
  "active",
  "interested",
  "later",
  "paused",
  "not_currently_pursuing"
] as const;
const questTaxonomies = [
  "acquire",
  "build",
  "configure",
  "drill",
  "inspection",
  "inventory",
  "knowledge",
  "learn",
  "loadout",
  "maintenance",
  "offline-reference",
  "practice",
  "quick-win",
  "skill",
  "test",
  "validation"
] as const;
const questPriorities = ["low", "medium", "high"] as const;
const badgeTiers = ["bronze", "silver", "gold", "platinum", "master"] as const;
const readinessBiases = [
  "validation",
  "test",
  "configuration_and_drill",
  "practice",
  "training_and_supplies",
  "build_and_repair",
  "inventory_and_maintenance",
  "cross_category_validation"
] as const;
const levelNumbers = [0, 1, 2, 3, 4, 5] as const;

export function defineSeedDataset(input: BasecampSeedInput): BasecampSeed {
  return {
    schemaVersion: input.schemaVersion,
    generatedOn: input.generatedOn,
    categories: input.categories.map(mapCategory),
    levels: input.levels.map(mapLevel),
    quests: input.quests.map(mapQuest),
    badges: input.badges.map(mapBadge),
    outposts: input.outposts.map(mapOutpost),
    milestones: input.milestones.map(mapMilestone)
  };
}

function mapCategory(input: PreparednessCategoryInput): PreparednessCategory {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    criticality: parseEnum<Criticality>(
      "category criticality",
      input.criticality,
      criticalities
    ),
    defaultPursuitState: parseEnum<PursuitState>(
      "category pursuit state",
      input.defaultPursuitState,
      pursuitStates
    )
  };
}

function mapLevel(input: CapabilityLevelInput): CapabilityLevel {
  return {
    id: input.id,
    number: parseEnum<CapabilityLevelNumber>(
      "capability level",
      input.number,
      levelNumbers
    ),
    name: input.name,
    duration: input.duration,
    description: input.description
  };
}

function mapQuest(input: QuestTemplateInput): QuestTemplate {
  const quest: QuestTemplate = {
    id: input.id,
    title: input.title,
    categoryId: input.categoryId,
    targetLevel: parseEnum<CapabilityLevelNumber>(
      "quest target level",
      input.targetLevel,
      levelNumbers
    ),
    taxonomy: input.taxonomy.map((taxonomy) =>
      parseEnum<QuestTaxonomy>("quest taxonomy", taxonomy, questTaxonomies)
    ),
    estimatedMinutes: input.estimatedMinutes,
    estimatedCostUsd: input.estimatedCostUsd,
    xp: input.xp,
    priority: parseEnum<QuestPriority>(
      "quest priority",
      input.priority,
      questPriorities
    ),
    whyItMatters: input.whyItMatters,
    validation: input.validation
  };

  if (input.dependencies !== undefined) {
    quest.dependencies = input.dependencies;
  }

  if (input.accomplishments !== undefined) {
    quest.accomplishments = input.accomplishments;
  }

  if (input.frictionGoal !== undefined) {
    quest.frictionGoal = input.frictionGoal;
  }

  if (input.bom !== undefined) {
    quest.bom = input.bom.map(mapBomItem);
  }

  return quest;
}

function mapBomItem(input: BillOfMaterialsItemInput): BillOfMaterialsItem {
  const item: BillOfMaterialsItem = {
    functionalRequirement: input.functionalRequirement,
    quantity: input.quantity,
    required: input.required,
    acceptableAlternatives: input.acceptableAlternatives
  };

  if (input.specification !== undefined) {
    item.specification = input.specification;
  }

  if (input.purpose !== undefined) {
    item.purpose = input.purpose;
  }

  if (input.estimatedCostUsd !== undefined) {
    item.estimatedCostUsd = input.estimatedCostUsd;
  }

  if (input.consumable !== undefined) {
    item.consumable = input.consumable;
  }

  if (input.replacementInterval !== undefined) {
    item.replacementInterval = input.replacementInterval;
  }

  if (input.standardizationNotes !== undefined) {
    item.standardizationNotes = input.standardizationNotes;
  }

  return item;
}

function mapBadge(input: BadgeTemplateInput): BadgeTemplate {
  return {
    id: input.id,
    name: input.name,
    categoryId: input.categoryId,
    tiers: input.tiers.map((tier) =>
      parseEnum<BadgeTier>("badge tier", tier, badgeTiers)
    ),
    artDirection: input.artDirection,
    readinessBias: parseEnum<ReadinessBias>(
      "badge readiness bias",
      input.readinessBias,
      readinessBiases
    )
  };
}

function mapOutpost(input: OutpostTemplateInput): OutpostTemplate {
  return {
    id: input.id,
    name: input.name,
    categoryId: input.categoryId,
    requirements: input.requirements
  };
}

function mapMilestone(input: MilestoneTemplateInput): MilestoneTemplate {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    requirements: input.requirements
  };
}

function parseEnum<T extends string | number>(
  label: string,
  value: string | number,
  allowed: readonly T[]
): T {
  if ((allowed as readonly (string | number)[]).includes(value)) {
    return value as T;
  }

  throw new Error(
    `Invalid ${label}: ${String(value)}. Expected one of ${allowed.join(", ")}.`
  );
}
