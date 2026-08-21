import type { DashboardSummary, InventoryDashboardSummary, QuestSummary } from "@basecamp/api";
import { slugify, type MaintenanceEvent, type QuestAction } from "@basecamp/domain";

export type MobileRoute = "home" | "capture" | "scan" | "quests" | "inventory" | "offline";

export const mobileRoutes = [
  "home",
  "capture",
  "scan",
  "quests",
  "inventory",
  "offline"
] as const satisfies readonly MobileRoute[];

export type OfflineEntityType =
  | "inventory"
  | "maintenance"
  | "quest"
  | "asset"
  | "evidence"
  | "drill"
  | "skill"
  | "failure";

export type OfflineCommandStatus = "pending" | "sent" | "acknowledged" | "failed" | "conflict";

export type OfflineCommandIntent =
  | {
      type: "inventory.adjust_quantity";
      source: "quick_capture" | "barcode" | "manual" | "sync";
      itemName?: string;
      itemId?: string;
      quantityDelta: number;
      unit?: string;
      locationName?: string;
      expiresAt?: string;
      notes?: string;
      barcode?: string;
    }
  | {
      type: "maintenance.complete";
      policyId?: string;
      assetId?: string;
      assetName?: string;
      outcome: MaintenanceEvent["outcome"];
      notes?: string;
    }
  | {
      type: "quest.set_status";
      questId?: string;
      questTitle?: string;
      action: QuestAction;
      notes?: string;
    }
  | {
      type: "asset.inspect" | "asset.maintain" | "asset.view_instructions";
      assetId: string;
      notes?: string;
    }
  | {
      type: "asset.move";
      assetId: string;
      locationName: string;
      notes?: string;
    }
  | {
      type: "asset.adjust_quantity";
      assetId: string;
      quantityDelta: number;
      unit?: string;
      notes?: string;
    }
  | {
      type: "asset.report_issue";
      assetId: string;
      issue: string;
      notes?: string;
    }
  | {
      type: "drill.record";
      drillName: string;
      outcome: "completed" | "failed" | "partial";
      notes?: string;
    }
  | {
      type: "skill.record";
      skillName: string;
      outcome: "practiced" | "validated";
      notes?: string;
    }
  | {
      type: "failure.report";
      subject: string;
      issue: string;
      notes?: string;
    }
  | {
      type: "evidence.attach";
      entityType: OfflineEntityType;
      entityId: string;
      evidenceKind: "photo" | "document" | "note" | "scan";
      localUri?: string;
      notes?: string;
    };

export interface OfflineCommand {
  commandId: string;
  clientId: string;
  localSequence: number;
  createdAt: string;
  entityType: OfflineEntityType;
  intent: OfflineCommandIntent;
  entityId?: string;
  entityVersion?: number;
}

export interface QueuedOfflineCommand {
  command: OfflineCommand;
  status: OfflineCommandStatus;
  retryCount: number;
  updatedAt: string;
  lastError?: string;
}

export interface CommandOutbox {
  clientId: string;
  nextSequence: number;
  queued: QueuedOfflineCommand[];
}

export interface OfflineReadModel {
  generatedAt: string;
  cursor?: string;
  activeQuests: QuestSummary[];
  inventory: InventoryDashboardSummary;
  criticalBoms: DashboardSummary["inventory"]["acquisitionNeeds"];
  maintenance: DashboardSummary["inventory"]["maintenanceDue"];
  references: Array<{
    id: string;
    title: string;
    kind: "quest" | "asset" | "maintenance" | "inventory";
  }>;
}

export interface ConfirmationField {
  label: string;
  value: string;
}

export interface ConfirmationCard {
  title: string;
  summary: string;
  commandActionLabel: string;
  fields: ConfirmationField[];
}

export interface QuickCaptureParseResult {
  rawText: string;
  intentKind: OfflineCommandIntent["type"];
  confidence: "high" | "medium" | "low";
  command: OfflineCommand;
  confirmationCard: ConfirmationCard;
}

export type ScanKind = "qr" | "barcode";

export type AssetScanAction =
  | "inspect"
  | "maintain"
  | "move"
  | "adjust_quantity"
  | "report_issue"
  | "view_instructions";

export interface ScanInput {
  kind: ScanKind;
  value: string;
}

export interface ScanWorkflow {
  scanKind: ScanKind;
  target: "asset" | "inventory_barcode" | "unknown";
  title: string;
  offlineBehavior: "open_cached_asset" | "queue_inventory_confirmation" | "manual_review";
  assetId?: string;
  barcode?: string;
  confirmationCard?: ConfirmationCard;
  availableAssetActions: AssetScanAction[];
  command?: OfflineCommand;
}

