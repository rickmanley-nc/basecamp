import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const repoArgIndex = args.indexOf("--repo");
const repo = repoArgIndex >= 0 ? args[repoArgIndex + 1] : "";

if (!repo || !repo.includes("/")) {
  console.error("Usage: pnpm roadmap:sync -- --repo OWNER/REPO [--write]");
  process.exit(1);
}

const labels = readJson(".github/roadmap/labels.json");
const milestones = readJson(".github/roadmap/milestones.json");
const issues = readJson(".github/roadmap/issues.json");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function gh(commandArgs, options = {}) {
  const output = execFileSync("gh", commandArgs, {
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"]
  });
  return output.trim();
}

function ghJson(commandArgs) {
  const output = gh(commandArgs);
  return output ? JSON.parse(output) : null;
}

function api(method, endpoint, fields = {}) {
  const commandArgs = ["api", "-X", method, endpoint];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        commandArgs.push("-f", `${key}[]=${item}`);
      }
      continue;
    }

    commandArgs.push("-f", `${key}=${value}`);
  }

  return ghJson(commandArgs);
}

function safeApiJson(endpoint) {
  try {
    return ghJson(["api", endpoint]);
  } catch {
    return null;
  }
}

function logDryRun(message) {
  if (!write) {
    console.log(`[dry-run] ${message}`);
  }
}

function syncLabels() {
  for (const label of labels) {
    const endpointName = encodeURIComponent(label.name);
    const existing = safeApiJson(`repos/${repo}/labels/${endpointName}`);

    if (!write) {
      logDryRun(`${existing ? "update" : "create"} label ${label.name}`);
      continue;
    }

    if (existing) {
      api("PATCH", `repos/${repo}/labels/${endpointName}`, {
        new_name: label.name,
        color: label.color,
        description: label.description
      });
    } else {
      api("POST", `repos/${repo}/labels`, {
        name: label.name,
        color: label.color,
        description: label.description
      });
    }
  }
}

function syncMilestones() {
  const existingMilestones = ghJson([
    "api",
    `repos/${repo}/milestones?state=all&per_page=100`
  ]);
  const byTitle = new Map(existingMilestones.map((milestone) => [milestone.title, milestone]));
  const numbers = new Map();

  for (const milestone of milestones) {
    const existing = byTitle.get(milestone.title);
    const fields = {
      title: milestone.title,
      state: "open",
      description: `${milestone.description}\n\nPlanned release: ${milestone.release}`,
      due_on: milestone.dueOn
    };

    if (!write) {
      logDryRun(`${existing ? "update" : "create"} milestone ${milestone.title}`);
      if (existing) {
        numbers.set(milestone.title, existing.number);
      }
      continue;
    }

    const saved = existing
      ? api("PATCH", `repos/${repo}/milestones/${existing.number}`, fields)
      : api("POST", `repos/${repo}/milestones`, fields);

    numbers.set(milestone.title, saved.number);
  }

  return numbers;
}

function finalizeMilestones() {
  const existingMilestones = ghJson([
    "api",
    `repos/${repo}/milestones?state=all&per_page=100`
  ]);
  const byTitle = new Map(existingMilestones.map((milestone) => [milestone.title, milestone]));

  for (const milestone of milestones) {
    const existing = byTitle.get(milestone.title);

    if (!existing) {
      continue;
    }

    if (!write) {
      logDryRun(`set milestone ${milestone.title} state to ${milestone.state}`);
      continue;
    }

    api("PATCH", `repos/${repo}/milestones/${existing.number}`, {
      state: milestone.state
    });
  }
}

function issueMap() {
  const existingIssues = ghJson([
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "all",
    "--limit",
    "300",
    "--json",
    "number,title,state"
  ]);

  return new Map(existingIssues.map((issue) => [issue.title, issue]));
}

function syncIssues() {
  const existingByTitle = issueMap();

  for (const issue of issues) {
    const existing = existingByTitle.get(issue.title);

    if (!write) {
      logDryRun(`${existing ? "update" : "create"} issue ${issue.title}`);
      continue;
    }

    let number = existing?.number;

    if (existing) {
      const editArgs = [
        "issue",
        "edit",
        String(number),
        "--repo",
        repo,
        "--title",
        issue.title,
        "--body",
        issue.body,
        "--milestone",
        issue.milestone
      ];

      if (issue.labels?.length) {
        editArgs.push("--add-label", issue.labels.join(","));
      }

      gh(editArgs);
    } else {
      const createArgs = [
        "issue",
        "create",
        "--repo",
        repo,
        "--title",
        issue.title,
        "--body",
        issue.body,
        "--milestone",
        issue.milestone
      ];

      if (issue.labels?.length) {
        createArgs.push("--label", issue.labels.join(","));
      }

      const url = gh(createArgs);
      const match = url.match(/\/issues\/(\d+)$/);
      if (!match) {
        throw new Error(`Could not parse issue number from ${url}`);
      }
      number = Number(match[1]);
    }

    if (issue.state === "closed") {
      gh(["issue", "close", String(number), "--repo", repo, "--reason", "completed"]);
    }
  }
}

console.log(`${write ? "Syncing" : "Planning"} Basecamp GitHub roadmap for ${repo}`);
syncLabels();
syncMilestones();
syncIssues();
finalizeMilestones();
console.log(write ? "Roadmap sync complete." : "Dry run complete. Add --write to apply changes.");
