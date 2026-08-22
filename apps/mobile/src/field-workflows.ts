import type { DashboardSummary, EvidenceUploadRequest } from "@basecamp/api";
import type { QuestAction } from "@basecamp/domain";
import {
  createAssetActionCommand,
  createOfflineCommand,
  createCommandOutbox,
  createOfflineReadModel,
  createScanWorkflow,
  enqueueCommand,
  markCommandFailed,
  mobileRoutes,
  parseQuickCapture,
  restoreOutbox,
  serializeOutbox,
  type AssetScanAction,
  type CommandOutbox,
  type MobileRoute,
  type OfflineCommand,
  type OfflineReadModel,
  type ScanInput,
  type ScanWorkflow,
  type SyncBatchResponse
} from "@basecamp/sync";

export type MobileFieldScreenKind = MobileRoute;

export interface MobileFieldScreen {
  route: MobileFieldScreenKind;
  label: string;
  title: string;
  primaryAction: string;
  offlineCapable: boolean;
}

export interface MobileFieldSession {
  clientId: string;
  serverUrl: string;
  token: string;
  readModel: ReturnType<typeof createOfflineReadModel>;
  outbox: CommandOutbox;
  screens: MobileFieldScreen[];
}

export interface MobileQueuedCommandResult {
  outbox: CommandOutbox;
  command: OfflineCommand;
  title: string;
  summary: string;
}

export interface MobilePendingEvidenceUpload {
  localId: string;
  kind: EvidenceUploadRequest["kind"];
  entityType: EvidenceUploadRequest["link"]["entityType"];
  entityId: string;
  title: string;
  fileName: string;
  contentType: string;
  localUri: string;
  capturedAt: string;
  notes?: string;
  uploadedStorageKey?: string;
  uploadStatus: "pending" | "uploaded" | "failed";
  lastError?: string;
}

export interface MobileFieldValidationSnapshot {
  rows: Array<{ label: string; value: string }>;
  pendingCommands: number;
  conflictCommands: number;
  pendingEvidence: number;
  uploadedEvidence: number;
  retryableEvidence: number;
}

export function createMobileFieldSession(input: {
  summary: DashboardSummary;
  clientId: string;
  serverUrl: string;
  token: string;
  generatedAt: string;
  cursor?: string;
  restoredOutbox?: CommandOutbox;
}): MobileFieldSession {
  return {
    clientId: input.clientId,
    serverUrl: input.serverUrl,
    token: input.token,
    readModel: createOfflineReadModel(input.summary, {
      generatedAt: input.generatedAt,
      ...(input.cursor === undefined ? {} : { cursor: input.cursor })
    }),
    outbox: input.restoredOutbox ?? createCommandOutbox(input.clientId),
    screens: createMobileFieldScreens()
  };
}

export function createMobileFieldValidationSnapshot(input: {
  readModel: OfflineReadModel;
  outbox: CommandOutbox;
  pendingEvidence: MobilePendingEvidenceUpload[];
}): MobileFieldValidationSnapshot {
  const queuedCommands = input.outbox.queued.filter(
    (queued) => queued.status === "pending" || queued.status === "failed" || queued.status === "conflict"
  );
  const conflictCommands = queuedCommands.filter((queued) => queued.status === "conflict").length;
  const pendingEvidence = input.pendingEvidence.filter((upload) => upload.uploadStatus !== "uploaded");
  const uploadedEvidence = input.pendingEvidence.filter((upload) => upload.uploadStatus === "uploaded");

  return {
    rows: [
      { label: "Active Quests", value: String(input.readModel.activeQuests.length) },
      { label: "Inventory Items", value: String(input.readModel.inventory.items.length) },
      { label: "Critical BOMs", value: String(input.readModel.criticalBoms.length) },
      { label: "Maintenance", value: String(input.readModel.maintenance.length) },
      { label: "References", value: String(input.readModel.references.length) }
    ],
    pendingCommands: queuedCommands.length,
    conflictCommands,
    pendingEvidence: pendingEvidence.length,
    uploadedEvidence: uploadedEvidence.length,
    retryableEvidence: pendingEvidence.length
  };
}

