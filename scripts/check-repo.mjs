import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);

const requiredFiles = [
  "README.md",
  "LICENSE",
  "package.json",
  "pnpm-workspace.yaml",
  "docs/product/architecture-and-plan.md",
  "docs/architecture/data-model.md",
  "docs/product/roadmap.md",
  "docs/product/v1-mvp-readiness.md",
  "docs/ui/kaizen-integration.md",
  "docs/development/workflow.md",
  "docs/development/github-planning.md",
  "docs/development/privacy-and-portability.md",
  "docs/development/verification.md",
  "docs/development/releases.md",
  "docs/ops/deployment.md",
  "docs/ops/iphone-installation.md",
  "docs/ops/self-hosting-and-backups.md",
  "docs/adr/0001-monorepo-typescript-react.md",
  "docs/adr/0002-basecamp-ui-kaizen-adapter.md",
  "docs/adr/0003-local-first-self-hosted-sync.md",
  "docs/adr/0004-vite-react-fastify-vertical-slice.md",
  "docs/adr/0005-sqlite-baseline-postgresql-target.md",
  "docs/adr/0006-readiness-quest-core-engine.md",
  "docs/adr/0007-location-progression-and-home-bases.md",
  "docs/adr/0008-mobile-expo-offline-sync.md",
  "docs/adr/0009-self-hosting-beta-sqlite-ops.md",
  "docs/adr/0010-production-deployment-targets.md",
  "infra/compose.yml",
  "infra/basecamp.env.example",
  "infra/server.Dockerfile",
  "infra/web.Dockerfile",
  "infra/caddy/Caddyfile",
  "infra/nginx/web.conf",
  ".github/roadmap/labels.json",
  ".github/roadmap/milestones.json",
  ".github/roadmap/issues.json",
  "apps/web/package.json",
  "apps/mobile/package.json",
  "apps/server/package.json",
  "packages/domain/package.json",
  "packages/database/package.json",
  "packages/database/src/connection.ts",
  "packages/database/src/runtime.ts",
  "packages/database/src/postgres-sync.ts",
  "packages/database/src/postgres-sync-worker.js",
  "packages/api/package.json",
  "packages/ui/package.json",
  "packages/content/package.json",
  "packages/gamification/package.json",
  "packages/gamification/src/index.ts",
  "packages/gamification/tsconfig.json",
  "packages/sync/package.json",
  "packages/content/seed/basecamp-seed-v0.json"
];

const failures = [];

const hostPathPatterns = [
  {
    label: "macOS user home path",
    pattern: /\/Users\/[A-Za-z0-9._-]+/g,
    replacement: "/Users/<user>/... or $BASECAMP_HOME/..."
  },
  {
    label: "Linux user home path",
    pattern: /\/home\/[A-Za-z0-9._-]+/g,
    replacement: "/home/<user>/... or $BASECAMP_HOME/..."
  },
  {
    label: "Windows user profile path",
    pattern: /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+/g,
    replacement: "C:\\Users\\<user>\\... or %BASECAMP_HOME%\\..."
  },
  {
    label: "escaped Windows user profile path",
    pattern: /[A-Za-z]:\\\\Users\\\\[A-Za-z0-9._-]+/g,
    replacement: "C:\\\\Users\\\\<user>\\\\... or %BASECAMP_HOME%\\\\..."
  }
];

function findHostPathLeaks(text, label) {
  const leaks = [];

  for (const { label: patternLabel, pattern, replacement } of hostPathPatterns) {
    pattern.lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      leaks.push(
        `Host-specific path leak in ${label}:${lineNumberFor(text, match.index)}: ` +
          `${match[0]} (${patternLabel}; use ${replacement})`
      );
    }
  }

  return leaks;
}

function lineNumberFor(text, index) {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text[position] === "\n") {
      line += 1;
    }
  }

  return line;
}

async function listTrackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });

  return stdout.split("\0").filter(Boolean);
}

async function checkTrackedFilesForHostPaths() {
  let files;

  try {
    files = await listTrackedFiles();
  } catch (error) {
    failures.push(`Could not list tracked files for host path scan: ${error.message}`);
    return;
  }

  for (const file of files) {
    const buffer = await readFile(path.join(root, file));

    if (buffer.includes(0)) {
      continue;
    }

    const text = buffer.toString("utf8");

    failures.push(...findHostPathLeaks(text, file));
  }
}

async function checkGitHubEventForHostPaths() {
  if (!process.env.GITHUB_EVENT_PATH) {
    return;
  }

  let event;

  try {
    event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  } catch (error) {
    failures.push(`Could not read GitHub event for host path scan: ${error.message}`);
    return;
  }

  const publicTexts = [];

  if (event.pull_request) {
    publicTexts.push(
      ["pull request title", event.pull_request.title],
      ["pull request body", event.pull_request.body]
    );
  }

  if (event.release) {
    publicTexts.push(["release name", event.release.name], ["release body", event.release.body]);
  }

  if (event.issue) {
    publicTexts.push(["issue title", event.issue.title], ["issue body", event.issue.body]);
  }

  for (const [label, text] of publicTexts) {
    if (typeof text === "string") {
      failures.push(...findHostPathLeaks(text, label));
    }
  }
}

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

await checkTrackedFilesForHostPaths();
await checkGitHubEventForHostPaths();

if (failures.length > 0) {
  console.error("Basecamp repository check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Basecamp repository check passed.");