export type ConflictPolicy =
  | "clean_apply"
  | "idempotent_duplicate"
  | "merge_additive_inventory_quantity"
  | "append_maintenance_event"
  | "append_evidence"
  | "user_visible_conflict";

export interface SyncCommandDecision {
  commandId: string;
  outcome: "accepted" | "duplicate" | "conflict";
  policy: ConflictPolicy;
  userVisible: boolean;
  reason: string;
}

export interface SyncConflict {
  id: string;
  commandId: string;
  entityType: OfflineEntityType;
  entityId?: string;
  policy: ConflictPolicy;
  reason: string;
  userVisible: boolean;
}

export interface SyncCommandResult {
  commandId: string;
  status: "accepted" | "duplicate" | "conflict" | "rejected";
  policy: ConflictPolicy;
  cursor?: string;
  message: string;
}

export interface SyncBatchRequest {
  clientId: string;
  sinceCursor?: string;
  commands: OfflineCommand[];
}

export interface SyncBatchResponse {
  clientId: string;
  nextCursor: string;
  accepted: SyncCommandResult[];
  conflicts: SyncConflict[];
}

export function createOfflineReadModel(
  dashboard: DashboardSummary,
  options: { generatedAt: string; cursor?: string }
): OfflineReadModel {
  const criticalBoms = dashboard.inventory.acquisitionNeeds.filter(
    (need) => need.required && need.state !== "already_owned" && need.state !== "substituted"
  );

  return {
    generatedAt: options.generatedAt,
    ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    activeQuests: dashboard.activeQuests,
    inventory: dashboard.inventory,
    criticalBoms,
    maintenance: dashboard.inventory.maintenanceDue,
    references: [
      ...dashboard.activeQuests.map((quest) => ({
        id: quest.id,
        title: quest.title,
        kind: "quest" as const
      })),
      ...dashboard.inventory.assets.map((asset) => ({
        id: asset.id,
        title: asset.name,
        kind: "asset" as const
      })),
      ...dashboard.inventory.maintenanceDue.map((maintenance) => ({
        id: maintenance.policyId,
        title: maintenance.title,
        kind: "maintenance" as const
      })),
      ...dashboard.inventory.items.map((item) => ({
        id: item.id,
        title: item.name,
        kind: "inventory" as const
      }))
    ]
  };
}

export function createCommandOutbox(clientId: string): CommandOutbox {
  return {
    clientId,
    nextSequence: 1,
    queued: []
  };
}

export function enqueueCommand(
  outbox: CommandOutbox,
  draft: Omit<OfflineCommand, "commandId" | "clientId" | "localSequence" | "createdAt"> & {
    createdAt?: string;
  },
  now = new Date().toISOString()
): { outbox: CommandOutbox; queued: QueuedOfflineCommand } {
  const command = createOfflineCommand({
    clientId: outbox.clientId,
    localSequence: outbox.nextSequence,
    createdAt: draft.createdAt ?? now,
    entityType: draft.entityType,
    intent: draft.intent,
    ...(draft.entityId === undefined ? {} : { entityId: draft.entityId }),
    ...(draft.entityVersion === undefined ? {} : { entityVersion: draft.entityVersion })
  });
  const queued: QueuedOfflineCommand = {
    command,
    status: "pending",
    retryCount: 0,
    updatedAt: now
  };

  return {
    queued,
    outbox: {
      ...outbox,
      nextSequence: outbox.nextSequence + 1,
      queued: [...outbox.queued, queued]
    }
  };
}

export function createOfflineCommand(input: {
  clientId: string;
  localSequence: number;
  createdAt: string;
  entityType: OfflineEntityType;
  intent: OfflineCommandIntent;
  entityId?: string;
  entityVersion?: number;
}): OfflineCommand {
  return {
    commandId: `${input.clientId}-${String(input.localSequence).padStart(6, "0")}`,
    clientId: input.clientId,
    localSequence: input.localSequence,
    createdAt: input.createdAt,
    entityType: input.entityType,
    intent: input.intent,
    ...(input.entityId === undefined ? {} : { entityId: input.entityId }),
    ...(input.entityVersion === undefined ? {} : { entityVersion: input.entityVersion })
  };
}

export function serializeOutbox(outbox: CommandOutbox): string {
  return JSON.stringify(outbox);
}

