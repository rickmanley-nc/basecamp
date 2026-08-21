import type {
  AcquisitionNeed,
  AcquisitionState,
  Asset,
  AssetId,
  AssetTag,
  BasecampId,
  BasecampSeed,
  BillOfMaterialsItem,
  InventoryItem,
  InventoryLot,
  Kit,
  Location,
  LocationId,
  LocationMaturity,
  LocationReadiness,
  MaintenanceDueItem,
  MaintenanceEvent,
  MaintenanceEventType,
  MaintenancePolicy,
  QuestTemplate
} from "./model";

export const locationMaturityOrder = [
  "known_location",
  "stash",
  "outpost",
  "basecamp",
  "home_base"
] as const satisfies readonly LocationMaturity[];

const availableInventoryStates = new Set([
  "owned",
  "located",
  "installed",
  "configured",
  "tested",
  "validated",
  "in_service",
  "maintained"
]);

export interface LocationProgressionInput {
  location: Location;
  inventoryItems: InventoryItem[];
  inventoryLots: InventoryLot[];
  assets: Asset[];
  kits: Kit[];
  readiness: LocationReadiness[];
  maintenanceDue: MaintenanceDueItem[];
  activeMaintenancePolicyCount?: number;
}

export interface LocationProgressionResult {
  locationId: LocationId;
  locationName: string;
  maturity: LocationMaturity;
  previousMaturity: LocationMaturity;
  categoryCount: number;
  inventoryCount: number;
  assetCount: number;
  kitCount: number;
  validatedCategoryCount: number;
  activeMaintenancePolicyCount: number;
  linkedCapabilityOutpostIds: BasecampId[];
  missingForNext: string[];
}

export interface InventoryRollupState {
  items: InventoryItem[];
  lots: InventoryLot[];
}

export interface AssetTagInput {
  assetId: AssetId;
  now: string;
  baseUrl?: string;
  tagCode?: string;
}

export interface MaintenanceCompletionOptions {
  now: string;
  eventType?: MaintenanceEventType;
  outcome?: MaintenanceEvent["outcome"];
  notes?: string;
}

export function compareLocationMaturity(a: LocationMaturity, b: LocationMaturity): number {
  return locationMaturityOrder.indexOf(a) - locationMaturityOrder.indexOf(b);
}

export function calculateLocationProgression(
  input: LocationProgressionInput
): LocationProgressionResult {
  const relevantLots = input.inventoryLots.filter(
    (lot) => lot.locationId === input.location.id && lot.quantity > 0 && isAvailableState(lot.state)
  );
  const itemById = new Map(input.inventoryItems.map((item) => [item.id, item]));
  const lotCategoryIds = relevantLots
    .map((lot) => itemById.get(lot.itemId)?.categoryId)
    .filter((categoryId): categoryId is string => categoryId !== undefined);
  const relevantAssets = input.assets.filter(
    (asset) => asset.locationId === input.location.id && isAvailableState(asset.state)
  );
  const relevantKits = input.kits.filter(
    (kit) => kit.locationId === input.location.id && isAvailableState(kit.state)
  );
  const relevantReadiness = input.readiness.filter(
    (readiness) => readiness.locationId === input.location.id
  );
  const activeReadiness = relevantReadiness.filter(
    (readiness) => readiness.status === "building" || readiness.status === "validated"
  );
  const validatedReadiness = relevantReadiness.filter((readiness) => readiness.status === "validated");
  const categoryIds = new Set([
    ...lotCategoryIds,
    ...relevantAssets
      .map((asset) => asset.categoryId)
      .filter((categoryId): categoryId is string => categoryId !== undefined),
    ...relevantKits
      .map((kit) => kit.categoryId)
      .filter((categoryId): categoryId is string => categoryId !== undefined),
    ...activeReadiness.map((readiness) => readiness.categoryId)
  ]);
  const linkedCapabilityOutpostIds = relevantReadiness
    .map((readiness) => readiness.sourceCapabilityOutpostId)
    .filter((outpostId): outpostId is string => outpostId !== undefined);
  const inventoryCount = relevantLots.length;
  const assetCount = relevantAssets.length;
  const kitCount = relevantKits.length;
  const activeMaintenancePolicyCount = input.activeMaintenancePolicyCount ?? 0;
  const hasOverdueMaintenance = input.maintenanceDue.some((item) => item.status === "overdue");
  const metrics = {
    categoryCount: categoryIds.size,
    inventoryCount,
    assetCount,
    kitCount,
    validatedCategoryCount: validatedReadiness.length,
    activeMaintenancePolicyCount,
    hasOverdueMaintenance
  };
  const maturity = deriveLocationMaturity(metrics);

  return {
    locationId: input.location.id,
    locationName: input.location.name,
    maturity,
    previousMaturity: input.location.maturity,
    categoryCount: metrics.categoryCount,
    inventoryCount,
    assetCount,
    kitCount,
    validatedCategoryCount: metrics.validatedCategoryCount,
    activeMaintenancePolicyCount,
    linkedCapabilityOutpostIds,
    missingForNext: missingForNextLocationMaturity(metrics, maturity)
  };
}

