import { basecampSeed, validateSeedDataset } from "../src/index";

const result = validateSeedDataset(basecampSeed);

if (!result.ok) {
  for (const issue of result.issues) {
    console.error(`${issue.severity.toUpperCase()} ${issue.path}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(
  `Basecamp seed validated: ${basecampSeed.categories.length} categories, ${basecampSeed.quests.length} quests.`
);
