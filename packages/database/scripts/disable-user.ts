import {
  applyMigrations,
  createRuntimeDatabase,
  disableLocalUser,
  recordAuditEvent
} from "../src/index";

const username = requiredEnv("BASECAMP_USER_USERNAME", "");

if (username.length === 0) {
  throw new Error("BASECAMP_USER_USERNAME is required.");
}

const { database } = await createRuntimeDatabase();

try {
  applyMigrations(database);
  const user = disableLocalUser(database, username);

  recordAuditEvent(database, {
    action: "user.disable",
    actor: "ops-script",
    result: "success",
    metadata: {
      username: user.username
    }
  });

  console.log(JSON.stringify({ user }, null, 2));
} finally {
  database.close();
}

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? fallback : value;
}