export function createMobileFieldScreens(): MobileFieldScreen[] {
  return mobileRoutes.map((route) => {
    if (route === "home") {
      return {
        route,
        label: "Home",
        title: "Today",
        primaryAction: "Review cached work",
        offlineCapable: true
      };
    }

    if (route === "capture") {
      return {
        route,
        label: "Capture",
        title: "Quick Capture",
        primaryAction: "Queue field command",
        offlineCapable: true
      };
    }

    if (route === "scan") {
      return {
        route,
        label: "Scan",
        title: "Scan Asset Or Barcode",
        primaryAction: "Open camera scanner",
        offlineCapable: true
      };
    }

    if (route === "quests") {
      return {
        route,
        label: "Quests",
        title: "Active Quests",
        primaryAction: "Update quest progress",
        offlineCapable: true
      };
    }

    if (route === "inventory") {
      return {
        route,
        label: "Inventory",
        title: "Inventory",
        primaryAction: "Review and adjust items",
        offlineCapable: true
      };
    }

    return {
      route,
      label: "Offline",
      title: "Offline Queue",
      primaryAction: "Sync pending commands",
      offlineCapable: true
    };
  });
}

export function queueQuickCaptureCommand(
  outbox: CommandOutbox,
  rawText: string,
  now = new Date().toISOString()
): MobileQueuedCommandResult {
  const parsed = parseQuickCapture(rawText, {
    clientId: outbox.clientId,
    localSequence: outbox.nextSequence,
    now
  });
  const result = enqueueCommand(outbox, parsed.command, now);

  return {
    outbox: result.outbox,
    command: result.queued.command,
    title: parsed.confirmationCard.title,
    summary: parsed.confirmationCard.summary
  };
}

export function previewScanWorkflow(
  outbox: CommandOutbox,
  input: ScanInput,
  now = new Date().toISOString()
): ScanWorkflow {
  return createScanWorkflow(input, {
    clientId: outbox.clientId,
    localSequence: outbox.nextSequence,
    now
  });
}

export function queueScanCommand(
  outbox: CommandOutbox,
  input: ScanInput,
  now = new Date().toISOString()
): MobileQueuedCommandResult | undefined {
  const workflow = previewScanWorkflow(outbox, input, now);

  if (workflow.command === undefined || workflow.confirmationCard === undefined) {
    return undefined;
  }

  const result = enqueueCommand(outbox, workflow.command, now);

  return {
    outbox: result.outbox,
    command: result.queued.command,
    title: workflow.confirmationCard.title,
    summary: workflow.confirmationCard.summary
  };
}

export function queueAssetActionCommand(input: {
  outbox: CommandOutbox;
  assetId: string;
  action: AssetScanAction;
  now?: string;
  locationName?: string;
  quantityDelta?: number;
  notes?: string;
}): MobileQueuedCommandResult {
  const now = input.now ?? new Date().toISOString();
  const command = createAssetActionCommand(input.assetId, input.action, {
    clientId: input.outbox.clientId,
    localSequence: input.outbox.nextSequence,
    now,
    ...(input.locationName === undefined ? {} : { locationName: input.locationName }),
    ...(input.quantityDelta === undefined ? {} : { quantityDelta: input.quantityDelta }),
    ...(input.notes === undefined ? {} : { notes: input.notes })
  });
  const result = enqueueCommand(input.outbox, command, now);

  return {
    outbox: result.outbox,
    command: result.queued.command,
    title: `Queue ${input.action.replace(/_/g, " ")}`,
    summary: `Asset ${input.assetId} action queued for sync.`
  };
}

export function queueQuestStatusCommand(input: {
  outbox: CommandOutbox;
  questId: string;
  questTitle: string;
  action: QuestAction;
  now?: string;
  notes?: string;
}): MobileQueuedCommandResult {
  const now = input.now ?? new Date().toISOString();
  const command = createOfflineCommand({
    clientId: input.outbox.clientId,
    localSequence: input.outbox.nextSequence,
    createdAt: now,
    entityType: "quest",
    entityId: input.questId,
    intent: {
      type: "quest.set_status",
      questId: input.questId,
      questTitle: input.questTitle,
      action: input.action,
      ...(input.notes === undefined ? {} : { notes: input.notes })
    }
  });
  const result = enqueueCommand(input.outbox, command, now);

  return {
    outbox: result.outbox,
    command: result.queued.command,
    title: `${titleCase(input.action)} ${input.questTitle}`,
    summary: `${input.questTitle} queued for sync.`
  };
}

