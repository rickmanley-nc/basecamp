import { basecampSeed } from "@basecamp/content";
import {
  createDrillTemplateFromQuest,
  createEvidenceRecord,
  deleteEvidenceRecord,
  drillRunValidatesCategory,
  recordDrillRun,
  recordSkillTraining,
  skillSatisfiesDependency,
  supersedeEvidenceRecord
} from "@basecamp/domain";
import {
  buildGapAnalysisReport,
  calculateReadiness
} from "@basecamp/gamification";
import { describe, expect, it } from "vitest";

describe("M5 drills, skills, evidence, and validation reporting", () => {
  it("records drill success and creates follow-up quests for failed criteria", () => {
    const quest = basecampSeed.quests.find((candidate) => candidate.id === "drill-one-hour-power-outage")!;
    const template = createDrillTemplateFromQuest(quest);
    const passed = recordDrillRun(template, {
      completedAt: "2026-08-21T00:00:00.000Z",
      criteriaResults: [{ criterionId: template.successCriteria[0]!.id, passed: true }],
      lessons: "Lights, charging, and cooking plan worked."
    });
    const failed = recordDrillRun(template, {
      completedAt: "2026-08-22T00:00:00.000Z",
      criteriaResults: [{ criterionId: template.successCriteria[0]!.id, passed: false }],
      lessons: "Generator was louder than expected and one battery was empty."
    });

    expect(passed.result).toBe("passed");
    expect(drillRunValidatesCategory(passed)).toBe(true);
    expect(failed.result).toBe("failed");
    expect(failed.failures[0]).toBe(quest.validation);
    expect(failed.followUpQuestSuggestions[0]).toMatchObject({
      categoryId: "drills-validation",
      sourceType: "drill"
    });
  });

  it("tracks skill progression and expiration impact", () => {
    const current = recordSkillTraining(undefined, {
      skillId: "skill-first-aid-cpr",
      name: "First Aid/CPR",
      categoryId: "medical",
      courseName: "First Aid/CPR",
      provider: "County training center",
      completedAt: "2026-08-01",
      expiresAt: "2027-08-01",
      evidenceIds: ["evidence-first-aid-card"],
      stateAwarded: "validated"
    }).skill;
    const expired = {
      ...current,
      expiresAt: "2020-08-01"
    };

    expect(current.state).toBe("validated");
    expect(skillSatisfiesDependency(current, "validated", "2026-08-21T00:00:00.000Z")).toBe(true);
    expect(skillSatisfiesDependency(expired, "validated", "2026-08-21T00:00:00.000Z")).toBe(false);
    expect(skillSatisfiesDependency(expired, "competent", "2026-08-21T00:00:00.000Z")).toBe(true);
  });

  it("models evidence links, versions, and deletion policy", () => {
    const evidence = createEvidenceRecord({
      kind: "photo",
      title: "Radio contact proof",
      links: [
        { entityType: "quest", entityId: "communications-test-two-location-radio" },
        { entityType: "skill", entityId: "skill-radio-operation" },
        { entityType: "drill", entityId: "drill-communications-test-two-location-radio" },
        { entityType: "asset", entityId: "asset-handheld-radio-1" },
        { entityType: "maintenance", entityId: "maintenance-policy-radio-check" },
        { entityType: "inventory_event", entityId: "inventory-event-radio-test" }
      ],
      metadata: {
        capturedAt: "2026-08-21T00:00:00.000Z",
        fileName: "radio-contact.jpg",
        mimeType: "image/jpeg",
        byteSize: 120000,
        localUri: "basecamp://local/evidence/radio-contact.jpg"
      }
    });
    const versioned = supersedeEvidenceRecord(evidence, {
      kind: "photo",
      title: "Radio contact proof",
      links: evidence.links,
      metadata: {
        ...evidence.metadata,
        capturedAt: "2026-08-21T00:05:00.000Z",
        notes: "Cropped duplicate removed."
      }
    });
    const deleted = deleteEvidenceRecord(versioned.next, "Wrong asset attached.", "2026-08-21T00:10:00.000Z");

    expect(evidence.links.map((link) => link.entityType)).toEqual([
      "quest",
      "skill",
      "drill",
      "asset",
      "maintenance",
      "inventory_event"
    ]);
    expect(versioned.previous.status).toBe("superseded");
    expect(versioned.next).toMatchObject({
      version: 2,
      supersedesEvidenceId: evidence.id
    });
    expect(deleted).toMatchObject({
      status: "deleted",
      deletionReason: "Wrong asset attached."
    });
  });

  it("applies validation ceilings for purchase-only, configured, validated, failed, and recovered states", () => {
    const purchaseOnly = calculateReadiness(basecampSeed, {
      completedQuestIds: ["water-store-24-hour-drinking-water"]
    }).categories.find((category) => category.categoryId === "water")!;
    const configured = calculateReadiness(basecampSeed, {
      completedQuestIds: [
        "water-store-24-hour-drinking-water",
        "water-build-72-hour-reserve"
      ]
    }).categories.find((category) => category.categoryId === "water")!;
    const validated = calculateReadiness(basecampSeed, {
      completedQuestIds: [
        "water-store-24-hour-drinking-water",
        "water-build-72-hour-reserve",
        "water-establish-basic-purification"
      ]
    }).categories.find((category) => category.categoryId === "water")!;
    const customTemplate = {
      id: "drill-water-reserve-check",
      title: "Water Reserve Check",
      categoryId: "water",
      scenario: "Run the water plan from storage through purification.",
      estimatedMinutes: 30,
      successCriteria: [
        {
          id: "water-reserve-check-flow",
          label: "Stored water can be located and purified.",
          required: true
        }
      ]
    };
    const failedRun = recordDrillRun(customTemplate, {
      completedAt: "2026-08-21T00:00:00.000Z",
      criteriaResults: [{ criterionId: "water-reserve-check-flow", passed: false }]
    });
    const passedRun = recordDrillRun(customTemplate, {
      completedAt: "2026-08-22T00:00:00.000Z",
      criteriaResults: [{ criterionId: "water-reserve-check-flow", passed: true }]
    });
    const failedWater = calculateReadiness(basecampSeed, {
      completedQuestIds: [
        "water-store-24-hour-drinking-water",
        "water-build-72-hour-reserve",
        "water-establish-basic-purification"
      ],
      drillRuns: [failedRun]
    }).categories.find((category) => category.categoryId === "water")!;
    const recoveredWater = calculateReadiness(basecampSeed, {
      completedQuestIds: [
        "water-store-24-hour-drinking-water",
        "water-build-72-hour-reserve",
        "water-establish-basic-purification"
      ],
      drillRuns: [failedRun, passedRun]
    }).categories.find((category) => category.categoryId === "water")!;

    expect(purchaseOnly.score).toBeLessThan(configured.score);
    expect(configured.score).toBeLessThan(validated.score);
    expect(purchaseOnly.ceiling).toBe(35);
    expect(configured.ceiling).toBe(55);
    expect(validated.ceiling).toBe(100);
    expect(failedWater.ceiling).toBe(45);
    expect(failedWater.status).toBe("failed_validation");
    expect(recoveredWater.ceiling).toBe(100);
  });

  it("separates critical, deferred, validation, acquisition, and maintenance gaps", () => {
    const quest = basecampSeed.quests.find((candidate) => candidate.id === "drill-one-hour-power-outage")!;
    const template = createDrillTemplateFromQuest(quest);
    const failedRun = recordDrillRun(template, {
      completedAt: "2026-08-21T00:00:00.000Z",
      criteriaResults: [{ criterionId: template.successCriteria[0]!.id, passed: false }]
    });
    const report = buildGapAnalysisReport(
      basecampSeed,
      {
        completedQuestIds: ["home-label-utility-shutoffs"],
        categoryPursuits: [{ categoryId: "water", pursuitState: "later" }],
        drillRuns: [failedRun]
      },
      {
        acquisitionNeeds: [
          {
            id: "need-water-filter",
            questId: "water-establish-basic-purification",
            questTitle: "Establish Basic Water Purification",
            categoryId: "water",
            functionalRequirement: "Water filter",
            quantity: 1,
            required: true,
            state: "need_to_purchase",
            acceptableAlternatives: ["gravity filter"],
            matchedItemIds: []
          }
        ],
        maintenanceDue: [
          {
            policyId: "maintenance-policy-generator-run",
            title: "Generator monthly run",
            dueAt: "2026-08-20T00:00:00.000Z",
            status: "overdue",
            scopeLabel: "Backup Generator"
          }
        ]
      }
    );

    expect(report.criticalCategoryGaps.length).toBeGreaterThan(0);
    expect(report.intentionalDeferrals.map((gap) => gap.categoryId)).toContain("water");
    expect(report.validationGaps.map((gap) => gap.categoryId)).toContain("home-resilience");
    expect(report.validationGaps.map((gap) => gap.categoryId)).toContain("drills-validation");
    expect(report.acquisitionGaps[0]).toMatchObject({
      title: "Water filter",
      suggestedQuestIds: ["water-establish-basic-purification"]
    });
    expect(report.maintenanceGaps[0]).toMatchObject({
      title: "Generator monthly run",
      severity: "critical"
    });
    expect(report.followUpQuests.some((followUp) => followUp.sourceType === "drill")).toBe(true);
  });
});
