import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync, cpSync, readdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export const portableExportVersion = "basecamp-portable-v1";

export type DatabaseScalar = string | number | null;
export type DatabaseRow = Record<string, DatabaseScalar>;

export interface PortableEvidenceFile {
  evidenceId: string;
  title: string;
  status: string;
  sourceUri?: string;
  fileName?: string;
  contentHash?: string;
  portablePath: string;
  includedInArchive: boolean;
}

export interface PortableExportArchive {
  manifest: {
    exportVersion: typeof portableExportVersion;
    generatedAt: string;
    appVersion: string;
    contentSchemaVersion: string;
    source: "basecamp-self-hosted";
    tableCounts: Record<string, number>;
    checksum: string;
  };
  tables: Record<string, DatabaseRow[]>;
  csv: Record<string, string>;
  evidenceFiles: PortableEvidenceFile[];
}

export interface PortableImportResult {
  importedAt: string;
  tableCounts: Record<string, number>;
}

export interface BackupManifest {
  backupVersion: "basecamp-backup-v1";
  createdAt: string;
  appVersion: string;
  contentSchemaVersion: string;
  database: BackupFileEntry;
  storage: BackupFileEntry[];
  config?: BackupFileEntry;
}

export interface BackupFileEntry {
  path: string;
  bytes: number;
  sha256: string;
}

export interface BackupResult {
  backupPath: string;
  manifest: BackupManifest;
}

export interface BackupIntegrityResult {
  ok: boolean;
  checkedAt: string;
  backupPath: string;
  failures: string[];
}

export interface BackupStatus {
  configured: boolean;
  ok: boolean;
  status: "missing" | "fresh" | "stale" | "failed";
  lastBackupAt?: string;
  backupPath?: string;
  ageHours?: number;
  message: string;
}

export interface RestoreResult {
  restoredAt: string;
  databasePath: string;
  storageDir: string;
  restoredFiles: number;
}

