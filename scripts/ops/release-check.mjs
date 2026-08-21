import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const requiredFiles = [
  "infra/compose.yml",
  "infra/basecamp.env.example",
  "infra/server.Dockerfile",
  "infra/web.Dockerfile",
  "infra/caddy/Caddyfile",
  "infra/nginx/web.conf",
  "docs/adr/0009-self-hosting-beta-sqlite-ops.md",
  "docs/ops/deployment.md",
  "docs/ops/self-hosting-and-backups.md",
  "packages/database/scripts/backup.ts",
  "packages/database/scripts/restore.ts",
  "packages/database/scripts/export-data.ts",
  "packages/database/scripts/import-data.ts",
  "packages/database/scripts/create-user.ts",
  "packages/database/scripts/disable-user.ts"
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(path.join(root, file));
  } catch {
    failures.push(`Missing self-hosting release artifact: ${file}`);
  }
}

const compose = await readText("infra/compose.yml");
const envExample = await readText("infra/basecamp.env.example");
const deployment = await readText("docs/ops/deployment.md");

for (const service of ["server", "web", "proxy", "backup"]) {
  if (!compose.includes(`${service}:`)) {
    failures.push(`Compose file must include ${service} service.`);
  }
}

if ((compose.match(/healthcheck:/g) ?? []).length < 3) {
  failures.push("Compose file must define health checks for primary services.");
}

if (compose.includes("env_file:")) {
  failures.push("Compose file should map --env-file values explicitly instead of requiring a local env_file.");
}

for (const variable of [
  "BASECAMP_APP_VERSION",
  "BASECAMP_ADMIN_TOKEN",
  "BASECAMP_AUTH_MODE",
  "BASECAMP_DEPLOYMENT_PROFILE",
  "BASECAMP_REMOTE_ACCESS",
  "BASECAMP_CONFIG_PATH"
]) {
  if (!compose.includes(`${variable}:`)) {
    failures.push(`Compose file must pass ${variable} into containers from the operator env file.`);
  }
}

if (!compose.includes("${BASECAMP_CONFIG_SOURCE")) {
  failures.push("Compose file must mount the admin config file from BASECAMP_CONFIG_SOURCE.");
}

for (const variable of [
  "BASECAMP_PUBLIC_URL",
  "BASECAMP_DB_PATH",
  "BASECAMP_STORAGE_DIR",
  "BASECAMP_BACKUP_DIR",
  "BASECAMP_ADMIN_TOKEN",
  "BASECAMP_AUTH_MODE",
  "BASECAMP_DEPLOYMENT_PROFILE",
  "BASECAMP_CONFIG_SOURCE"
]) {
  if (!envExample.includes(variable)) {
    failures.push(`Environment example is missing ${variable}.`);
  }
}

for (const section of ["Install Runbook", "Backup", "Restore Drill", "Upgrade", "Rollback", "Troubleshooting"]) {
  if (!deployment.includes(section)) {
    failures.push(`Deployment guide is missing ${section} guidance.`);
  }
}

if (!deployment.includes("docker compose --env-file basecamp.env config --quiet")) {
  failures.push("Deployment guide must validate Compose config with the operator env file.");
}

if (!deployment.includes("--env-file basecamp.env") || !deployment.includes("every Compose command")) {
  failures.push("Deployment guide must tell operators to pass the env file on every Compose command.");
}

if (/password|token|secret/i.test(envExample.replaceAll("change-me", ""))) {
  const suspicious = envExample
    .split("\n")
    .filter((line) => /^[A-Z0-9_]+=.+/.test(line))
    .filter((line) => /password|token|secret/i.test(line))
    .filter((line) => !line.includes("change-me") && !line.includes("<"));

  if (suspicious.length > 0) {
    failures.push("Environment example appears to contain a real secret value.");
  }
}

if (failures.length > 0) {
  console.error("Basecamp release artifact check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Basecamp release artifact check passed.");

async function readText(file) {
  try {
    return await readFile(path.join(root, file), "utf8");
  } catch {
    failures.push(`Could not read ${file}.`);
    return "";
  }
}
