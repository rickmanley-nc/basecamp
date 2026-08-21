import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type LocalUserRole = "admin" | "member";
export type LocalUserStatus = "active" | "disabled";

export interface LocalUser {
  id: string;
  username: string;
  displayName: string;
  role: LocalUserRole;
  status: LocalUserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface LocalUserInput {
  username: string;
  password: string;
  displayName?: string;
  role?: LocalUserRole;
  now?: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: LocalUser;
}

export interface AuthenticatedSession {
  sessionId: string;
  expiresAt: string;
  user: LocalUser;
}

const scryptParameters = {
  keyLength: 64,
  n: 16384,
  r: 8,
  p: 1
};

const sessionTtlMs = 1000 * 60 * 60 * 24 * 14;

export function createLocalUser(database: DatabaseSync, input: LocalUserInput): LocalUser {
  const username = normalizeUsername(input.username);
  const displayName = (input.displayName ?? username).trim();
  const password = input.password;
  const role = input.role ?? "member";
  const now = input.now ?? new Date().toISOString();

  validateUsername(username);
  validatePassword(password);

  if (displayName.length === 0) {
    throw new Error("Display name is required.");
  }

  const existing = database.prepare("SELECT id FROM local_users WHERE username = ?").get(username);

  if (existing !== undefined) {
    throw new Error(`Local user already exists: ${username}`);
  }

  const user: LocalUser = {
    id: `user-${slugify(username)}-${randomBytes(6).toString("hex")}`,
    username,
    displayName,
    role,
    status: "active",
    createdAt: now,
    updatedAt: now
  };

  database
    .prepare(
      `INSERT INTO local_users
       (id, username, display_name, role, status, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, user.username, user.displayName, user.role, user.status, hashPassword(password), user.createdAt, user.updatedAt);

  return user;
}

export function verifyLocalUserPassword(
  database: DatabaseSync,
  usernameInput: string,
  password: string,
  now = new Date().toISOString()
): LocalUser | undefined {
  const username = normalizeUsername(usernameInput);
  const row = database
    .prepare(
      `SELECT id, username, display_name, role, status, password_hash, created_at, updated_at, last_login_at
       FROM local_users
       WHERE username = ?`
    )
    .get(username) as LocalUserRow | undefined;

  if (row === undefined || row.status !== "active" || !verifyPassword(password, row.password_hash)) {
    return undefined;
  }

  database.prepare("UPDATE local_users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(now, now, row.id);

  return toLocalUser({ ...row, last_login_at: now, updated_at: now });
}

export function createAuthSession(
  database: DatabaseSync,
  user: LocalUser,
  now = new Date().toISOString()
): AuthSession {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(new Date(now).valueOf() + sessionTtlMs).toISOString();
  const sessionId = `session-${randomBytes(16).toString("hex")}`;

  database
    .prepare(
      `INSERT INTO auth_sessions (id, user_id, token_hash, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(sessionId, user.id, hashSessionToken(token), now, expiresAt);

  return { token, expiresAt, user };
}

export function authenticateSession(
  database: DatabaseSync,
  token: string | undefined,
  now = new Date().toISOString()
): AuthenticatedSession | undefined {
  if (token === undefined || token.trim().length === 0) {
    return undefined;
  }

  const row = database
    .prepare(
      `SELECT
         auth_sessions.id as session_id,
         auth_sessions.expires_at,
         local_users.id,
         local_users.username,
         local_users.display_name,
         local_users.role,
         local_users.status,
         local_users.created_at,
         local_users.updated_at,
         local_users.last_login_at
       FROM auth_sessions
       JOIN local_users ON local_users.id = auth_sessions.user_id
       WHERE auth_sessions.token_hash = ?
         AND auth_sessions.revoked_at IS NULL
         AND auth_sessions.expires_at > ?
         AND local_users.status = 'active'`
    )
    .get(hashSessionToken(token), now) as AuthenticatedSessionRow | undefined;

  if (row === undefined) {
    return undefined;
  }

  return {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    user: toLocalUser(row)
  };
}

export function revokeAuthSession(
  database: DatabaseSync,
  token: string | undefined,
  now = new Date().toISOString()
): boolean {
  if (token === undefined || token.trim().length === 0) {
    return false;
  }

  const result = database
    .prepare("UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .run(now, hashSessionToken(token));

  return result.changes > 0;
}

export function disableLocalUser(
  database: DatabaseSync,
  usernameInput: string,
  now = new Date().toISOString()
): LocalUser {
  const username = normalizeUsername(usernameInput);
  const row = database
    .prepare(
      `SELECT id, username, display_name, role, status, password_hash, created_at, updated_at, last_login_at
       FROM local_users
       WHERE username = ?`
    )
    .get(username) as LocalUserRow | undefined;

  if (row === undefined) {
    throw new Error(`Local user does not exist: ${username}`);
  }

  database.prepare("UPDATE local_users SET status = 'disabled', updated_at = ? WHERE id = ?").run(now, row.id);
  database
    .prepare("UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(now, row.id);

  return toLocalUser({ ...row, status: "disabled", updated_at: now });
}

export function countActiveLocalUsers(database: DatabaseSync): number {
  const row = database.prepare("SELECT COUNT(*) as count FROM local_users WHERE status = 'active'").get() as {
    count: number;
  };

  return row.count;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, scryptParameters.keyLength, {
    N: scryptParameters.n,
    r: scryptParameters.r,
    p: scryptParameters.p
  }).toString("hex");

  return [
    "scrypt",
    "v1",
    String(scryptParameters.n),
    String(scryptParameters.r),
    String(scryptParameters.p),
    salt,
    hash
  ].join("$");
}

function verifyPassword(password: string, encoded: string): boolean {
  const [kind, version, nText, rText, pText, salt, expectedHash] = encoded.split("$");

  if (kind !== "scrypt" || version !== "v1" || salt === undefined || expectedHash === undefined) {
    return false;
  }

  const actual = scryptSync(password, salt, Buffer.from(expectedHash, "hex").length, {
    N: Number(nText),
    r: Number(rText),
    p: Number(pText)
  });
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUsername(username: string): void {
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
    throw new Error("Username must be 3-64 characters using letters, numbers, dots, underscores, or hyphens.");
  }
}

function validatePassword(password: string): void {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }
}

function toLocalUser(row: LocalUserRow): LocalUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.last_login_at === null ? {} : { lastLoginAt: row.last_login_at })
  };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "user" : slug;
}

interface LocalUserRow {
  id: string;
  username: string;
  display_name: string;
  role: LocalUserRole;
  status: LocalUserStatus;
  password_hash: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

interface AuthenticatedSessionRow extends LocalUserRow {
  session_id: string;
  expires_at: string;
}
