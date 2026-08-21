import type {
  BasecampId,
  CategoryId,
  DrillCriterionResult,
  DrillRun,
  DrillRunResult,
  DrillTemplate,
  EvidenceId,
  EvidenceKind,
  EvidenceLink,
  EvidenceMetadata,
  EvidenceRecord,
  EvidenceStatus,
  FollowUpQuestSuggestion,
  QuestTemplate,
  SkillProgress,
  SkillState,
  TrainingRecord
} from "./model";
import { slugify } from "./inventory";

export const skillStateOrder = [
  "untrained",
  "familiar",
  "practiced",
  "competent",
  "validated",
  "advanced"
] as const satisfies readonly SkillState[];

export interface EvidenceRecordInput {
  kind: EvidenceKind;
  title: string;
  links: EvidenceLink[];
  metadata: EvidenceMetadata;
  id?: EvidenceId;
  now?: string;
  status?: EvidenceStatus;
  version?: number;
  supersedesEvidenceId?: EvidenceId;
  deletionReason?: string;
}

export interface SkillTrainingInput {
  skillId: string;
  courseName: string;
  completedAt: string;
  name?: string;
  categoryId?: CategoryId;
  provider?: string;
  expiresAt?: string;
  evidenceIds?: EvidenceId[];
  notes?: string;
  stateAwarded?: Exclude<SkillState, "untrained">;
}

export interface DrillRunInput {
  completedAt: string;
  criteriaResults: DrillCriterionResult[];
  startedAt?: string;
  lessons?: string;
  evidenceIds?: EvidenceId[];
}

export function createEvidenceRecord(input: EvidenceRecordInput): EvidenceRecord {
  const now = input.now ?? input.metadata.capturedAt;
  const record: EvidenceRecord = {
    id: input.id ?? `evidence-${slugify(`${input.title}-${now}`)}`,
    kind: input.kind,
    title: input.title,
    links: input.links,
    metadata: input.metadata,
    status: input.status ?? "active",
    version: input.version ?? 1,
    createdAt: now,
    updatedAt: now
  };

  if (input.supersedesEvidenceId !== undefined) {
    record.supersedesEvidenceId = input.supersedesEvidenceId;
  }

  if (input.deletionReason !== undefined) {
    record.deletionReason = input.deletionReason;
  }

  return record;
}

export function supersedeEvidenceRecord(
  previous: EvidenceRecord,
  input: Omit<EvidenceRecordInput, "status" | "version" | "supersedesEvidenceId">
): { previous: EvidenceRecord; next: EvidenceRecord } {
  const next = createEvidenceRecord({
    ...input,
    status: "active",
    version: previous.version + 1,
    supersedesEvidenceId: previous.id
  });

  return {
    previous: {
      ...previous,
      status: "superseded",
      updatedAt: next.createdAt
    },
    next
  };
}

export function deleteEvidenceRecord(
  evidence: EvidenceRecord,
  deletionReason: string,
  now = new Date().toISOString()
): EvidenceRecord {
  return {
    ...evidence,
    status: "deleted",
    deletionReason,
    updatedAt: now
  };
}

export function recordSkillTraining(
  current: SkillProgress | undefined,
  input: SkillTrainingInput
): { skill: SkillProgress; trainingRecord: TrainingRecord } {
  const trainingRecord: TrainingRecord = {
    id: `training-${slugify(`${input.skillId}-${input.completedAt}-${input.courseName}`)}`,
    skillId: input.skillId,
    courseName: input.courseName,
    completedAt: input.completedAt
  };

  if (input.provider !== undefined) {
    trainingRecord.provider = input.provider;
  }

  if (input.expiresAt !== undefined) {
    trainingRecord.expiresAt = input.expiresAt;
  }

  if (input.evidenceIds !== undefined) {
    trainingRecord.evidenceIds = input.evidenceIds;
  }

  if (input.notes !== undefined) {
    trainingRecord.notes = input.notes;
  }

  const stateAwarded = input.stateAwarded ?? "competent";
  const skill: SkillProgress = {
    skillId: input.skillId,
    state: maxSkillState(current?.state ?? "untrained", stateAwarded),
    trainingRecords: [...(current?.trainingRecords ?? []), trainingRecord],
    evidenceIds: Array.from(new Set([...(current?.evidenceIds ?? []), ...(input.evidenceIds ?? [])])),
    lastPracticedAt: input.completedAt
  };

  const name = input.name ?? current?.name;
  const categoryId = input.categoryId ?? current?.categoryId;
  const expiresAt = input.expiresAt ?? current?.expiresAt;

  if (name !== undefined) {
    skill.name = name;
  }

  if (categoryId !== undefined) {
    skill.categoryId = categoryId;
  }

  if (stateAtLeast(stateAwarded, "validated")) {
    skill.validatedAt = input.completedAt;
  } else if (current?.validatedAt !== undefined) {
    skill.validatedAt = current.validatedAt;
  }

  if (expiresAt !== undefined) {
    skill.expiresAt = expiresAt;
  }

  return { skill, trainingRecord };
}