export interface AuditEventInput {
  action: string;
  actor: string;
  result: "success" | "failure";
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  result: "success" | "failure";
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface OperationalStatus {
  ok: boolean;
  checkedAt: string;
  version: string;
  web: {
    ok: boolean;
    configuredUrl?: string;
  };
  server: {
    ok: boolean;
    nodeEnv: string;
  };
  database: {
    ok: boolean;
    kind: "sqlite";
    writable: boolean;
    migrated: boolean;
    migrationCount: number;
    pathConfigured: boolean;
  };
  storage: {
    ok: boolean;
    writable: boolean;
    pathConfigured: boolean;
  };
  backup: BackupStatus;
  security: {
    adminTokenConfigured: boolean;
    remoteAccessMode: "lan" | "vpn" | "reverse_proxy" | "unknown";
  };
}

export const portableExportTables = [
  "seed_imports",
  "categories",
  "capability_levels",
  "quest_templates",
  "category_pursuits",
  "quest_instances",
  "quest_events",
  "xp_events",
  "locations",
  "location_relationships",
  "location_readiness",
  "inventory_items",
  "inventory_lots",
  "assets",
  "asset_tags",
  "kits",
  "kit_items",
  "inventory_events",
  "maintenance_policies",
  "maintenance_events",
  "sync_clients",
  "sync_commands",
  "sync_conflicts",
  "evidence_records",
  "skill_progress",
  "training_records",
  "drill_templates",
  "drill_runs",
  "audit_events"
] as const;

const csvExportTables = [
  "quest_instances",
  "inventory_items",
  "inventory_lots",
  "assets",
  "maintenance_policies",
  "maintenance_events",
  "skill_progress",
  "training_records",
  "drill_runs",
  "evidence_records",
  "audit_events"
] as const;

export function createPortableExport(
  database: DatabaseSync,
  options: {
    appVersion: string;
    contentSchemaVersion: string;
    generatedAt?: string;
  }
): PortableExportArchive {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const tables: Record<string, DatabaseRow[]> = {};
  const tableCounts: Record<string, number> = {};

  for (const table of portableExportTables) {
    if (!tableExists(database, table)) {
      tables[table] = [];
      tableCounts[table] = 0;
      continue;
    }

    const rows = database.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all().map(normalizeRow);
    tables[table] = rows;
    tableCounts[table] = rows.length;
  }

  const csv = Object.fromEntries(csvExportTables.map((table) => [table, rowsToCsv(tables[table] ?? [])]));
  const evidenceFiles = evidenceFilesFromRows(tables.evidence_records ?? []);
  const checksum = checksumJson({
    exportVersion: portableExportVersion,
    generatedAt,
    appVersion: options.appVersion,
    contentSchemaVersion: options.contentSchemaVersion,
    tables,
    evidenceFiles
  });

  return {
    manifest: {
      exportVersion: portableExportVersion,
      generatedAt,
      appVersion: options.appVersion,
      contentSchemaVersion: options.contentSchemaVersion,
      source: "basecamp-self-hosted",
      tableCounts,
      checksum
    },
    tables,
    csv,
    evidenceFiles
  };
}

export function importPortableExport(
  database: DatabaseSync,
  archive: PortableExportArchive,
  options: {
    expectedContentSchemaVersion: string;
    importedAt?: string;
  }
): PortableImportResult {
  if (archive.manifest.exportVersion !== portableExportVersion) {
    throw new Error(`Unsupported Basecamp export version ${archive.manifest.exportVersion}.`);
  }

  if (archive.manifest.contentSchemaVersion !== options.expectedContentSchemaVersion) {
    throw new Error(
      `Export content schema ${archive.manifest.contentSchemaVersion} is not compatible with ${options.expectedContentSchemaVersion}.`
    );
  }

  const calculatedChecksum = checksumJson({
    exportVersion: archive.manifest.exportVersion,
    generatedAt: archive.manifest.generatedAt,
    appVersion: archive.manifest.appVersion,
    contentSchemaVersion: archive.manifest.contentSchemaVersion,
    tables: archive.tables,
    evidenceFiles: archive.evidenceFiles
  });

  if (calculatedChecksum !== archive.manifest.checksum) {
    throw new Error("Basecamp export checksum does not match archive contents.");
  }

  database.exec("BEGIN");

  try {
    database.exec("PRAGMA foreign_keys = OFF");

    for (const table of [...portableExportTables].reverse()) {
      if (tableExists(database, table)) {
        database.prepare(`DELETE FROM ${quoteIdentifier(table)}`).run();
      }
    }

    for (const table of portableExportTables) {
      const rows = archive.tables[table] ?? [];

      if (rows.length > 0 && tableExists(database, table)) {
        insertRows(database, table, rows);
      }
    }

    database.exec("PRAGMA foreign_keys = ON");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.exec("PRAGMA foreign_keys = ON");
    throw error;
  }

  return {
    importedAt: options.importedAt ?? new Date().toISOString(),
    tableCounts: Object.fromEntries(portableExportTables.map((table) => [table, archive.tables[table]?.length ?? 0]))
  };
}

export function recordAuditEvent(
  database: DatabaseSync,
  input: AuditEventInput
): AuditEvent {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const event: AuditEvent = {
    id: `audit-${slugify(`${input.action}-${occurredAt}`)}`,
    action: input.action,
    actor: input.actor,
    result: input.result,
    metadata: input.metadata ?? {},
    occurredAt
  };

  if (!tableExists(database, "audit_events")) {
    return event;
  }

  database
    .prepare(
      `INSERT OR REPLACE INTO audit_events
       (id, action, actor, result, metadata_json, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(event.id, event.action, event.actor, event.result, JSON.stringify(event.metadata), event.occurredAt);

  return event;
}

export function listAuditEvents(database: DatabaseSync): AuditEvent[] {
  if (!tableExists(database, "audit_events")) {
    return [];
  }

  return database
    .prepare("SELECT id, action, actor, result, metadata_json, occurred_at FROM audit_events ORDER BY occurred_at, id")
    .all()
    .map((row) => {
      const value = row as {
        id: string;
        action: string;
        actor: string;
        result: AuditEvent["result"];
        metadata_json: string;
        occurred_at: string;
      };

      return {
        id: value.id,
        action: value.action,
        actor: value.actor,
        result: value.result,
        metadata: JSON.parse(value.metadata_json) as Record<string, unknown>,
        occurredAt: value.occurred_at
      };
    });
}

export function createBackup(
  options: {
    databasePath: string;
    storageDir: string;
    backupDir: string;
    appVersion: string;
    contentSchemaVersion: string;
    now?: string;
    configPath?: string;
  }
): BackupResult {
  const createdAt = options.now ?? new Date().toISOString();
  const backupName = `basecamp-backup-${slugify(createdAt)}`;
  const backupPath = path.join(options.backupDir, backupName);
  const databaseTarget = path.join(backupPath, "database", "basecamp.sqlite");
  const storageTarget = path.join(backupPath, "storage");
  const storageEntries: BackupFileEntry[] = [];

  mkdirSync(path.dirname(databaseTarget), { recursive: true });
  mkdirSync(storageTarget, { recursive: true });

  if (!existsSync(options.databasePath)) {
    throw new Error("Basecamp database file does not exist.");
  }

  copyFileSync(options.databasePath, databaseTarget);

  if (existsSync(options.storageDir)) {
    cpSync(options.storageDir, storageTarget, { recursive: true });
    storageEntries.push(...listFiles(storageTarget).map((file) => fileEntry(backupPath, file)));
  }

  const manifest: BackupManifest = {
    backupVersion: "basecamp-backup-v1",
    createdAt,
    appVersion: options.appVersion,
    contentSchemaVersion: options.contentSchemaVersion,
    database: fileEntry(backupPath, databaseTarget),
    storage: storageEntries
  };

  if (options.configPath !== undefined && existsSync(options.configPath)) {
    const configTarget = path.join(backupPath, "config", "basecamp.env");

    mkdirSync(path.dirname(configTarget), { recursive: true });
    copyFileSync(options.configPath, configTarget);
    manifest.config = fileEntry(backupPath, configTarget);
  }

  writeFileSync(path.join(backupPath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    path.join(options.backupDir, "latest-backup.json"),
    `${JSON.stringify({ backupPath, createdAt, ok: true }, null, 2)}\n`
  );

  return { backupPath, manifest };
}

export function verifyBackup(
  backupPath: string,
  checkedAt = new Date().toISOString()
): BackupIntegrityResult {
  const manifestPath = path.join(backupPath, "manifest.json");
  const failures: string[] = [];

  if (!existsSync(manifestPath)) {
    return {
      ok: false,
      checkedAt,
      backupPath,
      failures: ["Backup manifest is missing."]
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as BackupManifest;

  for (const entry of [manifest.database, ...manifest.storage, ...(manifest.config === undefined ? [] : [manifest.config])]) {
    const absolutePath = path.join(backupPath, entry.path);

    if (!existsSync(absolutePath)) {
      failures.push(`Missing backup file: ${entry.path}`);
      continue;
    }

    const actual = fileEntry(backupPath, absolutePath);

    if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) {
      failures.push(`Backup checksum mismatch: ${entry.path}`);
    }
  }

  return {
    ok: failures.length === 0,
    checkedAt,
    backupPath,
    failures
  };
}

export function restoreBackup(
  options: {
    backupPath: string;
    databasePath: string;
    storageDir: string;
    allowOverwrite?: boolean;
    restoredAt?: string;
  }
): RestoreResult {
  const integrity = verifyBackup(options.backupPath, options.restoredAt);

  if (!integrity.ok) {
    throw new Error(`Backup integrity failed: ${integrity.failures.join("; ")}`);
  }

  if (!options.allowOverwrite && (existsSync(options.databasePath) || existsSync(options.storageDir))) {
    throw new Error("Restore target already exists. Set allowOverwrite to replace it.");
  }

  const databaseSource = path.join(options.backupPath, "database", "basecamp.sqlite");
  const storageSource = path.join(options.backupPath, "storage");

  mkdirSync(path.dirname(options.databasePath), { recursive: true });
  copyFileSync(databaseSource, options.databasePath);

  if (existsSync(options.storageDir)) {
    rmSync(options.storageDir, { recursive: true, force: true });
  }

  mkdirSync(options.storageDir, { recursive: true });

  if (existsSync(storageSource)) {
    cpSync(storageSource, options.storageDir, { recursive: true });
  }

  return {
    restoredAt: options.restoredAt ?? new Date().toISOString(),
    databasePath: options.databasePath,
    storageDir: options.storageDir,
    restoredFiles: listFiles(options.storageDir).length + 1
  };
}

export function readBackupStatus(
  backupDir: string | undefined,
  options: { now?: string; staleHours?: number } = {}
): BackupStatus {
  if (backupDir === undefined || backupDir.trim().length === 0) {
    return {
      configured: false,
      ok: false,
      status: "missing",
      message: "Backup directory is not configured."
    };
  }

  const latestPath = path.join(backupDir, "latest-backup.json");

  if (!existsSync(latestPath)) {
    return {
      configured: true,
      ok: false,
      status: "missing",
      message: "No successful backup has been recorded."
    };
  }

  const latest = JSON.parse(readFileSync(latestPath, "utf8")) as {
    backupPath?: string;
    createdAt?: string;
    ok?: boolean;
  };

  if (latest.ok !== true || latest.createdAt === undefined || latest.backupPath === undefined) {
    return {
      configured: true,
      ok: false,
      status: "failed",
      message: "Latest backup marker is incomplete or failed."
    };
  }

  const ageHours = (new Date(options.now ?? new Date().toISOString()).valueOf() - new Date(latest.createdAt).valueOf()) / 36e5;
  const staleHours = options.staleHours ?? 30;
  const stale = ageHours > staleHours;

  return {
    configured: true,
    ok: !stale,
    status: stale ? "stale" : "fresh",
    lastBackupAt: latest.createdAt,
    backupPath: latest.backupPath,
    ageHours: Math.round(ageHours * 10) / 10,
    message: stale ? "Latest backup is stale." : "Latest backup is fresh."
  };
}

export function buildOperationalStatus(
  database: DatabaseSync,
  options: {
    version: string;
    databasePath?: string;
    storageDir?: string;
    backupDir?: string;
    adminTokenConfigured: boolean;
    webUrl?: string;
    remoteAccessMode?: OperationalStatus["security"]["remoteAccessMode"];
    now?: string;
  }
): OperationalStatus {
  const checkedAt = options.now ?? new Date().toISOString();
  const migrationCount = tableExists(database, "schema_migrations")
    ? ((database.prepare("SELECT COUNT(*) as count FROM schema_migrations").get() as { count: number }).count)
    : 0;
  const databaseWritable = canWriteDirectory(
    options.databasePath === undefined ? undefined : path.dirname(options.databasePath)
  );
  const storageWritable = canWriteDirectory(options.storageDir);
  const backup = readBackupStatus(options.backupDir, { now: checkedAt });
  const databaseOk = migrationCount > 0 && databaseWritable;
  const storageOk = storageWritable;

  return {
    ok: databaseOk && storageOk && backup.configured && options.adminTokenConfigured,
    checkedAt,
    version: options.version,
    web: {
      ok: true,
      ...(options.webUrl === undefined ? {} : { configuredUrl: options.webUrl })
    },
    server: {
      ok: true,
      nodeEnv: process.env.NODE_ENV ?? "development"
    },
    database: {
      ok: databaseOk,
      kind: "sqlite",
      writable: databaseWritable,
      migrated: migrationCount > 0,
      migrationCount,
      pathConfigured: options.databasePath !== undefined
    },
    storage: {
      ok: storageOk,
      writable: storageWritable,
      pathConfigured: options.storageDir !== undefined
    },
    backup,
    security: {
      adminTokenConfigured: options.adminTokenConfigured,
      remoteAccessMode: options.remoteAccessMode ?? "unknown"
    }
  };
}

export function redactConfigValue(value: string): string {
  if (/TOKEN|SECRET|PASSWORD|KEY/i.test(value)) {
    return "<redacted>";
  }

  return value;
}

function tableExists(database: DatabaseSync, table: string): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);

  return row !== undefined;
}

function insertRows(database: DatabaseSync, table: string, rows: DatabaseRow[]): void {
  const columns = tableColumns(database, table);

  for (const row of rows) {
    const rowColumns = Object.keys(row).filter((column) => columns.has(column));

    if (rowColumns.length === 0) {
      continue;
    }

    const placeholders = rowColumns.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO ${quoteIdentifier(table)} (${rowColumns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders})`;

    database.prepare(sql).run(...rowColumns.map((column) => row[column] ?? null));
  }
}

function tableColumns(database: DatabaseSync, table: string): Set<string> {
  return new Set(
    database
      .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
      .all()
      .map((row) => (row as { name: string }).name)
  );
}

function normalizeRow(row: unknown): DatabaseRow {
  return Object.fromEntries(
    Object.entries(row as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === "bigint" ? Number(value) : (value as DatabaseScalar)
    ])
  );
}

