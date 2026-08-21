import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  countActiveLocalUsers,
  createBackup,
  createDatabase,
  createRuntimeBackup,
  databaseKindFromEnv,
  disableLocalUser,
  createLocalUser,
  createPortableExport,
  importPortableExport,
  importSeed,
  listAuditEvents,
  listEvidenceRecords,
  readBackupManifest,
  readBackupStatus,
  readInventoryState,
  recordAuditEvent,
  recordQuickInventoryEntry,
  recordSkillTraining,
  restoreBackup,
  upsertEvidenceRecord,
  verifyBackup
} from "@basecamp/database";
import { buildServer } from "@basecamp/server";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("M6 self-hosting operations", () => {
  it("rejects unknown runtime database kinds instead of falling back silently", () => {
    expect(databaseKindFromEnv(undefined)).toBe("sqlite");
    expect(databaseKindFromEnv("sqlite")).toBe("sqlite");
    expect(databaseKindFromEnv("postgresql")).toBe("postgresql");
    expect(() => databaseKindFromEnv("postgres")).toThrow(/sqlite or postgresql/);
  });

  it("exports structured JSON and CSV, then imports into another local deployment", () => {
    const source = createDatabase();
    const target = createDatabase();

    applyMigrations(source);
    importSeed(source, basecampSeed);
    recordQuickInventoryEntry(source, {
      itemName: "Commercial sealed water",
      quantity: 4,
      unit: "gallon",
      locationName: "Primary Home",
      categoryId: "water",
      type: "water_storage"
    });
    const evidence = upsertEvidenceRecord(source, {
      kind: "photo",
      title: "Water shelf",
      links: [{ entityType: "inventory_event", entityId: "inventory-event-water-shelf" }],
      metadata: {
        capturedAt: "2026-08-21T00:00:00.000Z",
        fileName: "water-shelf.jpg",
        localUri: "/Users/<admin>/Evidence/water-shelf.jpg",
        storageKey: "evidence/water-shelf.jpg"
      }
    });
    recordSkillTraining(source, {
      skillId: "skill-first-aid-cpr",
      name: "First Aid/CPR",
      categoryId: "skills-training",
      courseName: "First Aid/CPR",
      completedAt: "2026-08-21T00:01:00.000Z",
      evidenceIds: [evidence.id],
      stateAwarded: "validated"
    });

    const archive = createPortableExport(source, {
      appVersion: "0.7.2",
      contentSchemaVersion: basecampSeed.schemaVersion,
      generatedAt: "2026-08-21T00:02:00.000Z"
    });

    applyMigrations(target);
    importSeed(target, basecampSeed);
    const imported = importPortableExport(target, archive, {
      expectedContentSchemaVersion: basecampSeed.schemaVersion,
      importedAt: "2026-08-21T00:03:00.000Z"
    });
    const inventory = readInventoryState(target);

    expect(archive.manifest.exportVersion).toBe("basecamp-portable-v1");
    expect(archive.tables.inventory_items.length).toBeGreaterThan(0);
    expect(archive.csv.inventory_items).toContain("Commercial sealed water");
    expect(archive.evidenceFiles[0]).toMatchObject({
      evidenceId: evidence.id,
      storageKey: "evidence/water-shelf.jpg",
      portablePath: "evidence/water-shelf.jpg"
    });
    expect(archive.evidenceFiles[0]?.sourceUri).toBeUndefined();
    expect(JSON.stringify(archive.evidenceFiles)).not.toContain("/Users/");
    expect(imported.tableCounts.inventory_items).toBe(1);
    expect(inventory.items[0]).toMatchObject({ name: "Commercial sealed water" });
    expect(listEvidenceRecords(target)[0]).toMatchObject({ title: "Water shelf" });

    source.close();
    target.close();
  });

  it("rejects incompatible or modified portable imports", () => {
    const database = createDatabase();

    applyMigrations(database);
    importSeed(database, basecampSeed);
    const archive = createPortableExport(database, {
      appVersion: "0.7.2",
      contentSchemaVersion: basecampSeed.schemaVersion
    });
    const incompatible = {
      ...archive,
      manifest: {
        ...archive.manifest,
        contentSchemaVersion: "99.0.0"
      }
    };
    const modified = {
      ...archive,
      tables: {
        ...archive.tables,
        categories: []
      }
    };

    expect(() =>
      importPortableExport(database, incompatible, {
        expectedContentSchemaVersion: basecampSeed.schemaVersion
      })
    ).toThrow(/not compatible/);
    expect(() =>
      importPortableExport(database, modified, {
        expectedContentSchemaVersion: basecampSeed.schemaVersion
      })
    ).toThrow(/checksum/);

    database.close();
  });

  it("proves a cloud-pilot backup restore with users, inventory, evidence, reports, and admin status", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basecamp-ops-"));
    const databasePath = path.join(root, "data", "basecamp.sqlite");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const configPath = path.join(root, "basecamp.env");
    const restoreDatabasePath = path.join(root, "restore", "basecamp.sqlite");
    const restoreStorageDir = path.join(root, "restore-storage");
    const evidenceStorageKey = "evidence/restore-proof/water-shelf.txt";

    mkdirSync(path.dirname(databasePath), { recursive: true });
    mkdirSync(path.dirname(path.join(storageDir, evidenceStorageKey)), { recursive: true });
    writeFileSync(path.join(storageDir, evidenceStorageKey), "field evidence bytes");
    writeFileSync(
      configPath,
      [
        "BASECAMP_APP_VERSION=0.8.1",
        "BASECAMP_AUTH_MODE=local",
        "BASECAMP_DEPLOYMENT_PROFILE=cloud-pilot",
        "BASECAMP_REMOTE_ACCESS=lan"
      ].join("\n")
    );

    const database = createDatabase(databasePath);

    applyMigrations(database);
    importSeed(database, basecampSeed);
    createLocalUser(database, {
      username: "Admin",
      password: "correct horse battery staple",
      displayName: "Basecamp Admin",
      role: "admin",
      now: "2026-08-21T00:00:00.000Z"
    });
    createLocalUser(database, {
      username: "former-pilot",
      password: "correct horse battery staple",
      displayName: "Former Pilot",
      role: "member",
      now: "2026-08-21T00:00:10.000Z"
    });
    disableLocalUser(database, "former-pilot", "2026-08-21T00:00:20.000Z");
    const inventoryEntry = recordQuickInventoryEntry(database, {
      itemName: "Restore proof water",
      quantity: 4,
      unit: "gallon",
      locationName: "Primary Home Base",
      categoryId: "water",
      type: "water_storage"
    });
    upsertEvidenceRecord(database, {
      kind: "photo",
      title: "Restore proof shelf photo",
      links: [{ entityType: "inventory_event", entityId: inventoryEntry.event.id }],
      metadata: {
        capturedAt: "2026-08-21T00:00:30.000Z",
        fileName: "water-shelf.txt",
        mimeType: "text/plain",
        byteSize: 20,
        storageKey: evidenceStorageKey
      }
    });
    recordAuditEvent(database, {
      action: "backup.test",
      actor: "test",
      result: "success",
      occurredAt: "2026-08-21T00:00:45.000Z"
    });
    database.close();

    const backup = createBackup({
      databasePath,
      storageDir,
      backupDir,
      appVersion: "0.8.1",
      contentSchemaVersion: basecampSeed.schemaVersion,
      deploymentProfile: "cloud-pilot",
      configPath,
      now: "2026-08-21T00:01:00.000Z"
    });
    const manifest = readBackupManifest(backup.backupPath);
    const integrity = verifyBackup(backup.backupPath, "2026-08-21T00:02:00.000Z");
    const status = readBackupStatus(backupDir, {
      now: "2026-08-21T01:01:00.000Z"
    });
    const restored = restoreBackup({
      backupPath: backup.backupPath,
      databasePath: restoreDatabasePath,
      storageDir: restoreStorageDir
    });
    const restoredDatabase = createDatabase(restoreDatabasePath);
    const restoredInventory = readInventoryState(restoredDatabase);
    const restoredEvidence = listEvidenceRecords(restoredDatabase);
    const server = buildServer({
      database: restoredDatabase,
      closeDatabaseOnClose: true,
      databasePath: restoreDatabasePath,
      storageDir: restoreStorageDir,
      backupDir,
      authMode: "local",
      appVersion: "0.8.1",
      deploymentProfile: "cloud-pilot",
      remoteAccessMode: "lan",
      webUrl: "http://basecamp.local:8080"
    });
    const login = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "correct horse battery staple" }
    });
    const token = login.json().token as string;
    const dashboard = await server.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: { authorization: `Bearer ${token}` }
    });
    const gaps = await server.inject({
      method: "GET",
      url: "/api/reports/gaps",
      headers: { authorization: `Bearer ${token}` }
    });
    const adminStatus = await server.inject({
      method: "GET",
      url: "/api/admin/status",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(manifest).toMatchObject({
      appVersion: "0.8.1",
      contentSchemaVersion: basecampSeed.schemaVersion,
      deployment: {
        profile: "cloud-pilot",
        databaseKind: "sqlite",
        storageKind: "filesystem",
        backupDestination: "local-disk",
        configIncluded: true,
        localUserCount: 1,
        storageFileCount: 1
      }
    });
    expect(manifest.deployment.tableCounts.local_users).toBe(2);
    expect(manifest.deployment.tableCounts.inventory_items).toBe(1);
    expect(manifest.config?.path).toBe("config/basecamp.env");
    expect(integrity.ok).toBe(true);
    expect(status).toMatchObject({
      configured: true,
      ok: true,
      status: "fresh"
    });
    expect(restored).toMatchObject({
      manifest: {
        appVersion: "0.8.1",
        contentSchemaVersion: basecampSeed.schemaVersion,
        deployment: {
          profile: "cloud-pilot",
          localUserCount: 1,
          storageFileCount: 1
        }
      }
    });
    expect(restored.restoredFiles).toBe(2);
    expect(existsSync(restoreDatabasePath)).toBe(true);
    expect(countActiveLocalUsers(restoredDatabase)).toBe(1);
    expect(restoredInventory.items[0]).toMatchObject({ name: "Restore proof water" });
    expect(restoredEvidence[0]).toMatchObject({ title: "Restore proof shelf photo" });
    expect(readFileSync(path.join(restoreStorageDir, evidenceStorageKey), "utf8")).toBe("field evidence bytes");
    expect(login.statusCode).toBe(200);
    expect(dashboard.statusCode).toBe(200);
    expect(JSON.stringify(dashboard.json())).toContain("Restore proof water");
    expect(gaps.statusCode).toBe(200);
    expect(adminStatus.statusCode).toBe(200);
    expect(adminStatus.json()).toMatchObject({
      version: "0.8.1",
      deployment: { profile: "cloud-pilot" },
      security: {
        localAuthMode: "local",
        localUsersConfigured: true,
        remoteAccessMode: "lan"
      }
    });

    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  it("records runtime-aware logical backups for PostgreSQL mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basecamp-postgres-backup-"));
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const configPath = path.join(root, "basecamp.env");

    mkdirSync(storageDir, { recursive: true });
    writeFileSync(path.join(storageDir, "readiness-note.txt"), "runtime backup proof");
    writeFileSync(
      configPath,
      [
        "BASECAMP_APP_VERSION=0.9.2",
        "BASECAMP_AUTH_MODE=local",
        "BASECAMP_DEPLOYMENT_PROFILE=cloud-pilot",
        "BASECAMP_DATABASE_KIND=postgresql"
      ].join("\n")
    );

    const database = createDatabase();

    applyMigrations(database);
    importSeed(database, basecampSeed);
    createLocalUser(database, {
      username: "postgres-admin",
      password: "correct horse battery staple",
      displayName: "PostgreSQL Admin",
      role: "admin",
      now: "2026-08-21T00:00:00.000Z"
    });
    recordQuickInventoryEntry(database, {
      itemName: "Runtime backup water",
      quantity: 8,
      unit: "gallon",
      locationName: "Cloud Pilot Home Base",
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
      configPath,
      now: "2026-08-21T00:10:00.000Z"
    });
    const manifest = readBackupManifest(backup.backupPath);
    const snapshot = JSON.parse(readFileSync(path.join(backup.backupPath, manifest.database.path), "utf8")) as {
      databaseKind: string;
      tables: Record<string, unknown[]>;
    };
    const status = readBackupStatus(backupDir, {
      now: "2026-08-21T01:10:00.000Z",
      databaseKind: "postgresql"
    });
    const mismatchedStatus = readBackupStatus(backupDir, {
      now: "2026-08-21T01:10:00.000Z",
      databaseKind: "sqlite"
    });

    expect(manifest.deployment).toMatchObject({
      profile: "cloud-pilot",
      databaseKind: "postgresql",
      localUserCount: 1,
      storageFileCount: 1
    });
    expect(manifest.database.path).toBe("database/basecamp-database.json");
    expect(snapshot.databaseKind).toBe("postgresql");
    expect(snapshot.tables.local_users).toHaveLength(1);
    expect(snapshot.tables.inventory_items).toHaveLength(1);
    expect(verifyBackup(backup.backupPath, "2026-08-21T01:10:00.000Z").ok).toBe(true);
    expect(status).toMatchObject({
      configured: true,
      ok: true,
      status: "fresh"
    });
    expect(mismatchedStatus).toMatchObject({
      configured: true,
      ok: false,
      status: "failed"
    });
    expect(() =>
      restoreBackup({
        backupPath: backup.backupPath,
        databasePath: path.join(root, "restore", "basecamp.sqlite"),
        storageDir: path.join(root, "restore-storage")
      })
    ).toThrow(/SQLite backup manifests/);

    database.close();
    await rm(root, { recursive: true, force: true });
  });

  it("reports actionable backup restore failure modes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basecamp-backup-failure-"));
    const databasePath = path.join(root, "data", "basecamp.sqlite");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const restoreDatabasePath = path.join(root, "restore", "basecamp.sqlite");
    const restoreStorageDir = path.join(root, "restore-storage");

    mkdirSync(path.dirname(databasePath), { recursive: true });
    mkdirSync(storageDir, { recursive: true });

    const database = createDatabase(databasePath);

    applyMigrations(database);
    importSeed(database, basecampSeed);
    database.close();

    const backup = createBackup({
      databasePath,
      storageDir,
      backupDir,
      appVersion: "0.8.1",
      contentSchemaVersion: basecampSeed.schemaVersion,
      deploymentProfile: "cloud-pilot",
      now: "2026-08-21T00:01:00.000Z"
    });

    restoreBackup({
      backupPath: backup.backupPath,
      databasePath: restoreDatabasePath,
      storageDir: restoreStorageDir
    });

    expect(() =>
      restoreBackup({
        backupPath: backup.backupPath,
        databasePath: restoreDatabasePath,
        storageDir: restoreStorageDir
      })
    ).toThrow(/Restore target already exists/);

    rmSync(path.join(backup.backupPath, "database", "basecamp.sqlite"), { force: true });

    const integrity = verifyBackup(backup.backupPath, "2026-08-21T00:02:00.000Z");

    expect(integrity.ok).toBe(false);
    expect(integrity.failures).toContain("Missing backup file: database/basecamp.sqlite");
    expect(() =>
      restoreBackup({
        backupPath: backup.backupPath,
        databasePath: path.join(root, "broken-restore", "basecamp.sqlite"),
        storageDir: path.join(root, "broken-storage")
      })
    ).toThrow(/Missing backup file: database\/basecamp.sqlite/);

    await rm(root, { recursive: true, force: true });
  });

  it("protects admin status, export, import, and audit routes with the fallback admin token", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basecamp-admin-"));
    const databasePath = path.join(root, "basecamp.sqlite");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const database = createDatabase(databasePath);
    const server = buildServer({
      database,
      closeDatabaseOnClose: true,
      databasePath,
      storageDir,
      backupDir,
      adminToken: "test-admin-token",
      appVersion: "0.7.2",
      remoteAccessMode: "lan",
      webUrl: "http://basecamp.local:8080"
    });

    const denied = await server.inject("/api/admin/status");
    const status = await server.inject({
      method: "GET",
      url: "/api/admin/status",
      headers: { "x-basecamp-admin-token": "test-admin-token" }
    });
    const exported = await server.inject({
      method: "GET",
      url: "/api/admin/export",
      headers: { authorization: "Bearer test-admin-token" }
    });
    const imported = await server.inject({
      method: "POST",
      url: "/api/admin/import",
      headers: { "x-basecamp-admin-token": "test-admin-token" },
      payload: exported.json()
    });
    const audit = await server.inject({
      method: "GET",
      url: "/api/admin/audit",
      headers: { "x-basecamp-admin-token": "test-admin-token" }
    });

    expect(denied.statusCode).toBe(401);
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      version: "0.7.2",
      database: { kind: "sqlite", migrated: true },
      security: { adminTokenConfigured: true, remoteAccessMode: "lan" }
    });
    expect(exported.statusCode).toBe(200);
    expect(exported.json().manifest.exportVersion).toBe("basecamp-portable-v1");
    expect(imported.statusCode).toBe(200);
    expect(audit.statusCode).toBe(200);
    expect(audit.json().events.map((event: { action: string }) => event.action)).toContain("import.apply");
    expect(listAuditEvents(database).length).toBeGreaterThan(0);

    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  it("guards cloud-pilot QA reset, seed, and observability controls", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basecamp-qa-controls-"));
    const databasePath = path.join(root, "basecamp.sqlite");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const adminToken = "test-admin-token";
    const database = createDatabase(databasePath);
    const server = buildServer({
      database,
      closeDatabaseOnClose: true,
      databasePath,
      storageDir,
      backupDir,
      adminToken,
      appVersion: "0.9.2",
      deploymentProfile: "cloud-pilot",
      remoteAccessMode: "lan",
      qaControlsEnabled: true,
      webUrl: "http://basecamp.local:8080"
    });

    const quest = await server.inject({
      method: "POST",
      url: "/api/quests/home-label-utility-shutoffs/actions",
      payload: { action: "start" }
    });
    const inventory = await server.inject({
      method: "POST",
      url: "/api/inventory/quick-entry",
      payload: {
        itemName: "QA reset proof water",
        quantity: 2,
        unit: "gallon",
        locationName: "Cloud Pilot Home Base",
        categoryId: "water",
        type: "water_storage"
      }
    });
    const upload = await server.inject({
      method: "POST",
      url: "/api/evidence/upload",
      payload: {
        kind: "photo",
        title: "QA reset shelf photo",
        link: { entityType: "inventory_event", entityId: inventory.json().event.id },
        fileName: "qa-reset-shelf.txt",
        contentType: "text/plain",
        capturedAt: "2026-08-21T00:30:00.000Z",
        base64: Buffer.from("qa reset proof").toString("base64")
      }
    });
    const uploadedEvidenceExists = existsSync(path.join(storageDir, upload.json().storageKey));

    const deniedObservability = await server.inject("/api/admin/observability");
    const missingConfirmation = await server.inject({
      method: "POST",
      url: "/api/admin/qa/reset",
      headers: { "x-basecamp-admin-token": adminToken }
    });
    const badConfirmation = await server.inject({
      method: "POST",
      url: "/api/admin/qa/reset",
      headers: { "x-basecamp-admin-token": adminToken },
      payload: { confirmation: "reset please" }
    });
    const reset = await server.inject({
      method: "POST",
      url: "/api/admin/qa/reset",
      headers: { "x-basecamp-admin-token": adminToken },
      payload: { confirmation: "RESET QA DATA", deleteEvidenceStorage: true }
    });
    const seed = await server.inject({
      method: "POST",
      url: "/api/admin/qa/seed",
      headers: { "x-basecamp-admin-token": adminToken },
      payload: { confirmation: "SEED CONTENT" }
    });
    const observability = await server.inject({
      method: "GET",
      url: "/api/admin/observability",
      headers: { "x-basecamp-admin-token": adminToken }
    });
    const homelab = buildServer({
      database: createDatabase(),
      adminToken,
      deploymentProfile: "homelab",
      qaControlsEnabled: true
    });
    const homelabReset = await homelab.inject({
      method: "POST",
      url: "/api/admin/qa/reset",
      headers: { "x-basecamp-admin-token": adminToken },
      payload: { confirmation: "RESET QA DATA" }
    });
    const resetBody = reset.json();
    const observabilityText = JSON.stringify(observability.json());

    expect(quest.statusCode).toBe(200);
    expect(upload.statusCode).toBe(201);
    expect(uploadedEvidenceExists).toBe(true);
    expect(deniedObservability.statusCode).toBe(401);
    expect(missingConfirmation.statusCode).toBe(400);
    expect(badConfirmation.statusCode).toBe(400);
    expect(reset.statusCode).toBe(200);
    expect(resetBody).toMatchObject({
      deploymentProfile: "cloud-pilot",
      databaseKind: "sqlite",
      evidenceStorageDeleted: true,
      status: {
        deployment: { profile: "cloud-pilot" },
        security: { adminTokenConfigured: true, remoteAccessMode: "lan" }
      }
    });
    expect(resetBody.deletedRows.inventory_items).toBeGreaterThan(0);
    expect(resetBody.deletedRows.quest_instances).toBeGreaterThan(0);
    expect(resetBody.deletedRows.evidence_records).toBeGreaterThan(0);
    expect(resetBody.preservedTables).toContain("local_users");
    expect(existsSync(path.join(storageDir, "evidence"))).toBe(false);
    expect((database.prepare("SELECT COUNT(*) AS count FROM inventory_items").get() as { count: number }).count).toBe(0);
    expect((database.prepare("SELECT COUNT(*) AS count FROM quest_instances").get() as { count: number }).count).toBe(0);
    expect(seed.statusCode).toBe(200);
    expect(seed.json().imported.categories).toBe(basecampSeed.categories.length);
    expect(observability.statusCode).toBe(200);
    expect(observability.json()).toMatchObject({
      logPolicy: { secretsRedacted: true, publicTextSafe: true },
      status: { deployment: { profile: "cloud-pilot" } }
    });
    expect(observability.json().recentAuditEvents.map((event: { action: string }) => event.action)).toContain("qa.reset");
    expect(observability.json().recentAuditEvents.map((event: { action: string }) => event.action)).toContain("qa.seed");
    expect(observabilityText).not.toContain(adminToken);
    expect(observabilityText).not.toContain(root);
    expect(homelabReset.statusCode).toBe(403);
    expect(homelabReset.json().error).toMatch(/homelab/);

    await homelab.close();
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  it("supports admin-created username/password accounts and bearer sessions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basecamp-local-auth-"));
    const databasePath = path.join(root, "basecamp.sqlite");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const database = createDatabase(databasePath);
    const server = buildServer({
      database,
      closeDatabaseOnClose: true,
      databasePath,
      storageDir,
      backupDir,
      authMode: "local",
      appVersion: "0.8.1",
      deploymentProfile: "cloud-pilot",
      remoteAccessMode: "lan",
      webUrl: "http://basecamp.local:8080"
    });

    createLocalUser(database, {
      username: "Admin",
      password: "correct horse battery staple",
      displayName: "Basecamp Admin",
      role: "admin"
    });
    createLocalUser(database, {
      username: "friend",
      password: "correct horse battery staple",
      displayName: "Pilot Friend",
      role: "member"
    });

    const deniedDashboard = await server.inject("/api/dashboard");
    const deniedAdmin = await server.inject("/api/admin/status");
    const failedLogin = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "wrong password" }
    });
    const login = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "correct horse battery staple" }
    });
    const token = login.json().token as string;
    const friendLogin = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "friend", password: "correct horse battery staple" }
    });
    const friendToken = friendLogin.json().token as string;
    const dashboard = await server.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: { authorization: `Bearer ${token}` }
    });
    const session = await server.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { authorization: `Bearer ${token}` }
    });
    const adminStatus = await server.inject({
      method: "GET",
      url: "/api/admin/status",
      headers: { authorization: `Bearer ${token}` }
    });
    disableLocalUser(database, "friend");
    const deniedDisabledSession = await server.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: { authorization: `Bearer ${friendToken}` }
    });
    const deniedDisabledLogin = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "friend", password: "correct horse battery staple" }
    });
    const logout = await server.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${token}` }
    });
    const deniedAfterLogout = await server.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(deniedDashboard.statusCode).toBe(401);
    expect(deniedAdmin.statusCode).toBe(401);
    expect(failedLogin.statusCode).toBe(401);
    expect(login.statusCode).toBe(200);
    expect(token.length).toBeGreaterThan(30);
    expect(login.json().user).toMatchObject({
      username: "admin",
      displayName: "Basecamp Admin",
      role: "admin"
    });
    expect(friendLogin.statusCode).toBe(200);
    expect(dashboard.statusCode).toBe(200);
    expect(session.statusCode).toBe(200);
    expect(adminStatus.statusCode).toBe(200);
    expect(adminStatus.json()).toMatchObject({
      version: "0.8.1",
      deployment: { profile: "cloud-pilot" },
      security: {
        adminTokenConfigured: false,
        localAuthMode: "local",
        localUsersConfigured: true,
        adminTokenPlaceholder: false,
        remoteAccessMode: "lan"
      }
    });
    expect(deniedDisabledSession.statusCode).toBe(401);
    expect(deniedDisabledLogin.statusCode).toBe(401);
    expect(logout.statusCode).toBe(200);
    expect(deniedAfterLogout.statusCode).toBe(401);
    expect(listAuditEvents(database).map((event) => event.action)).toContain("auth.login");

    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  it("ships self-hosting release artifacts with health checks and safe defaults", () => {
    const compose = readFileSync("infra/compose.yml", "utf8");
    const envExample = readFileSync("infra/basecamp.env.example", "utf8");
    const caddy = readFileSync("infra/caddy/Caddyfile", "utf8");

    for (const service of ["server:", "web:", "proxy:", "backup:"]) {
      expect(compose).toContain(service);
    }

    expect(compose.match(/healthcheck:/g)?.length).toBeGreaterThanOrEqual(3);
    expect(compose).toContain("basecamp_database");
    expect(compose).toContain("basecamp_storage");
    expect(compose).toContain("basecamp_backups");
    expect(compose).not.toContain("env_file:");
    expect(compose).toContain("BASECAMP_APP_VERSION:");
    expect(compose).toContain("BASECAMP_DEPLOYMENT_PROFILE:");
    expect(compose).toContain("BASECAMP_ADMIN_TOKEN:");
    expect(compose).toContain("BASECAMP_AUTH_MODE:");
    expect(compose).toContain("BASECAMP_REMOTE_ACCESS:");
    expect(compose).toContain("BASECAMP_QA_CONTROLS_ENABLED:");
    expect(compose).toContain("BASECAMP_CONFIG_PATH:");
    expect(compose).toContain("${BASECAMP_CONFIG_SOURCE");
    expect(envExample).toContain("BASECAMP_ADMIN_TOKEN=change-me");
    expect(envExample).toContain("BASECAMP_AUTH_MODE=local");
    expect(envExample).toContain("BASECAMP_APP_VERSION=0.9.2");
    expect(envExample).toContain("BASECAMP_DEPLOYMENT_PROFILE=cloud-pilot");
    expect(envExample).toContain("BASECAMP_QA_CONTROLS_ENABLED=false");
    expect(envExample).toContain("BASECAMP_CONFIG_SOURCE=./basecamp.env");
    expect(envExample).toContain("BASECAMP_REMOTE_ACCESS=lan");
    expect(caddy).toContain("reverse_proxy server:4317");
    expect(caddy).toContain("reverse_proxy web:80");
  });
});
