import { basecampSeed } from "@basecamp/content";
import {
  applyMigrations,
  createBackup,
  createDatabase,
  createPortableExport,
  importPortableExport,
  importSeed,
  listAuditEvents,
  listEvidenceRecords,
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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("M6 self-hosting operations", () => {
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
        localUri: "basecamp://local/evidence/water-shelf.jpg"
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
      appVersion: "0.7.0-m6",
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
      portablePath: `evidence/${evidence.id}/water-shelf.jpg`
    });
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
      appVersion: "0.7.0-m6",
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

  it("creates, verifies, reports, and restores a backup bundle", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basecamp-ops-"));
    const databasePath = path.join(root, "data", "basecamp.sqlite");
    const storageDir = path.join(root, "storage");
    const backupDir = path.join(root, "backups");
    const restoreDatabasePath = path.join(root, "restore", "basecamp.sqlite");
    const restoreStorageDir = path.join(root, "restore-storage");

    mkdirSync(path.dirname(databasePath), { recursive: true });
    mkdirSync(storageDir, { recursive: true });
    writeFileSync(path.join(storageDir, "evidence-note.txt"), "field note");

    const database = createDatabase(databasePath);

    applyMigrations(database);
    importSeed(database, basecampSeed);
    recordAuditEvent(database, {
      action: "backup.test",
      actor: "test",
      result: "success",
      occurredAt: "2026-08-21T00:00:00.000Z"
    });
    database.close();

    const backup = createBackup({
      databasePath,
      storageDir,
      backupDir,
      appVersion: "0.7.0-m6",
      contentSchemaVersion: basecampSeed.schemaVersion,
      now: "2026-08-21T00:01:00.000Z"
    });
    const integrity = verifyBackup(backup.backupPath, "2026-08-21T00:02:00.000Z");
    const status = readBackupStatus(backupDir, {
      now: "2026-08-21T01:01:00.000Z"
    });
    const restored = restoreBackup({
      backupPath: backup.backupPath,
      databasePath: restoreDatabasePath,
      storageDir: restoreStorageDir
    });

    expect(integrity.ok).toBe(true);
    expect(status).toMatchObject({
      configured: true,
      ok: true,
      status: "fresh"
    });
    expect(restored.restoredFiles).toBeGreaterThanOrEqual(2);
    expect(existsSync(restoreDatabasePath)).toBe(true);
    expect(readFileSync(path.join(restoreStorageDir, "evidence-note.txt"), "utf8")).toBe("field note");

    await rm(root, { recursive: true, force: true });
  });

  it("protects admin status, export, import, and audit routes with the beta admin token", async () => {
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
      appVersion: "0.7.0-m6",
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
      version: "0.7.0-m6",
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
    expect(envExample).toContain("BASECAMP_ADMIN_TOKEN=change-me");
    expect(envExample).toContain("BASECAMP_REMOTE_ACCESS=lan");
    expect(caddy).toContain("reverse_proxy server:4317");
    expect(caddy).toContain("reverse_proxy web:80");
  });
});
