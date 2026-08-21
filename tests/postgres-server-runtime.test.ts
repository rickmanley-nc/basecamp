import { buildServer } from "@basecamp/server";
import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  countActiveLocalUsers,
  createLocalUser,
  createPostgresDatabaseSync,
  createRuntimeBackup,
  importSeed,
  postgresSslFromEnv,
  readInventoryState,
  recordQuickInventoryEntry,
  restoreBackup
} from "@basecamp/database";
import { existsSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const connectionString = process.env.BASECAMP_DATABASE_URL ?? process.env.DATABASE_URL;
const describePostgres = connectionString === undefined ? describe.skip : describe;

describePostgres("PostgreSQL API runtime", () => {
  it("serves auth, inventory, quest, export, and admin status workflows", async () => {
    const root = await mkdtempBasecamp("basecamp-postgres-runtime-");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const database = createPostgresDatabaseSync({
      connectionString: connectionString as string,
      ssl: postgresSslFromEnv(process.env.BASECAMP_POSTGRES_SSL)
    });
    const server = buildServer({
      database,
      closeDatabaseOnClose: true,
      databaseKind: "postgresql",
      databaseUrlConfigured: true,
      storageDir,
      backupDir,
      authMode: "local",
      appVersion: "0.9.2",
      deploymentProfile: "cloud-pilot",
      remoteAccessMode: "lan",
      webUrl: "http://basecamp.local:8080"
    });
    const suffix = String(Date.now());
    const username = `pg-admin-${suffix}`;
    const itemName = `Postgres Runtime Water ${suffix}`;

    await mkdir(storageDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });

    createLocalUser(database, {
      username,
      password: "correct horse battery staple",
      displayName: "Postgres Runtime Admin",
      role: "admin"
    });

    const login = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username, password: "correct horse battery staple" }
    });
    const token = login.json().token as string;
    const inventory = await server.inject({
      method: "POST",
      url: "/api/inventory/quick-entry",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        itemName,
        quantity: 3,
        unit: "gallon",
        locationName: "Primary Home Base",
        categoryId: "water",
        type: "water_storage"
      }
    });
    const quest = await server.inject({
      method: "POST",
      url: "/api/quests/water-calculate-household-requirements/actions",
      headers: { authorization: `Bearer ${token}` },
      payload: { action: "start" }
    });
    const dashboard = await server.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: { authorization: `Bearer ${token}` }
    });
    const adminStatus = await server.inject({
      method: "GET",
      url: "/api/admin/status",
      headers: { authorization: `Bearer ${token}` }
    });
    const exported = await server.inject({
      method: "GET",
      url: "/api/admin/export",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(login.statusCode).toBe(200);
    expect(inventory.statusCode).toBe(200);
    expect(quest.statusCode).toBe(200);
    expect(dashboard.statusCode).toBe(200);
    expect(JSON.stringify(dashboard.json())).toContain(itemName);
    expect(adminStatus.statusCode).toBe(200);
    expect(adminStatus.json()).toMatchObject({
      version: "0.9.2",
      deployment: { profile: "cloud-pilot" },
      database: {
        kind: "postgresql",
        migrated: true,
        pathConfigured: true
      },
      security: {
        localAuthMode: "local",
        localUsersConfigured: true,
        remoteAccessMode: "lan"
      }
    });
    expect(exported.statusCode).toBe(200);
    expect(exported.json().manifest.exportVersion).toBe("basecamp-portable-v1");
    expect(exported.json().manifest.tableCounts.inventory_items).toBeGreaterThan(0);
    expect(exported.json().manifest.tableCounts.quest_instances).toBeGreaterThan(0);

    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  it("restores a PostgreSQL logical backup through the runtime adapter", async () => {
    const root = await mkdtempBasecamp("basecamp-postgres-restore-");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const restoredStorageDir = path.join(root, "restore-storage");
    const database = createPostgresDatabaseSync({
      connectionString: connectionString as string,
      ssl: postgresSslFromEnv(process.env.BASECAMP_POSTGRES_SSL)
    });
    const suffix = String(Date.now());
    const itemName = `Postgres Restore Water ${suffix}`;

    await mkdir(storageDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });
    writeFileSync(path.join(storageDir, "restore-note.txt"), "postgres restore proof");

    applyMigrations(database);
    importSeed(database, basecampSeed);
    createLocalUser(database, {
      username: `pg-restore-admin-${suffix}`,
      password: "correct horse battery staple",
      displayName: "Postgres Restore Admin",
      role: "admin"
    });
    recordQuickInventoryEntry(database, {
      itemName,
      quantity: 5,
      unit: "gallon",
      locationName: "Cloud Pilot Restore",
      categoryId: "water",
      type: "water_storage"
    });

    const backup = createRuntimeBackup(database, {
      databaseKind: "postgresql",
      storageDir,
      backupDir,
      appVersion: "0.9.2",
      contentSchemaVersion: basecampSeed.schemaVersion,
      deploymentProfile: "cloud-pilot",
      now: "2026-08-21T00:30:00.000Z"
    });
    const restored = restoreBackup({
      backupPath: backup.backupPath,
      databasePath: "postgresql",
      storageDir: restoredStorageDir,
      database,
      databaseKind: "postgresql",
      allowOverwrite: true,
      restoredAt: "2026-08-21T00:31:00.000Z"
    });

    expect(restored.databaseKind).toBe("postgresql");
    expect(restored.restoredFiles).toBe(2);
    expect(countActiveLocalUsers(database)).toBeGreaterThan(0);
    expect(readInventoryState(database).items.map((item) => item.name)).toContain(itemName);
    expect(existsSync(path.join(restoredStorageDir, "restore-note.txt"))).toBe(true);

    database.close();
    await rm(root, { recursive: true, force: true });
  });
});

async function mkdtempBasecamp(prefix: string): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), prefix));
}
