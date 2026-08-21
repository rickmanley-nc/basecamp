import { createDatabase, ensureDatabaseDirectory } from "./sqlite";
import { postgresConnectionStringFromEnv } from "./postgres";
import { createPostgresDatabaseSync } from "./postgres-sync";
import type { BasecampDatabase, DatabaseKind } from "./connection";

export interface RuntimeDatabaseOptions {
  databasePathFallback?: string;
  env?: NodeJS.ProcessEnv;
}

export interface RuntimeDatabase {
  database: BasecampDatabase;
  databaseKind: DatabaseKind;
  databasePath?: string;
  databaseUrlConfigured: boolean;
}

export async function createRuntimeDatabase(
  options: RuntimeDatabaseOptions = {}
): Promise<RuntimeDatabase> {
  const env = options.env ?? process.env;
  const databaseKind = databaseKindFromEnv(env.BASECAMP_DATABASE_KIND);

  if (databaseKind === "postgresql") {
    const ssl = postgresSslFromEnv(env.BASECAMP_POSTGRES_SSL);

    return {
      database: createPostgresDatabaseSync({
        connectionString: postgresConnectionStringFromEnv(env),
        ...(ssl === undefined ? {} : { ssl })
      }),
      databaseKind,
      databaseUrlConfigured: true
    };
  }

  const databasePath = env.BASECAMP_DB_PATH ?? options.databasePathFallback ?? "var/basecamp-dev.sqlite";

  await ensureDatabaseDirectory(databasePath);

  return {
    database: createDatabase(databasePath),
    databaseKind,
    databasePath,
    databaseUrlConfigured: false
  };
}

export function databaseKindFromEnv(value: string | undefined): DatabaseKind {
  if (value === undefined || value.trim().length === 0 || value === "sqlite") {
    return "sqlite";
  }

  if (value === "postgresql") {
    return "postgresql";
  }

  throw new Error("BASECAMP_DATABASE_KIND must be either sqlite or postgresql.");
}

export function postgresSslFromEnv(value: string | undefined): false | { rejectUnauthorized: boolean } | undefined {
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