function rowsToCsv(rows: DatabaseRow[]): string {
  if (rows.length === 0) {
    return "";
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).sort();
  const lines = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column] ?? "")).join(","))
  ];

  return `${lines.join("\n")}\n`;
}

function evidenceFilesFromRows(rows: DatabaseRow[]): PortableEvidenceFile[] {
  return rows.map((row): PortableEvidenceFile => {
    const metadata = JSON.parse(String(row.metadata_json ?? "{}")) as {
      localUri?: string;
      fileName?: string;
      contentHash?: string;
    };
    const id = String(row.id);
    const fileName = metadata.fileName ?? `${id}.evidence`;

    return {
      evidenceId: id,
      title: String(row.title ?? id),
      status: String(row.status ?? "active"),
      ...(metadata.localUri === undefined ? {} : { sourceUri: metadata.localUri }),
      ...(metadata.fileName === undefined ? {} : { fileName: metadata.fileName }),
      ...(metadata.contentHash === undefined ? {} : { contentHash: metadata.contentHash }),
      portablePath: `evidence/${id}/${fileName}`,
      includedInArchive: false
    };
  });
}

function csvCell(value: DatabaseScalar | string): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function checksumJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fileEntry(basePath: string, absolutePath: string): BackupFileEntry {
  const buffer = readFileSync(absolutePath);

  return {
    path: path.relative(basePath, absolutePath),
    bytes: statSync(absolutePath).size,
    sha256: createHash("sha256").update(buffer).digest("hex")
  };
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);

    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

function canWriteDirectory(directory: string | undefined): boolean {
  if (directory === undefined || directory.trim().length === 0) {
    return false;
  }

  try {
    mkdirSync(directory, { recursive: true });
    const probe = path.join(directory, `.basecamp-health-${process.pid}`);

    writeFileSync(probe, "ok");
    rmSync(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "basecamp" : slug;
}