export function skillStateAt(skill: SkillProgress, now = new Date().toISOString()): SkillState {
  if (skill.expiresAt === undefined || skill.expiresAt >= now.slice(0, 10)) {
    return skill.state;
  }

  if (skill.state === "advanced" || skill.state === "validated") {
    return "competent";
  }

  if (skill.state === "competent") {
    return "practiced";
  }

  return skill.state;
}

export function skillSatisfiesDependency(
  skill: SkillProgress,
  requiredState: SkillState = "competent",
  now = new Date().toISOString()
): boolean {
  return stateAtLeast(skillStateAt(skill, now), requiredState);
}

export function createDrillTemplateFromQuest(quest: QuestTemplate): DrillTemplate {
  return {
    id: `drill-${quest.id}`,
    title: quest.title,
    categoryId: quest.categoryId,
    scenario: quest.whyItMatters,
    estimatedMinutes: quest.estimatedMinutes,
    successCriteria: [
      {
        id: `${quest.id}-validation`,
        label: quest.validation,
        required: true
      }
    ],
    recommendedQuestIds: quest.dependencies ?? []
  };
}

export function recordDrillRun(template: DrillTemplate, input: DrillRunInput): DrillRun {
  const criteriaResults = normalizeCriteriaResults(template, input.criteriaResults);
  const failures = failedCriteria(template, criteriaResults).map((criterion) => criterion.label);
  const result = drillRunResultFor(template, criteriaResults);
  const followUpQuestSuggestions = failures.map((failure, index): FollowUpQuestSuggestion => ({
    id: `follow-up-${slugify(`${template.id}-${index + 1}-${failure}`)}`,
    title: `Improve ${failure}`,
    categoryId: template.categoryId,
    reason: `Drill failed required criterion: ${failure}`,
    sourceType: "drill",
    sourceId: template.id
  }));
  const run: DrillRun = {
    id: `drill-run-${slugify(`${template.id}-${input.completedAt}`)}`,
    templateId: template.id,
    categoryId: template.categoryId,
    result,
    completedAt: input.completedAt,
    criteriaResults,
    failures,
    followUpQuestSuggestions
  };

  if (input.startedAt !== undefined) {
    run.startedAt = input.startedAt;
  }

  if (input.lessons !== undefined) {
    run.lessons = input.lessons;
  }

  if (input.evidenceIds !== undefined) {
    run.evidenceIds = input.evidenceIds;
  }

  return run;
}

export function drillRunValidatesCategory(run: DrillRun): boolean {
  return run.result === "passed";
}

export function drillRunNeedsFollowUp(run: DrillRun): boolean {
  return run.result === "failed" || run.result === "partial";
}

function normalizeCriteriaResults(
  template: DrillTemplate,
  criteriaResults: DrillCriterionResult[]
): DrillCriterionResult[] {
  const provided = new Map(criteriaResults.map((result) => [result.criterionId, result]));

  return template.successCriteria.map((criterion) => {
    const result = provided.get(criterion.id);

    if (result === undefined) {
      return {
        criterionId: criterion.id,
        passed: false,
        notes: "Not recorded."
      };
    }

    return result;
  });
}

function failedCriteria(template: DrillTemplate, criteriaResults: DrillCriterionResult[]) {
  const resultById = new Map(criteriaResults.map((result) => [result.criterionId, result]));

  return template.successCriteria.filter((criterion) => {
    const result = resultById.get(criterion.id);
    return criterion.required && result?.passed !== true;
  });
}

function drillRunResultFor(
  template: DrillTemplate,
  criteriaResults: DrillCriterionResult[]
): DrillRunResult {
  const requiredCriteria = template.successCriteria.filter((criterion) => criterion.required);
  const passedRequired = requiredCriteria.filter(
    (criterion) => criteriaResults.find((result) => result.criterionId === criterion.id)?.passed === true
  );

  if (requiredCriteria.length === passedRequired.length) {
    return "passed";
  }

  return passedRequired.length === 0 ? "failed" : "partial";
}

function maxSkillState(left: SkillState, right: SkillState): SkillState {
  return skillStateOrder.indexOf(left) > skillStateOrder.indexOf(right) ? left : right;
}

function stateAtLeast(actual: SkillState, required: SkillState): boolean {
  return skillStateOrder.indexOf(actual) >= skillStateOrder.indexOf(required);
}
