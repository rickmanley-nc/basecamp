import { createDatabase, ensureDatabaseDirectory } from "@basecamp/database";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildServer, type BuildServerOptions } from "./app";

const port = Number(process.env.PORT ?? 4317);
const host = process.env.HOST ?? "127.0.0.1";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const databasePath =
  process.env.BASECAMP_DB_PATH ?? path.join(repoRoot, "var/basecamp-dev.sqlite");
const storageDir = process.env.BASECAMP_STORAGE_DIR ?? path.join(repoRoot, "var/storage");
const backupDir = process.env.BASECAMP_BACKUP_DIR ?? path.join(repoRoot, "var/backups");
const serverOptions: BuildServerOptions = {
  closeDatabaseOnClose: true,
  databasePath,
  storageDir,
  backupDir,
  logger: true
};

if (process.env.BASECAMP_APP_VERSION !== undefined) {
  serverOptions.appVersion = process.env.BASECAMP_APP_VERSION;
}

if (process.env.BASECAMP_ADMIN_TOKEN !== undefined) {
  serverOptions.adminToken = process.env.BASECAMP_ADMIN_TOKEN;
}

const webUrl = process.env.BASECAMP_WEB_URL ?? process.env.BASECAMP_PUBLIC_URL;

if (webUrl !== undefined) {
  serverOptions.webUrl = webUrl;
}

serverOptions.remoteAccessMode =
  process.env.BASECAMP_REMOTE_ACCESS === "lan" ||
  process.env.BASECAMP_REMOTE_ACCESS === "vpn" ||
  process.env.BASECAMP_REMOTE_ACCESS === "reverse_proxy"
    ? process.env.BASECAMP_REMOTE_ACCESS
    : "unknown";

await ensureDatabaseDirectory(databasePath);
await mkdir(storageDir, { recursive: true });
await mkdir(backupDir, { recursive: true });

const database = createDatabase(databasePath);
const server = buildServer({ ...serverOptions, database });

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