export function createPendingEvidenceUpload(input: {
  kind: MobilePendingEvidenceUpload["kind"];
  entityType: MobilePendingEvidenceUpload["entityType"];
  entityId: string;
  title: string;
  fileName: string;
  contentType: string;
  localUri: string;
  capturedAt: string;
  notes?: string;
}): MobilePendingEvidenceUpload {
  const localId = `pending-evidence-${sanitizeStableId(`${input.capturedAt}-${input.fileName}`)}`;

  return {
    localId,
    kind: input.kind,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    fileName: sanitizeFileName(input.fileName),
    contentType: input.contentType,
    localUri: input.localUri,
    capturedAt: input.capturedAt,
    ...(input.notes === undefined ? {} : { notes: input.notes }),
    uploadStatus: "pending"
  };
}

export function createEvidenceUploadRequest(
  pending: MobilePendingEvidenceUpload,
  base64: string
): EvidenceUploadRequest {
  return {
    kind: pending.kind,
    title: pending.title,
    link: {
      entityType: pending.entityType,
      entityId: pending.entityId
    },
    fileName: pending.fileName,
    contentType: pending.contentType,
    base64,
    capturedAt: pending.capturedAt,
    ...(pending.notes === undefined ? {} : { notes: pending.notes })
  };
}

export function createSyncBatchRequest(outbox: CommandOutbox, sinceCursor?: string) {
  return {
    clientId: outbox.clientId,
    ...(sinceCursor === undefined ? {} : { sinceCursor }),
    commands: outbox.queued
      .filter((queued) => queued.status === "pending" || queued.status === "failed")
      .map((queued) => queued.command)
  };
}

export function applyMobileSyncResponse(
  outbox: CommandOutbox,
  response: SyncBatchResponse,
  now = new Date().toISOString()
): CommandOutbox {
  const acknowledged = new Set(
    response.accepted
      .filter((result) => result.status === "accepted" || result.status === "duplicate")
      .map((result) => result.commandId)
  );
  const conflicts = new Map(response.conflicts.map((conflict) => [conflict.commandId, conflict.reason]));

  return {
    ...outbox,
    queued: outbox.queued.map((queued) => {
      if (acknowledged.has(queued.command.commandId)) {
        const { lastError: _lastError, ...rest } = queued;

        return {
          ...rest,
          status: "acknowledged",
          updatedAt: now
        };
      }

      const conflictReason = conflicts.get(queued.command.commandId);

      if (conflictReason !== undefined) {
        return {
          ...queued,
          status: "conflict",
          updatedAt: now,
          lastError: conflictReason
        };
      }

      return queued;
    })
  };
}

export function markMobileSyncFailure(outbox: CommandOutbox, error: string, now = new Date().toISOString()) {
  return outbox.queued.reduce(
    (current, queued) =>
      queued.status === "pending" || queued.status === "failed"
        ? markCommandFailed(current, queued.command.commandId, error, now)
        : current,
    outbox
  );
}

export function serializeMobileOutbox(outbox: CommandOutbox): string {
  return serializeOutbox(outbox);
}

export function restoreMobileOutbox(serialized: string, fallbackClientId: string): CommandOutbox {
  try {
    return restoreOutbox(serialized);
  } catch {
    return createCommandOutbox(fallbackClientId);
  }
}

export function routeForScannedCode(data: string): ScanInput {
  return {
    kind: data.startsWith("basecamp://") || data.includes("/assets/") ? "qr" : "barcode",
    value: data
  };
}

export function defaultEvidenceLink(): {
  entityType: EvidenceUploadRequest["link"]["entityType"];
  entityId: string;
} {
  return {
    entityType: "quest",
    entityId: "manual-review"
  };
}

function sanitizeFileName(fileName: string): string {
  const safe = fileName.trim().replace(/[\\/]+/g, "-").replace(/[^A-Za-z0-9._-]+/g, "-");

  return safe.replace(/^-+|-+$/g, "") || "evidence.bin";
}

function sanitizeStableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
