import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const repoArgIndex = args.indexOf("--repo");
const milestoneArgIndex = args.indexOf("--milestone");
const repo = repoArgIndex >= 0 ? args[repoArgIndex + 1] : "";
const milestone = milestoneArgIndex >= 0 ? args[milestoneArgIndex + 1] : "";

if (!repo || !repo.includes("/")) {
  console.error("Usage: pnpm roadmap:resolution-audit -- --repo OWNER/REPO [--milestone TITLE]");
  process.exit(1);
}

function ghJson(commandArgs) {
  const output = execFileSync("gh", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();

  return output ? JSON.parse(output) : null;
}

const issues = ghJson([
  "issue",
  "list",
  "--repo",
  repo,
  "--state",
  "closed",
  "--label",
  "roadmap",
  "--limit",
  "300",
  "--json",
  "number,title,milestone"
]).filter((issue) => !milestone || issue.milestone?.title === milestone);

const missingResolution = [];

for (const issue of issues) {
  const details = ghJson([
    "issue",
    "view",
    String(issue.number),
    "--repo",
    repo,
    "--json",
    "comments"
  ]);
  const hasResolutionComment = details.comments.some((comment) => /^## Resolution\b/m.test(comment.body));

  if (!hasResolutionComment) {
    missingResolution.push(issue);
  }
}

if (missingResolution.length > 0) {
  console.error("Closed roadmap issues missing a resolution comment:");

  for (const issue of missingResolution) {
    console.error(`- #${issue.number} ${issue.title}`);
  }

  process.exit(1);
}

console.log(`All ${issues.length} closed roadmap issues have resolution comments.`);
