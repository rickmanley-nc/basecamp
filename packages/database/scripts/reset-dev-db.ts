import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  createDatabase,
  ensureDatabaseDirectory,
  importSeed
} from "../src/index";

const filename = process.env.BASECAMP_DB_PATH ?? "var/basecamp-dev.sqlite";

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