export function deriveLocationMaturity(metrics: {
  categoryCount: number;
  inventoryCount: number;
  assetCount: number;
  kitCount: number;
  validatedCategoryCount: number;
  activeMaintenancePolicyCount: number;
  hasOverdueMaintenance: boolean;
}): LocationMaturity {
  const stockedObjectCount = metrics.inventoryCount + metrics.assetCount + metrics.kitCount;
  const maintenanceHealthy = !metrics.hasOverdueMaintenance;

  if (
    metrics.categoryCount >= 4 &&
    stockedObjectCount >= 6 &&
    metrics.assetCount + metrics.kitCount >= 2 &&
    metrics.validatedCategoryCount >= 2 &&
    metrics.activeMaintenancePolicyCount >= 2 &&
    maintenanceHealthy
  ) {
    return "home_base";
  }

  if (
    metrics.categoryCount >= 3 &&
    metrics.assetCount >= 1 &&
    metrics.kitCount >= 1 &&
    metrics.activeMaintenancePolicyCount >= 1 &&
    maintenanceHealthy
  ) {
    return "basecamp";
  }

  if (metrics.categoryCount >= 2 && metrics.assetCount + metrics.kitCount >= 1 && maintenanceHealthy) {
    return "outpost";
  }

  if (stockedObjectCount >= 1) {
    return "stash";
  }

  return "known_location";
}

export function rollupAcquisitionNeeds(
  seed: BasecampSeed,
  activeQuestIds: string[],
  inventory: InventoryRollupState
): AcquisitionNeed[] {
  const activeQuestIdSet = new Set(activeQuestIds);

  return seed.quests
    .filter((quest) => activeQuestIdSet.has(quest.id))
    .flatMap((quest) =>
      (quest.bom ?? []).map((bomItem, index) =>
        toAcquisitionNeed(quest, bomItem, inventory, `${quest.id}-bom-${index + 1}`)
      )
    );
}

export function calculateNextMaintenanceDue(policy: MaintenancePolicy, fromIso: string): string {
  const dueDate = new Date(fromIso);

  if (Number.isNaN(dueDate.valueOf())) {
    throw new Error(`Invalid maintenance date ${fromIso}.`);
  }

  if (policy.intervalUnit === "day") {
    dueDate.setUTCDate(dueDate.getUTCDate() + policy.intervalCount);
  } else if (policy.intervalUnit === "week") {
    dueDate.setUTCDate(dueDate.getUTCDate() + policy.intervalCount * 7);
  } else if (policy.intervalUnit === "month") {
    dueDate.setUTCMonth(dueDate.getUTCMonth() + policy.intervalCount);
  } else {
    dueDate.setUTCFullYear(dueDate.getUTCFullYear() + policy.intervalCount);
  }

  return dueDate.toISOString();
}