export function restoreOutbox(serialized: string): CommandOutbox {
  const parsed = JSON.parse(serialized) as CommandOutbox;

  return {
    clientId: parsed.clientId,
    nextSequence: parsed.nextSequence,
    queued: parsed.queued
  };
}

export function markCommandAcknowledged(
  outbox: CommandOutbox,
  commandId: string,
  now = new Date().toISOString()
): CommandOutbox {
  return updateQueuedCommand(outbox, commandId, { status: "acknowledged", updatedAt: now });
}

export function markCommandFailed(
  outbox: CommandOutbox,
  commandId: string,
  error: string,
  now = new Date().toISOString()
): CommandOutbox {
  return {
    ...outbox,
    queued: outbox.queued.map((queued) =>
      queued.command.commandId === commandId
        ? {
            ...queued,
            status: "failed",
            retryCount: queued.retryCount + 1,
            lastError: error,
            updatedAt: now
          }
        : queued
    )
  };
}

export function parseQuickCapture(
  rawText: string,
  options: { clientId?: string; localSequence?: number; now?: string } = {}
): QuickCaptureParseResult {
  const text = rawText.trim();
  const normalized = normalize(text);
  const now = options.now ?? new Date().toISOString();
  const clientId = options.clientId ?? "quick-capture";
  const localSequence = options.localSequence ?? 1;
  const inventoryMatch = normalized.match(
    /^(?:bought|purchased|added|stored)\s+([a-z0-9.]+)\s+([a-z]+)\s+(?:of\s+)?(.+)$/
  );

  if (inventoryMatch) {
    const quantity = quantityFromText(inventoryMatch[1] ?? "1");
    const unit = inventoryMatch[2] ?? "each";
    const itemName = titleCase(inventoryMatch[3] ?? "item");
    const intent: OfflineCommandIntent = {
      type: "inventory.adjust_quantity",
      source: "quick_capture",
      itemName,
      quantityDelta: quantity,
      unit,
      locationName: "Unassigned"
    };

    return parseResult(text, "inventory", intent, clientId, localSequence, now, {
      title: `Add ${itemName}`,
      summary: `Increase inventory by ${quantity} ${unit}.`,
      commandActionLabel: "Add inventory",
      fields: [
        { label: "Item", value: itemName },
        { label: "Quantity", value: String(quantity) },
        { label: "Unit", value: unit }
      ]
    });
  }

  const maintenanceMatch = normalized.match(/^(?:changed|replaced|inspected|tested)\s+(.+)$/);

  if (maintenanceMatch) {
    const subject = titleCase(maintenanceMatch[1] ?? "maintenance");
    const intent: OfflineCommandIntent = {
      type: "maintenance.complete",
      policyId: `maintenance-policy-${slugify(subject)}`,
      assetName: subject,
      outcome: "passed",
      notes: text
    };

    return parseResult(text, "maintenance", intent, clientId, localSequence, now, {
      title: `Record ${subject}`,
      summary: "Complete the matching maintenance policy.",
      commandActionLabel: "Record maintenance",
      fields: [{ label: "Maintenance", value: subject }]
    });
  }

  const drillMatch = normalized.match(/^(?:ran|completed|practiced)\s+(.+)\s+drill$/);

  if (drillMatch) {
    const drillName = titleCase(`${drillMatch[1] ?? "field"} drill`);
    const intent: OfflineCommandIntent = {
      type: "drill.record",
      drillName,
      outcome: "completed",
      notes: text
    };

    return parseResult(text, "drill", intent, clientId, localSequence, now, {
      title: `Record ${drillName}`,
      summary: "Save drill completion for sync.",
      commandActionLabel: "Record drill",
      fields: [{ label: "Drill", value: drillName }]
    });
  }

  const skillMatch = normalized.match(/^(?:practiced|trained|validated)\s+(.+)$/);

  if (skillMatch) {
    const skillName = titleCase(skillMatch[1] ?? "skill");
    const intent: OfflineCommandIntent = {
      type: "skill.record",
      skillName,
      outcome: normalized.startsWith("validated") ? "validated" : "practiced",
      notes: text
    };

    return parseResult(text, "skill", intent, clientId, localSequence, now, {
      title: `Record ${skillName}`,
      summary: "Save skill progress for sync.",
      commandActionLabel: "Record skill",
      fields: [{ label: "Skill", value: skillName }]
    });
  }

  const questMatch = normalized.match(/^(?:completed|finished|started)\s+(.+)$/);

  if (questMatch) {
    const questTitle = titleCase(questMatch[1] ?? "quest");
    const action: QuestAction = normalized.startsWith("started") ? "start" : "complete";
    const intent: OfflineCommandIntent = {
      type: "quest.set_status",
      questTitle,
      action,
      notes: text
    };

    return parseResult(text, "quest", intent, clientId, localSequence, now, {
      title: `${titleCase(action)} ${questTitle}`,
      summary: "Queue quest progress for sync.",
      commandActionLabel: "Update quest",
      fields: [{ label: "Quest", value: questTitle }]
    });
  }

  const failureMatch = normalized.match(/^(.+)\s+(?:failed|broke|would not|could not)\s*(.*)$/);

  if (failureMatch) {
    const subject = titleCase(failureMatch[1] ?? "asset");
    const issue = titleCase(failureMatch[2]?.trim() || "failed");
    const intent: OfflineCommandIntent = {
      type: "failure.report",
      subject,
      issue,
      notes: text
    };

    return parseResult(text, "failure", intent, clientId, localSequence, now, {
      title: `Report ${subject}`,
      summary: "Queue a failure report for review.",
      commandActionLabel: "Report issue",
      fields: [
        { label: "Subject", value: subject },
        { label: "Issue", value: issue }
      ]
    });
  }

  const intent: OfflineCommandIntent = {
    type: "evidence.attach",
    entityType: "evidence",
    entityId: "manual-review",
    evidenceKind: "note",
    notes: text
  };

  return parseResult(text, "evidence", intent, clientId, localSequence, now, {
    title: "Review note",
    summary: "Save note for manual classification.",
    commandActionLabel: "Save note",
    fields: [{ label: "Note", value: text }]
  }, "low");
}

