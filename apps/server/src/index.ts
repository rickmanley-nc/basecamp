import { createDatabase, ensureDatabaseDirectory } from "@basecamp/database";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildServer } from "./app";

const port = Number(process.env.PORT ?? 4317);
const host = process.env.HOST ?? "127.0.0.1";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const databasePath =
  process.env.BASECAMP_DB_PATH ?? path.join(repoRoot, "var/basecamp-dev.sqlite");

await ensureDatabaseDirectory(databasePath);

const database = createDatabase(databasePath);
const server = buildServer({
  closeDatabaseOnClose: true,
  database,
  logger: true
});

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