export function completeMaintenancePolicy(
  policy: MaintenancePolicy,
  options: MaintenanceCompletionOptions
): { policy: MaintenancePolicy; event: MaintenanceEvent } {
  const outcome = options.outcome ?? "passed";
  const eventType = options.eventType ?? (outcome === "failed" ? "failed" : "completed");
  const nextDueAt =
    outcome === "skipped" ? policy.nextDueAt : calculateNextMaintenanceDue(policy, options.now);
  const followUpQuestTitle =
    outcome === "failed" || outcome === "issue_found"
      ? `Resolve maintenance issue: ${policy.name}`
      : undefined;
  const event: MaintenanceEvent = {
    id: `maintenance-event-${policy.id}-${slugify(options.now)}`,
    policyId: policy.id,
    eventType,
    outcome,
    occurredAt: options.now,
    ...(nextDueAt === undefined ? {} : { nextDueAt }),
    ...(options.notes === undefined ? {} : { notes: options.notes }),
    ...(followUpQuestTitle === undefined ? {} : { followUpQuestTitle })
  };
  const updatedPolicy: MaintenancePolicy = {
    ...policy,
    lastCompletedAt: options.now,
    ...(nextDueAt === undefined ? {} : { nextDueAt })
  };

  return {
    policy: updatedPolicy,
    event
  };
}

export function maintenanceDueStatus(
  dueAt: string,
  nowIso: string,
  dueSoonDays = 7
): MaintenanceDueItem["status"] {
  const due = new Date(dueAt).valueOf();
  const now = new Date(nowIso).valueOf();
  const dueSoon = now + dueSoonDays * 24 * 60 * 60 * 1000;

  if (due < now) {
    return "overdue";
  }

  return due <= dueSoon ? "due" : "upcoming";
}

export function createAssetTag(input: AssetTagInput): AssetTag {
  const lookupPath = `/assets/${encodeURIComponent(input.assetId)}`;
  const baseUrl = input.baseUrl?.replace(/\/$/, "");
  const qrPayload = baseUrl === undefined ? `basecamp://assets/${encodeURIComponent(input.assetId)}` : `${baseUrl}${lookupPath}`;
  const tagCode = input.tagCode ?? `BC-${stableHash(input.assetId).toUpperCase()}`;

  return {
    id: `asset-tag-${tagCode.toLowerCase()}`,
    assetId: input.assetId,
    tagCode,
    qrPayload,
    lookupPath,
    printLabel: `${tagCode} · ${input.assetId}`,
    createdAt: input.now
  };
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "item" : slug;
}

function toAcquisitionNeed(
  quest: QuestTemplate,
  bomItem: BillOfMaterialsItem,
  inventory: InventoryRollupState,
  id: string
): AcquisitionNeed {
  const matching = findMatchingInventory(bomItem, inventory);
  const state = acquisitionStateFor(quest, bomItem, matching);

  return {
    id,
    questId: quest.id,
    questTitle: quest.title,
    categoryId: quest.categoryId,
    functionalRequirement: bomItem.functionalRequirement,
    quantity: bomItem.quantity,
    required: bomItem.required,
    state,
    acceptableAlternatives: bomItem.acceptableAlternatives,
    ...(bomItem.specification === undefined ? {} : { specification: bomItem.specification }),
    ...(bomItem.estimatedCostUsd === undefined ? {} : { estimatedCostUsd: bomItem.estimatedCostUsd }),
    ...(bomItem.replacementInterval === undefined ? {} : { replacementInterval: bomItem.replacementInterval }),
    matchedItemIds: matching.items.map((item) => item.id)
  };
}

function acquisitionStateFor(
  quest: QuestTemplate,
  bomItem: BillOfMaterialsItem,
  matching: ReturnType<typeof findMatchingInventory>
): AcquisitionState {
  if (!bomItem.required && matching.availableQuantity === 0) {
    return "optional";
  }

  if (matching.availableQuantity >= numericQuantity(bomItem.quantity)) {
    return matching.substituted ? "substituted" : "already_owned";
  }

  if (matching.expiredQuantity > 0) {
    return "need_to_replenish";
  }

  const searchable = normalizeText(`${bomItem.functionalRequirement} ${bomItem.specification ?? ""}`);

  if (searchable.includes("make") || searchable.includes("sew") || searchable.includes("assemble")) {
    return "need_to_make";
  }

  if (quest.taxonomy.includes("build") || quest.taxonomy.includes("loadout")) {
    return "need_to_build";
  }

  return "need_to_purchase";
}

