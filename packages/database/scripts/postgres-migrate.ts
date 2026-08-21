import { basecampSeed } from "@basecamp/content";
import {
  applyPostgresMigrations,
  importSeedToPostgres,
  postgresConnectionStringFromEnv,
  readPostgresStatus
} from "../src/index";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: postgresConnectionStringFromEnv(),
  ssl: postgresSslFromEnv(process.env.BASECAMP_POSTGRES_SSL)
});

const client = await pool.connect();

try {
  const migrations = await applyPostgresMigrations(client);
  const seed = await importSeedToPostgres(client, basecampSeed);
  const status = await readPostgresStatus(client);

  console.log(JSON.stringify({ migrations, seed, status }, null, 2));
} finally {
  client.release();
  await pool.end();
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