export function createScanWorkflow(
  input: ScanInput,
  options: { clientId?: string; localSequence?: number; now?: string } = {}
): ScanWorkflow {
  const now = options.now ?? new Date().toISOString();
  const clientId = options.clientId ?? "scan";
  const localSequence = options.localSequence ?? 1;

  if (input.kind === "qr") {
    const assetId = assetIdFromQrPayload(input.value);

    if (assetId !== undefined) {
      return {
        scanKind: "qr",
        target: "asset",
        title: `Asset ${assetId}`,
        offlineBehavior: "open_cached_asset",
        assetId,
        availableAssetActions: [
          "inspect",
          "maintain",
          "move",
          "adjust_quantity",
          "report_issue",
          "view_instructions"
        ]
      };
    }
  }

  if (input.kind === "barcode" && /^[0-9A-Za-z.-]{6,32}$/.test(input.value)) {
    const intent: OfflineCommandIntent = {
      type: "inventory.adjust_quantity",
      source: "barcode",
      itemName: `Barcode ${input.value}`,
      quantityDelta: 1,
      unit: "each",
      locationName: "Unassigned",
      barcode: input.value
    };
    const command = createOfflineCommand({
      clientId,
      localSequence,
      createdAt: now,
      entityType: "inventory",
      intent
    });

    return {
      scanKind: "barcode",
      target: "inventory_barcode",
      title: `Barcode ${input.value}`,
      offlineBehavior: "queue_inventory_confirmation",
      barcode: input.value,
      availableAssetActions: [],
      command,
      confirmationCard: {
        title: "Add barcode item",
        summary: "Confirm the item details before syncing inventory.",
        commandActionLabel: "Confirm inventory",
        fields: [
          { label: "Barcode", value: input.value },
          { label: "Quantity", value: "1" }
        ]
      }
    };
  }

  return {
    scanKind: input.kind,
    target: "unknown",
    title: "Unknown scan",
    offlineBehavior: "manual_review",
    availableAssetActions: []
  };
}

export function createAssetActionCommand(
  assetId: string,
  action: AssetScanAction,
  options: {
    clientId: string;
    localSequence: number;
    now: string;
    locationName?: string;
    quantityDelta?: number;
    notes?: string;
  }
): OfflineCommand {
  const intent = assetActionIntent(assetId, action, options);

  return createOfflineCommand({
    clientId: options.clientId,
    localSequence: options.localSequence,
    createdAt: options.now,
    entityType: "asset",
    entityId: assetId,
    intent
  });
}