function findMatchingInventory(bomItem: BillOfMaterialsItem, inventory: InventoryRollupState): {
  availableQuantity: number;
  expiredQuantity: number;
  items: InventoryItem[];
  substituted: boolean;
} {
  const requirement = normalizeText(bomItem.functionalRequirement);
  const alternatives = bomItem.acceptableAlternatives.map(normalizeText);
  const itemById = new Map(inventory.items.map((item) => [item.id, item]));
  const matchingItems = inventory.items.filter((item) => {
    const haystack = normalizeText(`${item.name} ${item.functionalRequirement ?? ""}`);
    return haystack.includes(requirement) || alternatives.some((alternative) => haystack.includes(alternative));
  });
  const matchingItemIds = new Set(matchingItems.map((item) => item.id));
  const lots = inventory.lots.filter((lot) => matchingItemIds.has(lot.itemId));
  const availableQuantity = lots
    .filter((lot) => isAvailableState(lot.state))
    .reduce((total, lot) => total + lot.quantity, 0);
  const expiredQuantity = lots
    .filter((lot) => lot.state === "expired")
    .reduce((total, lot) => total + lot.quantity, 0);
  const substituted = lots.some((lot) => {
    const item = itemById.get(lot.itemId);
    const haystack = normalizeText(`${item?.name ?? ""} ${item?.functionalRequirement ?? ""}`);
    return alternatives.some((alternative) => haystack.includes(alternative)) && !haystack.includes(requirement);
  });

  return {
    availableQuantity,
    expiredQuantity,
    items: matchingItems,
    substituted
  };
}

function missingForNextLocationMaturity(
  metrics: {
    categoryCount: number;
    inventoryCount: number;
    assetCount: number;
    kitCount: number;
    validatedCategoryCount: number;
    activeMaintenancePolicyCount: number;
    hasOverdueMaintenance: boolean;
  },
  maturity: LocationMaturity
): string[] {
  if (maturity === "home_base") {
    return [];
  }

  if (maturity === "known_location") {
    return ["Add at least one located inventory lot, asset, or kit."];
  }

  if (maturity === "stash") {
    return [
      "Cover at least two preparedness categories.",
      "Add at least one durable asset or kit.",
      "Clear overdue maintenance."
    ].filter((message) =>
      message.startsWith("Cover")
        ? metrics.categoryCount < 2
        : message.startsWith("Add")
          ? metrics.assetCount + metrics.kitCount < 1
          : metrics.hasOverdueMaintenance
    );
  }

  if (maturity === "outpost") {
    return [
      "Cover at least three preparedness categories.",
      "Keep at least one durable asset and one kit there.",
      "Activate at least one recurring maintenance policy.",
      "Clear overdue maintenance."
    ].filter((message) =>
      message.startsWith("Cover")
        ? metrics.categoryCount < 3
        : message.startsWith("Keep")
          ? metrics.assetCount < 1 || metrics.kitCount < 1
          : message.startsWith("Activate")
            ? metrics.activeMaintenancePolicyCount < 1
            : metrics.hasOverdueMaintenance
    );
  }

  return [
    "Cover at least four preparedness categories.",
    "Track at least six stocked inventory lots, assets, or kits.",
    "Validate at least two location categories.",
    "Activate at least two recurring maintenance policies.",
    "Clear overdue maintenance."
  ].filter((message) =>
    message.startsWith("Cover")
      ? metrics.categoryCount < 4
      : message.startsWith("Track")
        ? metrics.inventoryCount + metrics.assetCount + metrics.kitCount < 6
        : message.startsWith("Validate")
          ? metrics.validatedCategoryCount < 2
          : message.startsWith("Activate")
            ? metrics.activeMaintenancePolicyCount < 2
            : metrics.hasOverdueMaintenance
  );
}

function numericQuantity(quantity: string | number): number {
  if (typeof quantity === "number") {
    return quantity;
  }

  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : 1;
}

function isAvailableState(state: string): boolean {
  return availableInventoryStates.has(state);
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 7);
}
