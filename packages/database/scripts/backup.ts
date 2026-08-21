import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  createBackup,
  createDatabase,
  ensureDatabaseDirectory,
  importSeed,
  recordAuditEvent,
  verifyBackup,
  type DeploymentProfile
} from "../src/index";

const databasePath = requiredEnv("BASECAMP_DB_PATH", "var/basecamp-dev.sqlite");
const storageDir = requiredEnv("BASECAMP_STORAGE_DIR", "var/storage");
const backupDir = requiredEnv("BASECAMP_BACKUP_DIR", "var/backups");
const configPath = process.env.BASECAMP_CONFIG_PATH;
const appVersion = process.env.BASECAMP_APP_VERSION ?? "0.9.1";
const deploymentProfile = deploymentProfileFromEnv(process.env.BASECAMP_DEPLOYMENT_PROFILE);

await ensureDatabaseDirectory(databasePath);

const database = createDatabase(databasePath);

try {
  applyMigrations(database);
  importSeed(database, basecampSeed);

  const backup = createBackup({
    databasePath,
    storageDir,
    backupDir,
    appVersion,
    contentSchemaVersion: basecampSeed.schemaVersion,
    deploymentProfile,
    ...(configPath === undefined ? {} : { configPath })
  });
  const integrity = verifyBackup(backup.backupPath);

  recordAuditEvent(database, {
    action: "backup.create",
    actor: "ops-script",
    result: integrity.ok ? "success" : "failure",
    metadata: {
      backupPath: backup.backupPath,
      failures: integrity.failures
    }
  });

  console.log(JSON.stringify({ backupPath: backup.backupPath, manifest: backup.manifest, integrity }, null, 2));
} finally {
  database.close();
}

function deploymentProfileFromEnv(value: string | undefined): DeploymentProfile {
  if (value === "local-dev" || value === "cloud-pilot" || value === "homelab" || value === "unknown") {
    return value;
  }

  return value === undefined || value.trim().length === 0 ? "local-dev" : "unknown";
}

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? fallback : value;
}
