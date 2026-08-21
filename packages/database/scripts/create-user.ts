import {
  applyMigrations,
  createLocalUser,
  createRuntimeDatabase,
  recordAuditEvent
} from "../src/index";

const username = requiredEnv("BASECAMP_USER_USERNAME", "");
const password = requiredEnv("BASECAMP_USER_PASSWORD", "");
const displayName = process.env.BASECAMP_USER_DISPLAY_NAME;
const role = process.env.BASECAMP_USER_ROLE === "member" ? "member" : "admin";

if (username.length === 0) {
  throw new Error("BASECAMP_USER_USERNAME is required.");
}

if (password.length === 0) {
  throw new Error("BASECAMP_USER_PASSWORD is required.");
}

const { database } = await createRuntimeDatabase();

try {
  applyMigrations(database);
  const user = createLocalUser(database, {
    username,
    password,
    role,
    ...(displayName === undefined ? {} : { displayName })
  });

  recordAuditEvent(database, {
    action: "user.create",
    actor: "ops-script",
    result: "success",
    metadata: {
      username: user.username,
      role: user.role
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
