import { basecampSeed } from "@basecamp/content";
import { rmSync } from "node:fs";
import path from "node:path";
import {
  applyMigrations,
  createRuntimeDatabase,
  importSeed,
  recordAuditEvent,
  resetQaData,
  type DeploymentProfile
} from "../src/index";

const resetConfirmation = "RESET QA DATA";
const deploymentProfile = deploymentProfileFromEnv(process.env.BASECAMP_DEPLOYMENT_PROFILE);

assertQaControlsEnabled(deploymentProfile);

if (requiredEnv("BASECAMP_QA_RESET_CONFIRMATION", "") !== resetConfirmation) {
  throw new Error(`BASECAMP_QA_RESET_CONFIRMATION must equal ${resetConfirmation}.`);
}

const runtimeDatabase = await createRuntimeDatabase({
  databasePathFallback: "var/basecamp-dev.sqlite"
});
const { database } = runtimeDatabase;

try {
  applyMigrations(database);
  importSeed(database, basecampSeed);

  const result = resetQaData(database);
  const evidenceStorageDeleted = deleteEvidenceStorage(booleanFromEnv(process.env.BASECAMP_QA_DELETE_EVIDENCE_STORAGE));
  const seed = importSeed(database, basecampSeed);

  recordAuditEvent(database, {
    action: "qa.reset",
    actor: "ops-script",
    result: "success",
    metadata: {
      deploymentProfile,
      databaseKind: runtimeDatabase.databaseKind,
      deletedRows: result.deletedRows,
      evidenceStorageDeleted
    }
  });

  console.log(
    JSON.stringify(
      {
        resetAt: result.resetAt,
        deploymentProfile,
        databaseKind: runtimeDatabase.databaseKind,
        deletedRows: result.deletedRows,
        preservedTables: result.preservedTables,
        evidenceStorageDeleted,
        seed
      },
      null,
      2
    )
  );
} catch (error) {
  recordAuditEvent(database, {
    action: "qa.reset",
    actor: "ops-script",
    result: "failure",
    metadata: {
      deploymentProfile,
      databaseKind: runtimeDatabase.databaseKind,
      message: error instanceof Error ? "QA reset failed." : "Unknown QA reset failure."
    }
  });

  throw error;
} finally {
  database.close();
}

function assertQaControlsEnabled(deploymentProfile: DeploymentProfile): void {
  if (deploymentProfile === "homelab") {
    throw new Error("QA reset controls are disabled for homelab deployments.");
  }

  if (!booleanFromEnv(process.env.BASECAMP_QA_CONTROLS_ENABLED)) {
    throw new Error("BASECAMP_QA_CONTROLS_ENABLED=true is required for QA reset controls.");
  }
}

function deleteEvidenceStorage(shouldDelete: boolean): boolean {
  if (!shouldDelete) {
    return false;
  }

  const storageDir = process.env.BASECAMP_STORAGE_DIR;

  if (storageDir === undefined || storageDir.trim().length === 0) {
    return false;
  }

  const storageRoot = path.resolve(storageDir);
  const evidenceDir = path.resolve(storageRoot, "evidence");

  if (evidenceDir === storageRoot || !evidenceDir.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Evidence storage reset target must stay inside the storage directory.");
  }

  rmSync(evidenceDir, { recursive: true, force: true });

  return true;
}

function deploymentProfileFromEnv(value: string | undefined): DeploymentProfile {
  if (value === "local-dev" || value === "cloud-pilot" || value === "homelab" || value === "unknown") {
    return value;
  }

  return value === undefined || value.trim().length === 0 ? "local-dev" : "unknown";
}

function booleanFromEnv(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? fallback : value;
}
