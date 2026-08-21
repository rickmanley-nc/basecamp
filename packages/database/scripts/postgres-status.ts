import {
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
  console.log(JSON.stringify(await readPostgresStatus(client), null, 2));
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
