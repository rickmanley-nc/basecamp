import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  createRuntimeDatabase,
  importSeed,
  recordAuditEvent,
  type DeploymentProfile
} from "../src/index";

const seedConfirmation = "SEED CONTENT";
const deploymentProfile = deploymentProfileFromEnv(process.env.BASECAMP_DEPLOYMENT_PROFILE);

assertQaControlsEnabled(deploymentProfile);

if (requiredEnv("BASECAMP_QA_SEED_CONFIRMATION", "") !== seedConfirmation) {
  throw new Error(`BASECAMP_QA_SEED_CONFIRMATION must equal ${seedConfirmation}.`);
}

const runtimeDatabase = await createRuntimeDatabase({
  databasePathFallback: "var/basecamp-dev.sqlite"
});
const { database } = runtimeDatabase;

try {
  const migrations = applyMigrations(database);
  const seed = importSeed(database, basecampSeed);

  recordAuditEvent(database, {
    action: "qa.seed",
    actor: "ops-script",
    result: "success",
    metadata: {
      deploymentProfile,
      databaseKind: runtimeDatabase.databaseKind,
      imported: seed
    }
  });

  console.log(
    JSON.stringify(
      {
        seededAt: new Date().toISOString(),
        deploymentProfile,
        databaseKind: runtimeDatabase.databaseKind,
        migrations,
        seed
      },
      null,
      2
    )
  );
} catch (error) {
  recordAuditEvent(database, {
    action: "qa.seed",
    actor: "ops-script",
    result: "failure",
    metadata: {
      deploymentProfile,
      databaseKind: runtimeDatabase.databaseKind,
      message: error instanceof Error ? "QA seed failed." : "Unknown QA seed failure."
    }
  });

  throw error;
} finally {
  database.close();
}

function assertQaControlsEnabled(deploymentProfile: DeploymentProfile): void {
  if (deploymentProfile === "homelab") {
    throw new Error("QA seed controls are disabled for homelab deployments.");
  }

  if (!booleanFromEnv(process.env.BASECAMP_QA_CONTROLS_ENABLED)) {
    throw new Error("BASECAMP_QA_CONTROLS_ENABLED=true is required for QA seed controls.");
  }
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
