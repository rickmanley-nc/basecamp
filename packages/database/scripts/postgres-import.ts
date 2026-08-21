import { basecampSeed } from "@basecamp/content";
import {
  applyPostgresMigrations,
  importPortableExportToPostgres,
  postgresConnectionStringFromEnv,
  readPostgresStatus,
  type PortableExportArchive
} from "../src/index";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const importFile = requiredEnv("BASECAMP_IMPORT_FILE", "var/exports/latest/basecamp-export.json");
const pool = new Pool({
  connectionString: postgresConnectionStringFromEnv(),
  ssl: postgresSslFromEnv(process.env.BASECAMP_POSTGRES_SSL)
});
const client = await pool.connect();

try {
  const archive = JSON.parse(await readFile(importFile, "utf8")) as PortableExportArchive;
  const migrations = await applyPostgresMigrations(client);
  const imported = await importPortableExportToPostgres(client, archive, {
    expectedContentSchemaVersion: basecampSeed.schemaVersion
  });
  const status = await readPostgresStatus(client);

  console.log(JSON.stringify({ importFile, migrations, imported, status }, null, 2));
} finally {
  client.release();
  await pool.end();
}

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? fallback : value;
}

function postgresSslFromEnv(value: string | undefined): false | { rejectUnauthorized: boolean } | undefined {
  if (value === undefined || value === "disable") {
    return false;
  }

  if (value === "require") {
    return { rejectUnauthorized: true };
  }

  if (value === "allow-self-signed") {
    return { rejectUnauthorized: false };
  }

  return undefined;
}
