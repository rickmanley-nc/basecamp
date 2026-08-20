import { basecampSeed, validateSeedDataset } from "@basecamp/content";
import { describe, expect, it } from "vitest";

describe("seed content validation", () => {
  it("accepts the current Basecamp seed dataset", () => {
    const result = validateSeedDataset(basecampSeed);

    expect(result.ok).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("rejects quests with missing dependency references", () => {
    const invalidSeed = structuredClone(basecampSeed);
    invalidSeed.quests[0]?.dependencies?.push("missing");

    if (invalidSeed.quests[0] && !invalidSeed.quests[0].dependencies) {
      invalidSeed.quests[0].dependencies = ["missing"];
    }

    const result = validateSeedDataset(invalidSeed);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes("dependencies"))).toBe(true);
  });
});
