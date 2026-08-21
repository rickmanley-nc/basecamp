import { basecampSeed } from "@basecamp/content";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMigrations,
  createDatabase,
  ensureDatabaseDirectory,
  importSeed
} from "../src/index";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const filename =
  process.env.BASECAMP_DB_PATH ?? path.join(repoRoot, "var/basecamp-dev.sqlite");

await ensureDatabaseDirectory(filename);

const database = createDatabase(filename);
const migrationResult = applyMigrations(database);
const importResult = importSeed(database, basecampSeed);
database.close();

console.log(
  JSON.stringify(
    {
      database: filename,
      migrations: migrationResult,
      imported: importResult
    },
    null,
    2
  )
);
