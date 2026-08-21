import type {
  PursuitState,
  QuestAction,
  QuestInstance,
  QuestLifecycleEvent,
  QuestLifecycleResult,
  QuestStatus,
  QuestTemplate
} from "./model";

export const questActions = [
  "save",
  "start",
  "pause",
  "resume",
  "snooze",
  "abandon",
  "complete",
  "reopen"
] as const satisfies readonly QuestAction[];

export interface QuestActionOptions {
  now?: string;
  reason?: string;
  snoozedUntil?: string;
  categoryPursuitState?: PursuitState;
  progressPercent?: number;
}

export interface QuestBucketSummary {
  available: QuestInstance[];
  saved: QuestInstance[];
  active: QuestInstance[];
  paused: QuestInstance[];
  snoozed: QuestInstance[];
  ignored: QuestInstance[];
  abandoned: QuestInstance[];
  complete: QuestInstance[];
  reopened: QuestInstance[];
}

export function createAvailableQuestInstance(
  template: QuestTemplate,
  categoryPursuitState: PursuitState
): QuestInstance {
  return {
    id: `quest-instance-${template.id}`,
    templateId: template.id,
    status: "available",
    selectedByUser: false,
    categoryPursuitState,
    progressPercent: 0
  };
}

export function applyQuestAction(
  template: QuestTemplate,
  current: QuestInstance | undefined,
  action: QuestAction,
  options: QuestActionOptions = {}
): QuestLifecycleResult {
  const now = options.now ?? new Date().toISOString();
  const categoryPursuitState = options.categoryPursuitState ?? current?.categoryPursuitState ?? "active";
  const base = current ?? createAvailableQuestInstance(template, categoryPursuitState);
  const toStatus = nextQuestStatus(base.status, action);

  if (toStatus === undefined) {
    throw new Error(`Cannot ${action} quest ${template.id} from ${base.status}.`);
  }

  const progressPercent = nextProgressPercent(base.progressPercent, action, options.progressPercent);
  const selectedByUser = action === "abandon" ? base.selectedByUser : true;
  const startedAt = base.startedAt ?? (toStatus === "active" || toStatus === "complete" ? now : undefined);
  const completedAt = toStatus === "complete" ? now : undefined;
  const snoozedUntil =
    toStatus === "snoozed"
      ? options.snoozedUntil ?? defaultSnoozedUntil(now)
      : undefined;

  const instance: QuestInstance = {
    id: base.id,
    templateId: template.id,
    status: toStatus,
    selectedByUser,
    categoryPursuitState,
    progressPercent,
    ...(startedAt === undefined ? {} : { startedAt }),
    ...(completedAt === undefined ? {} : { completedAt }),
    ...(snoozedUntil === undefined ? {} : { snoozedUntil })
  };

  const event: QuestLifecycleEvent = {
    id: `${template.id}-${action}-${now.replaceAll(/[^0-9A-Za-z]/g, "")}`,
    templateId: template.id,
    action,
    fromStatus: base.status,
    toStatus,
    reason: options.reason ?? defaultActionReason(action),
    occurredAt: now
  };

  return { instance, event };
}

export function listQuestBuckets(instances: QuestInstance[]): QuestBucketSummary {
  const buckets: QuestBucketSummary = {
    available: [],
    saved: [],
    active: [],
    paused: [],
    snoozed: [],
    ignored: [],
    abandoned: [],
    complete: [],
    reopened: []
  };

  for (const instance of instances) {
    buckets[instance.status].push(instance);
  }

  return buckets;
}

export function isQuestSelectable(status: QuestStatus): boolean {
  return status === "available" || status === "saved" || status === "paused" || status === "snoozed" || status === "reopened";
}

function nextQuestStatus(status: QuestStatus, action: QuestAction): QuestStatus | undefined {
  if (action === "save") {
    return status === "available" || status === "snoozed" || status === "reopened" ? "saved" : undefined;
  }

  if (action === "start") {
    return isQuestSelectable(status) ? "active" : undefined;
  }

  if (action === "pause") {
    return status === "active" || status === "reopened" ? "paused" : undefined;
  }

  if (action === "resume") {
    return status === "paused" || status === "snoozed" || status === "reopened" ? "active" : undefined;
  }

  if (action === "snooze") {
    return status === "available" || status === "saved" || status === "active" || status === "paused" || status === "reopened"
      ? "snoozed"
      : undefined;
  }

  if (action === "abandon") {
    return status === "available" || status === "saved" || status === "active" || status === "paused" || status === "snoozed" || status === "reopened"
      ? "abandoned"
      : undefined;
  }

  if (action === "complete") {
    return status === "active" || status === "reopened" ? "complete" : undefined;
  }

  return status === "complete" || status === "abandoned" ? "reopened" : undefined;
}

function nextProgressPercent(
  current: number,
  action: QuestAction,
  requested: number | undefined
): number {
  if (action === "complete") {
    return 100;
  }

  if (action === "reopen") {
    return Math.min(95, Math.max(1, requested ?? current));
  }

  if (requested !== undefined) {
    return Math.max(0, Math.min(99, requested));
  }

  if (action === "start" || action === "resume") {
    return Math.max(5, current);
  }

  return Math.max(0, Math.min(99, current));
}

function defaultSnoozedUntil(now: string): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString();
}

function defaultActionReason(action: QuestAction): string {
  return `User selected ${action}.`;
}
