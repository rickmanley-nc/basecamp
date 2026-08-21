import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envExample = await readFile(path.join(root, "infra/basecamp.env.example"), "utf8");
const deployment = await readFile(path.join(root, "docs/ops/deployment.md"), "utf8");
const compose = await readFile(path.join(root, "infra/compose.yml"), "utf8");
const failures = [];

for (const required of [
  "BASECAMP_ADMIN_TOKEN",
  "BASECAMP_AUTH_MODE",
  "BASECAMP_DEPLOYMENT_PROFILE",
  "BASECAMP_REMOTE_ACCESS",
  "BASECAMP_BACKUP_DIR",
  "BASECAMP_STORAGE_DIR"
]) {
  if (!envExample.includes(required)) {
    failures.push(`Missing security-related environment variable: ${required}`);
  }
}

if (/image:\s*\S+:latest\b/.test(compose)) {
  failures.push("Compose file should not use latest image tags.");
}

for (const unsafe of ["privileged: true", "network_mode: host"]) {
  if (compose.includes(unsafe)) {
    failures.push(`Compose file should not use ${unsafe}.`);
  }
}

for (const phrase of ["VPN", "secure reverse proxy", "admin token", "username/password", "Do not publish credentials"]) {
  if (!deployment.includes(phrase)) {
    failures.push(`Deployment guide must mention ${phrase}.`);
  }
}

const envSecretLines = envExample
  .split("\n")
  .filter((line) => /^[A-Z0-9_]+=.+/.test(line))
  .filter((line) => /TOKEN|SECRET|PASSWORD|KEY/i.test(line))
  .filter((line) => !line.includes("change-me") && !line.includes("<"));

if (envSecretLines.length > 0) {
  failures.push("Environment example appears to contain non-placeholder secrets.");
}

if (failures.length > 0) {
  console.error("Basecamp security check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Basecamp security checklist passed.");
