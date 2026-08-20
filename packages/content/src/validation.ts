import type { BasecampSeed } from "@basecamp/domain";

export type SeedValidationSeverity = "error" | "warning";

export interface SeedValidationIssue {
  severity: SeedValidationSeverity;
  path: string;
  message: string;
}

export interface SeedValidationResult {
  ok: boolean;
  issues: SeedValidationIssue[];
}

export function validateSeedDataset(seed: BasecampSeed): SeedValidationResult {
  const issues: SeedValidationIssue[] = [];

  requireUniqueIds("categories", seed.categories, issues);
  requireUniqueIds("levels", seed.levels, issues);
  requireUniqueIds("quests", seed.quests, issues);
  requireUniqueIds("badges", seed.badges, issues);
  requireUniqueIds("outposts", seed.outposts, issues);
  requireUniqueIds("milestones", seed.milestones, issues);

  const categoryIds = new Set(seed.categories.map((category) => category.id));
  const levelNumbers = new Set(seed.levels.map((level) => level.number));
  const questIds = new Set(seed.quests.map((quest) => quest.id));

  for (const quest of seed.quests) {
    if (!categoryIds.has(quest.categoryId)) {
      addIssue(issues, "error", `quests.${quest.id}.categoryId`, `Unknown category ${quest.categoryId}.`);
    }

    if (!levelNumbers.has(quest.targetLevel)) {
      addIssue(issues, "error", `quests.${quest.id}.targetLevel`, `Unknown target level ${quest.targetLevel}.`);
    }

    if (quest.validation.trim().length === 0) {
      addIssue(issues, "error", `quests.${quest.id}.validation`, "Quest must define validation criteria.");
    }

    if (quest.whyItMatters.trim().length === 0) {
      addIssue(issues, "warning", `quests.${quest.id}.whyItMatters`, "Quest should explain why it matters.");
    }

    for (const dependencyId of quest.dependencies ?? []) {
      if (!questIds.has(dependencyId)) {
        addIssue(issues, "error", `quests.${quest.id}.dependencies`, `Unknown quest dependency ${dependencyId}.`);
      }
    }

    for (const [index, item] of (quest.bom ?? []).entries()) {
      if (item.functionalRequirement.trim().length === 0) {
        addIssue(
          issues,
          "error",
          `quests.${quest.id}.bom.${index}.functionalRequirement`,
          "BOM item must specify the functional requirement before products."
        );
      }
    }
  }

  for (const badge of seed.badges) {
    if (!categoryIds.has(badge.categoryId)) {
      addIssue(issues, "error", `badges.${badge.id}.categoryId`, `Unknown category ${badge.categoryId}.`);
    }

    if (badge.tiers.length === 0) {
      addIssue(issues, "error", `badges.${badge.id}.tiers`, "Badge must define at least one tier.");
    }
  }

  for (const outpost of seed.outposts) {
    if (!categoryIds.has(outpost.categoryId)) {
      addIssue(issues, "error", `outposts.${outpost.id}.categoryId`, `Unknown category ${outpost.categoryId}.`);
    }

    if (outpost.requirements.length === 0) {
      addIssue(issues, "error", `outposts.${outpost.id}.requirements`, "Outpost must define requirements.");
    }
  }

  for (const milestone of seed.milestones) {
    if (milestone.requirements.length === 0) {
      addIssue(issues, "error", `milestones.${milestone.id}.requirements`, "Milestone must define requirements.");
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

export function assertValidSeedDataset(seed: BasecampSeed): void {
  const result = validateSeedDataset(seed);

  if (!result.ok) {
    const details = result.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("\n");
    throw new Error(`Basecamp seed validation failed:\n${details}`);
  }
}

function requireUniqueIds(
  collectionName: string,
  entries: Array<{ id: string }>,
  issues: SeedValidationIssue[]
): void {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      addIssue(issues, "error", collectionName, `Duplicate id ${entry.id}.`);
    }

    seen.add(entry.id);
  }
}

function addIssue(
  issues: SeedValidationIssue[],
  severity: SeedValidationSeverity,
  path: string,
  message: string
): void {
  issues.push({ severity, path, message });
}