export function resolveOfflineCommandConflict(
  command: OfflineCommand,
  state: {
    duplicateCommandIds?: string[];
    currentEntityVersion?: number;
  } = {}
): SyncCommandDecision {
  if ((state.duplicateCommandIds ?? []).includes(command.commandId)) {
    return {
      commandId: command.commandId,
      outcome: "duplicate",
      policy: "idempotent_duplicate",
      userVisible: false,
      reason: "Command was already accepted."
    };
  }

  const hasVersionConflict =
    command.entityVersion !== undefined &&
    state.currentEntityVersion !== undefined &&
    command.entityVersion !== state.currentEntityVersion;

  if (!hasVersionConflict) {
    return {
      commandId: command.commandId,
      outcome: "accepted",
      policy: "clean_apply",
      userVisible: false,
      reason: "Command applies cleanly."
    };
  }

  if (command.intent.type === "inventory.adjust_quantity" || command.intent.type === "asset.adjust_quantity") {
    return {
      commandId: command.commandId,
      outcome: "accepted",
      policy: "merge_additive_inventory_quantity",
      userVisible: false,
      reason: "Quantity changes merge additively."
    };
  }

  if (command.intent.type === "maintenance.complete" || command.intent.type === "asset.maintain") {
    return {
      commandId: command.commandId,
      outcome: "accepted",
      policy: "append_maintenance_event",
      userVisible: false,
      reason: "Maintenance events append and next due is recalculated."
    };
  }

  if (command.intent.type === "evidence.attach") {
    return {
      commandId: command.commandId,
      outcome: "accepted",
      policy: "append_evidence",
      userVisible: false,
      reason: "Evidence attachments append to the target entity."
    };
  }

  return {
    commandId: command.commandId,
    outcome: "conflict",
    policy: "user_visible_conflict",
    userVisible: true,
    reason: "The target changed since capture and needs review."
  };
}

function parseResult(
  rawText: string,
  entityType: OfflineEntityType,
  intent: OfflineCommandIntent,
  clientId: string,
  localSequence: number,
  now: string,
  confirmationCard: ConfirmationCard,
  confidence: QuickCaptureParseResult["confidence"] = "high"
): QuickCaptureParseResult {
  const entityId = entityIdForIntent(intent);

  return {
    rawText,
    intentKind: intent.type,
    confidence,
    command: createOfflineCommand({
      clientId,
      localSequence,
      createdAt: now,
      entityType,
      ...(entityId === undefined ? {} : { entityId }),
      intent
    }),
    confirmationCard
  };
}

function assetActionIntent(
  assetId: string,
  action: AssetScanAction,
  options: { locationName?: string; quantityDelta?: number; notes?: string }
): OfflineCommandIntent {
  if (action === "move") {
    return {
      type: "asset.move",
      assetId,
      locationName: options.locationName ?? "Unassigned",
      ...(options.notes === undefined ? {} : { notes: options.notes })
    };
  }

  if (action === "adjust_quantity") {
    return {
      type: "asset.adjust_quantity",
      assetId,
      quantityDelta: options.quantityDelta ?? 1,
      ...(options.notes === undefined ? {} : { notes: options.notes })
    };
  }

  if (action === "report_issue") {
    return {
      type: "asset.report_issue",
      assetId,
      issue: options.notes ?? "Issue found",
      ...(options.notes === undefined ? {} : { notes: options.notes })
    };
  }

  return {
    type:
      action === "maintain"
        ? "asset.maintain"
        : action === "view_instructions"
          ? "asset.view_instructions"
          : "asset.inspect",
    assetId,
    ...(options.notes === undefined ? {} : { notes: options.notes })
  };
}

function updateQueuedCommand(
  outbox: CommandOutbox,
  commandId: string,
  patch: Pick<QueuedOfflineCommand, "status" | "updatedAt">
): CommandOutbox {
  return {
    ...outbox,
    queued: outbox.queued.map((queued) =>
      queued.command.commandId === commandId ? { ...queued, ...patch } : queued
    )
  };
}

function entityIdForIntent(intent: OfflineCommandIntent): string | undefined {
  if ("assetId" in intent && intent.assetId !== undefined) {
    return intent.assetId;
  }

  if ("policyId" in intent && intent.policyId !== undefined) {
    return intent.policyId;
  }

  if ("questId" in intent && intent.questId !== undefined) {
    return intent.questId;
  }

  if ("itemId" in intent && intent.itemId !== undefined) {
    return intent.itemId;
  }

  return undefined;
}

function assetIdFromQrPayload(value: string): string | undefined {
  const match =
    value.match(/^basecamp:\/\/assets\/([^/?#]+)$/) ??
    value.match(/^https?:\/\/[^/]+\/assets\/([^/?#]+)$/) ??
    value.match(/\/assets\/([^/?#]+)$/);

  return match?.[1] === undefined ? undefined : decodeURIComponent(match[1]);
}

function quantityFromText(value: string): number {
  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    twelve: 12
  };

  return words[value] ?? 1;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}
