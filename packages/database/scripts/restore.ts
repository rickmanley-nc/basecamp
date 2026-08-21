import {
  applyMigrations,
  createDatabase,
  createRuntimeDatabase,
  databaseKindFromEnv,
  ensureDatabaseDirectory,
  recordAuditEvent,
  restoreBackup
} from "../src/index";

const backupPath = requiredEnv("BASECAMP_RESTORE_BACKUP", "");
const databasePath = requiredEnv("BASECAMP_DB_PATH", "var/basecamp-dev.sqlite");
const storageDir = requiredEnv("BASECAMP_STORAGE_DIR", "var/storage");
const allowOverwrite = process.env.BASECAMP_RESTORE_OVERWRITE === "true";
const databaseKind = databaseKindFromEnv(process.env.BASECAMP_DATABASE_KIND);

if (backupPath.length === 0) {
  throw new Error("BASECAMP_RESTORE_BACKUP must point at a backup directory.");
}

if (databaseKind === "postgresql") {
  if (!allowOverwrite) {
    throw new Error("BASECAMP_RESTORE_OVERWRITE=true is required for PostgreSQL logical restore.");
  }

  const runtimeDatabase = await createRuntimeDatabase();
  const { database } = runtimeDatabase;

  try {
    applyMigrations(database);
    const result = restoreBackup({
      backupPath,
      databasePath: "postgresql",
      storageDir,
      database,
      databaseKind: runtimeDatabase.databaseKind,
      allowOverwrite
    });

    recordAuditEvent(database, {
      action: "restore.apply",
      actor: "ops-script",
      result: "success",
      metadata: {
        backupPath,
        restoredFiles: result.restoredFiles,
        databaseKind: result.databaseKind
      }
    });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    database.close();
  }

  process.exit(0);
}

const result = restoreBackup({
  backupPath,
  databasePath,
  storageDir,
  allowOverwrite
});

await ensureDatabaseDirectory(databasePath);

const database = createDatabase(databasePath);

try {
  applyMigrations(database);
  recordAuditEvent(database, {
    action: "restore.apply",
    actor: "ops-script",
    result: "success",
    metadata: {
      backupPath,
      restoredFiles: result.restoredFiles
    }
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  database.close();
}

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? fallback : value;
}
