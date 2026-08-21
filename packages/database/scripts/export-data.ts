import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  createPortableExport,
  createRuntimeDatabase,
  importSeed,
  recordAuditEvent
} from "../src/index";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const exportDir = requiredEnv("BASECAMP_EXPORT_DIR", "var/exports/latest");
const appVersion = process.env.BASECAMP_APP_VERSION ?? "0.9.2";

await mkdir(exportDir, { recursive: true });

const { database } = await createRuntimeDatabase();

try {
  applyMigrations(database);
  importSeed(database, basecampSeed);

  const archive = createPortableExport(database, {
    appVersion,
    contentSchemaVersion: basecampSeed.schemaVersion
  });

  await writeFile(path.join(exportDir, "basecamp-export.json"), `${JSON.stringify(archive, null, 2)}\n`);
  await writeFile(
    path.join(exportDir, "evidence-files.json"),
    `${JSON.stringify(archive.evidenceFiles, null, 2)}\n`
  );

  for (const [name, csv] of Object.entries(archive.csv)) {
    await writeFile(path.join(exportDir, `${name}.csv`), csv);
  }

  recordAuditEvent(database, {
    action: "export.create",
    actor: "ops-script",
    result: "success",
    metadata: {
      tableCounts: archive.manifest.tableCounts,
      exportDir
    }
  });

  console.log(JSON.stringify({ exportDir, manifest: archive.manifest }, null, 2));
} finally {
  database.close();
}

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? fallback : value;
}
