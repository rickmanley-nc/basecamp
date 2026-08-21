import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  createRuntimeDatabase,
  importPortableExport,
  importSeed,
  recordAuditEvent,
  type PortableExportArchive
} from "../src/index";
import { readFile } from "node:fs/promises";

const importFile = requiredEnv("BASECAMP_IMPORT_FILE", "var/exports/latest/basecamp-export.json");

const { database } = await createRuntimeDatabase();

try {
  applyMigrations(database);
  importSeed(database, basecampSeed);

  const archive = JSON.parse(await readFile(importFile, "utf8")) as PortableExportArchive;
  const result = importPortableExport(database, archive, {
    expectedContentSchemaVersion: basecampSeed.schemaVersion
  });

  recordAuditEvent(database, {
    action: "import.apply",
    actor: "ops-script",
    result: "success",
    metadata: {
      importFile,
      tableCounts: result.tableCounts
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
