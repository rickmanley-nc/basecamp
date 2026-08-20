import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "README.md",
  "LICENSE",
  "package.json",
  "pnpm-workspace.yaml",
  "docs/product/architecture-and-plan.md",
  "docs/architecture/data-model.md",
  "docs/product/roadmap.md",
  "docs/ui/kaizen-integration.md",
  "docs/development/workflow.md",
  "docs/development/github-planning.md",
  "docs/development/releases.md",
  "docs/ops/self-hosting-and-backups.md",
  "docs/adr/0001-monorepo-typescript-react.md",
  "docs/adr/0002-basecamp-ui-kaizen-adapter.md",
  "docs/adr/0003-local-first-self-hosted-sync.md",
  ".github/roadmap/labels.json",
  ".github/roadmap/milestones.json",
  ".github/roadmap/issues.json",
  "apps/web/package.json",
  "apps/mobile/package.json",
  "apps/server/package.json",
  "packages/domain/package.json",
  "packages/database/package.json",
  "packages/api/package.json",
  "packages/ui/package.json",
  "packages/content/package.json",
  "packages/gamification/package.json",
  "packages/sync/package.json",
  "packages/content/seed/basecamp-seed-v0.json"
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(path.join(root, file));
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

const jsonFiles = [
  ".github/roadmap/labels.json",
  ".github/roadmap/milestones.json",
  ".github/roadmap/issues.json",
  "packages/content/seed/basecamp-seed-v0.json"
];

for (const file of jsonFiles) {
  try {
    JSON.parse(await readFile(path.join(root, file), "utf8"));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
  }
}

const seedPath = path.join(root, "packages/content/seed/basecamp-seed-v0.json");

try {
  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  const requiredCollections = ["categories", "levels", "quests", "badges", "milestones"];

  for (const collection of requiredCollections) {
    if (!Array.isArray(seed[collection]) || seed[collection].length === 0) {
      failures.push(`Seed collection must be a non-empty array: ${collection}`);
    }
  }

  for (const collection of requiredCollections) {
    const ids = new Set();

    for (const entry of seed[collection] ?? []) {
      if (typeof entry.id !== "string" || entry.id.length === 0) {
        failures.push(`Seed entry in ${collection} is missing a string id`);
        continue;
      }

      if (ids.has(entry.id)) {
        failures.push(`Duplicate seed id in ${collection}: ${entry.id}`);
      }

      ids.add(entry.id);
    }
  }
} catch (error) {
  failures.push(`Seed dataset is not valid JSON: ${error.message}`);
}

if (failures.length > 0) {
  console.error("Basecamp repository check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Basecamp repository check passed.");
