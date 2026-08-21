import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync, cpSync, readdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { BasecampDatabase, DatabaseKind } from "./connection";

export const portableExportVersion = "basecamp-portable-v1";

export type DatabaseScalar = string | number | null;
export type DatabaseRow = Record<string, DatabaseScalar>;

export interface PortableEvidenceFile {
  evidenceId: string;
  title: string;
  status: string;
  sourceUri?: string;
  fileName?: string;
  storageKey?: string;
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
  deployment: BackupDeploymentMetadata;
  database: BackupFileEntry;
  storage: BackupFileEntry[];
  config?: BackupFileEntry;
}

export type DeploymentProfile = "local-dev" | "cloud-pilot" | "homelab" | "unknown";

export interface BackupDeploymentMetadata {
  profile: DeploymentProfile;
  databaseKind: DatabaseKind;
  storageKind: "filesystem";
  backupDestination: "local-disk";
  configIncluded: boolean;
  tableCounts: Record<string, number>;
  localUserCount: number;
  storageFileCount: number;
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

export interface LogicalDatabaseBackupArchive {
  backupVersion: "basecamp-database-logical-v1";
  createdAt: string;
  appVersion: string;
  contentSchemaVersion: string;
  databaseKind: DatabaseKind;
  tables: Record<string, DatabaseRow[]>;
  checksum: string;
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
  manifest: {
    appVersion: string;
    contentSchemaVersion: string;
    deployment: BackupDeploymentMetadata;
  };
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
    kind: DatabaseKind;
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
  deployment: {
    profile: DeploymentProfile;
  };
  backup: BackupStatus;
  security: {
    adminTokenConfigured: boolean;
    localAuthMode: "disabled" | "local";
    localUsersConfigured: boolean;
    adminTokenPlaceholder: boolean;
    remoteAccessMode: "lan" | "vpn" | "reverse_proxy" | "unknown";
  };
}

export interface QaDataResetResult {
  resetAt: string;
  deletedRows: Record<string, number>;
  preservedTables: string[];
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

export const qaResetUserDataTables = [
  "sync_conflicts",
  "sync_commands",
  "sync_clients",
  "maintenance_events",
  "maintenance_policies",
  "inventory_events",
  "kit_items",
  "kits",
  "asset_tags",
  "assets",
  "inventory_lots",
  "inventory_items",
  "location_readiness",
  "location_relationships",
  "locations",
  "drill_runs",
  "training_records",
  "skill_progress",
  "evidence_records",
  "xp_events",
  "quest_events",
  "quest_instances",
  "category_pursuits"
] as const;

const qaResetPreservedTables = [
  "schema_migrations",
  "seed_imports",
  "categories",
  "capability_levels",
  "quest_templates",
  "drill_templates",
  "local_users",
  "auth_sessions",
  "audit_events"
] as const;

export function resetQaData(
  database: BasecampDatabase,
  options: { resetAt?: string } = {}
): QaDataResetResult {
  const resetAt = options.resetAt ?? new Date().toISOString();
  const deletedRows: Record<string, number> = {};

  database.exec("BEGIN");

  try {
    for (const table of qaResetUserDataTables) {
      if (!tableExists(database, table)) {
        deletedRows[table] = 0;
        continue;
      }

      const count = database.prepare(`SELECT COUNT(*) as count FROM ${quoteIdentifier(table)}`).get() as {
        count: number;
      };
      database.prepare(`DELETE FROM ${quoteIdentifier(table)}`).run();
      deletedRows[table] = count.count;
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return {
    resetAt,
    deletedRows,
    preservedTables: [...qaResetPreservedTables]
  };
}

export function createPortableExport(
  database: BasecampDatabase,
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
  database: BasecampDatabase,
  archive: PortableExportArchive,
  options: {
    expectedContentSchemaVersion: string;
    importedAt?: string;
  }
): PortableImportResult {
  assertPortableExportArchiveCompatible(archive, {
    expectedContentSchemaVersion: options.expectedContentSchemaVersion
  });

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

export function assertPortableExportArchiveCompatible(
  archive: PortableExportArchive,
  options: {
    expectedContentSchemaVersion: string;
  }
): void {
  if (archive.manifest.exportVersion !== portableExportVersion) {
    throw new Error(`Unsupported Basecamp export version ${archive.manifest.exportVersion}.`);
  }

  if (archive.manifest.contentSchemaVersion !== options.expectedContentSchemaVersion) {
    throw new Error(
      `Export content schema ${archive.manifest.contentSchemaVersion} is not compatible with ${options.expectedContentSchemaVersion}.`
    );
  }

  const calculatedChecksum = portableExportChecksum(archive);

  if (calculatedChecksum !== archive.manifest.checksum) {
    throw new Error("Basecamp export checksum does not match archive contents.");
  }
}

export function portableExportChecksum(archive: PortableExportArchive): string {
  return checksumJson({
    exportVersion: archive.manifest.exportVersion,
    generatedAt: archive.manifest.generatedAt,
    appVersion: archive.manifest.appVersion,
    contentSchemaVersion: archive.manifest.contentSchemaVersion,
    tables: archive.tables,
    evidenceFiles: archive.evidenceFiles
  });
}

export function recordAuditEvent(
  database: BasecampDatabase,
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

export function listAuditEvents(database: BasecampDatabase): AuditEvent[] {
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
    deploymentProfile?: DeploymentProfile;
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

  let configEntry: BackupFileEntry | undefined;

  if (options.configPath !== undefined && existsSync(options.configPath)) {
    const configTarget = path.join(backupPath, "config", "basecamp.env");

    mkdirSync(path.dirname(configTarget), { recursive: true });
    copyFileSync(options.configPath, configTarget);
    configEntry = fileEntry(backupPath, configTarget);
  }

  const tableCounts = sqliteTableCounts(databaseTarget);
  const activeLocalUserCount = sqliteActiveLocalUserCount(databaseTarget);
  const manifest: BackupManifest = {
    backupVersion: "basecamp-backup-v1",
    createdAt,
    appVersion: options.appVersion,
    contentSchemaVersion: options.contentSchemaVersion,
    deployment: {
      profile: options.deploymentProfile ?? "local-dev",
      databaseKind: "sqlite",
      storageKind: "filesystem",
      backupDestination: "local-disk",
      configIncluded: configEntry !== undefined,
      tableCounts,
      localUserCount: activeLocalUserCount,
      storageFileCount: storageEntries.length
    },
    database: fileEntry(backupPath, databaseTarget),
    storage: storageEntries,
    ...(configEntry === undefined ? {} : { config: configEntry })
  };

  writeFileSync(path.join(backupPath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeLatestBackupMarker(options.backupDir, {
    backupPath,
    createdAt,
    databaseKind: "sqlite"
  });

  return { backupPath, manifest };
}

export function createRuntimeBackup(
  database: BasecampDatabase,
  options: {
    databaseKind: DatabaseKind;
    databasePath?: string;
    storageDir: string;
    backupDir: string;
    appVersion: string;
    contentSchemaVersion: string;
    now?: string;
    configPath?: string;
    deploymentProfile?: DeploymentProfile;
  }
): BackupResult {
  if (options.databaseKind === "sqlite") {
    if (options.databasePath === undefined) {
      throw new Error("BASECAMP_DB_PATH is required for SQLite backups.");
    }

    return createBackup({
      databasePath: options.databasePath,
      storageDir: options.storageDir,
      backupDir: options.backupDir,
      appVersion: options.appVersion,
      contentSchemaVersion: options.contentSchemaVersion,
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.configPath === undefined ? {} : { configPath: options.configPath }),
      ...(options.deploymentProfile === undefined ? {} : { deploymentProfile: options.deploymentProfile })
    });
  }

  return createLogicalDatabaseBackup(database, options);
}

function createLogicalDatabaseBackup(
  database: BasecampDatabase,
  options: {
    databaseKind: DatabaseKind;
    storageDir: string;
    backupDir: string;
    appVersion: string;
    contentSchemaVersion: string;
    now?: string;
    configPath?: string;
    deploymentProfile?: DeploymentProfile;
  }
): BackupResult {
  const createdAt = options.now ?? new Date().toISOString();
  const backupName = `basecamp-backup-${slugify(createdAt)}`;
  const backupPath = path.join(options.backupDir, backupName);
  const databaseTarget = path.join(backupPath, "database", "basecamp-database.json");
  const storageTarget = path.join(backupPath, "storage");
  const storageEntries: BackupFileEntry[] = [];

  mkdirSync(path.dirname(databaseTarget), { recursive: true });
  mkdirSync(storageTarget, { recursive: true });

  const tables = databaseRows(database);
  const snapshotContent = {
    backupVersion: "basecamp-database-logical-v1" as const,
    createdAt,
    appVersion: options.appVersion,
    contentSchemaVersion: options.contentSchemaVersion,
    databaseKind: options.databaseKind,
    tables
  };
  const snapshot: LogicalDatabaseBackupArchive = {
    ...snapshotContent,
    checksum: checksumJson(snapshotContent)
  };

  writeFileSync(databaseTarget, `${JSON.stringify(snapshot, null, 2)}\n`);

  if (existsSync(options.storageDir)) {
    cpSync(options.storageDir, storageTarget, { recursive: true });
    storageEntries.push(...listFiles(storageTarget).map((file) => fileEntry(backupPath, file)));
  }

  let configEntry: BackupFileEntry | undefined;

  if (options.configPath !== undefined && existsSync(options.configPath)) {
    const configTarget = path.join(backupPath, "config", "basecamp.env");

    mkdirSync(path.dirname(configTarget), { recursive: true });
    copyFileSync(options.configPath, configTarget);
    configEntry = fileEntry(backupPath, configTarget);
  }

  const tableCounts = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [table, rows.length])
  );
  const manifest: BackupManifest = {
    backupVersion: "basecamp-backup-v1",
    createdAt,
    appVersion: options.appVersion,
    contentSchemaVersion: options.contentSchemaVersion,
    deployment: {
      profile: options.deploymentProfile ?? "local-dev",
      databaseKind: options.databaseKind,
      storageKind: "filesystem",
      backupDestination: "local-disk",
      configIncluded: configEntry !== undefined,
      tableCounts,
      localUserCount: activeLocalUserCount(database),
      storageFileCount: storageEntries.length
    },
    database: fileEntry(backupPath, databaseTarget),
    storage: storageEntries,
    ...(configEntry === undefined ? {} : { config: configEntry })
  };

  writeFileSync(path.join(backupPath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeLatestBackupMarker(options.backupDir, {
    backupPath,
    createdAt,
    databaseKind: options.databaseKind
  });

  return { backupPath, manifest };
}

export function readBackupManifest(backupPath: string): BackupManifest {
  const manifestPath = path.join(backupPath, "manifest.json");

  if (!existsSync(manifestPath)) {
    throw new Error("Backup manifest is missing.");
  }

  try {
    return normalizeBackupManifest(JSON.parse(readFileSync(manifestPath, "utf8")) as BackupManifest);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Backup manifest is not readable: ${error.message}`);
    }

    throw error;
  }
}

export function verifyBackup(
  backupPath: string,
  checkedAt = new Date().toISOString()
): BackupIntegrityResult {
  const failures: string[] = [];
  let manifest: BackupManifest;

  try {
    manifest = readBackupManifest(backupPath);
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      backupPath,
      failures: [error instanceof Error ? error.message : "Backup manifest is not readable."]
    };
  }

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

  const manifest = readBackupManifest(options.backupPath);

  if (manifest.deployment.databaseKind !== "sqlite") {
    throw new Error("The restore command currently supports SQLite backup manifests. Use the PostgreSQL restore runbook for PostgreSQL logical backups.");
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
    restoredFiles: listFiles(options.storageDir).length + 1,
    manifest: {
      appVersion: manifest.appVersion,
      contentSchemaVersion: manifest.contentSchemaVersion,
      deployment: manifest.deployment
    }
  };
}

export function readBackupStatus(
  backupDir: string | undefined,
  options: { now?: string; staleHours?: number; databaseKind?: DatabaseKind } = {}
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
    databaseKind?: DatabaseKind;
  };

  if (latest.ok !== true || latest.createdAt === undefined || latest.backupPath === undefined) {
    return {
      configured: true,
      ok: false,
      status: "failed",
      message: "Latest backup marker is incomplete or failed."
    };
  }

  if (
    options.databaseKind !== undefined &&
    ((latest.databaseKind !== undefined && latest.databaseKind !== options.databaseKind) ||
      (latest.databaseKind === undefined && options.databaseKind === "postgresql"))
  ) {
    return {
      configured: true,
      ok: false,
      status: "failed",
      message: `Latest backup marker does not match the ${options.databaseKind} database runtime.`
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
  database: BasecampDatabase,
  options: {
    version: string;
    databaseKind?: DatabaseKind;
    databasePath?: string;
    databaseUrlConfigured?: boolean;
    storageDir?: string;
    backupDir?: string;
    adminTokenConfigured: boolean;
    localAuthMode?: OperationalStatus["security"]["localAuthMode"];
    localUsersConfigured?: boolean;
    adminTokenPlaceholder?: boolean;
    webUrl?: string;
    remoteAccessMode?: OperationalStatus["security"]["remoteAccessMode"];
    deploymentProfile?: DeploymentProfile;
    now?: string;
  }
): OperationalStatus {
  const checkedAt = options.now ?? new Date().toISOString();
  const migrationCount = tableExists(database, "schema_migrations")
    ? ((database.prepare("SELECT COUNT(*) as count FROM schema_migrations").get() as { count: number }).count)
    : 0;
  const kind = options.databaseKind ?? "sqlite";
  const databaseWritable =
    kind === "postgresql"
      ? true
      : canWriteDirectory(options.databasePath === undefined ? undefined : path.dirname(options.databasePath));
  const storageWritable = canWriteDirectory(options.storageDir);
  const backup = readBackupStatus(options.backupDir, { now: checkedAt, databaseKind: kind });
  const databaseOk = migrationCount > 0 && databaseWritable;
  const storageOk = storageWritable;

  const localAuthMode = options.localAuthMode ?? "disabled";
  const localUsersConfigured = options.localUsersConfigured ?? false;
  const authOk = localAuthMode === "local" ? localUsersConfigured : options.adminTokenConfigured;

  return {
    ok: databaseOk && storageOk && backup.configured && authOk,
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
      kind,
      writable: databaseWritable,
      migrated: migrationCount > 0,
      migrationCount,
      pathConfigured: kind === "postgresql" ? options.databaseUrlConfigured === true : options.databasePath !== undefined
    },
    storage: {
      ok: storageOk,
      writable: storageWritable,
      pathConfigured: options.storageDir !== undefined
    },
    deployment: {
      profile: options.deploymentProfile ?? "unknown"
    },
    backup,
    security: {
      adminTokenConfigured: options.adminTokenConfigured,
      localAuthMode,
      localUsersConfigured,
      adminTokenPlaceholder: options.adminTokenPlaceholder ?? false,
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

function writeLatestBackupMarker(
  backupDir: string,
  marker: {
    backupPath: string;
    createdAt: string;
    databaseKind: DatabaseKind;
  }
): void {
  writeFileSync(
    path.join(backupDir, "latest-backup.json"),
    `${JSON.stringify({ ...marker, ok: true }, null, 2)}\n`
  );
}

function databaseRows(database: BasecampDatabase): Record<string, DatabaseRow[]> {
  return Object.fromEntries(
    databaseTableNames(database).map((table) => [
      table,
      database.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all().map(normalizeRow)
    ])
  );
}

function databaseTableNames(database: BasecampDatabase): string[] {
  return database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name);
}

function activeLocalUserCount(database: BasecampDatabase): number {
  if (!tableExists(database, "local_users")) {
    return 0;
  }

  const row = database.prepare("SELECT COUNT(*) as count FROM local_users WHERE status = 'active'").get() as {
    count: number;
  };

  return row.count;
}

function tableExists(database: BasecampDatabase, table: string): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);

  return row !== undefined;
}

function insertRows(database: BasecampDatabase, table: string, rows: DatabaseRow[]): void {
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

function tableColumns(database: BasecampDatabase, table: string): Set<string> {
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
      storageKey?: string;
      contentHash?: string;
    };
    const id = String(row.id);
    const fileName = metadata.fileName ?? `${id}.evidence`;
    const sourceUri = portableSourceUri(metadata.localUri);
    const storageKey = portableStorageKey(metadata.storageKey);

    return {
      evidenceId: id,
      title: String(row.title ?? id),
      status: String(row.status ?? "active"),
      ...(sourceUri === undefined ? {} : { sourceUri }),
      ...(metadata.fileName === undefined ? {} : { fileName: metadata.fileName }),
      ...(storageKey === undefined ? {} : { storageKey }),
      ...(metadata.contentHash === undefined ? {} : { contentHash: metadata.contentHash }),
      portablePath: storageKey ?? `evidence/${id}/${fileName}`,
      includedInArchive: false
    };
  });
}

function portableSourceUri(value: string | undefined): string | undefined {
  if (value === undefined || isHostFilesystemReference(value)) {
    return undefined;
  }

  return value;
}

function portableStorageKey(value: string | undefined): string | undefined {
  if (value === undefined || value.startsWith("/") || value.includes("..") || isHostFilesystemReference(value)) {
    return undefined;
  }

  return value;
}

function isHostFilesystemReference(value: string): boolean {
  return (
    value.startsWith("file:") ||
    value.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    /\/Users\/[^/]+/.test(value) ||
    /\/home\/[^/]+/.test(value) ||
    /[A-Za-z]:[\\/]Users[\\/][^\\/]+/.test(value)
  );
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

function normalizeBackupManifest(manifest: BackupManifest): BackupManifest {
  if (manifest.deployment !== undefined) {
    return manifest;
  }

  return {
    ...manifest,
    deployment: {
      profile: "unknown",
      databaseKind: "sqlite",
      storageKind: "filesystem",
      backupDestination: "local-disk",
      configIncluded: manifest.config !== undefined,
      tableCounts: {},
      localUserCount: 0,
      storageFileCount: manifest.storage.length
    }
  };
}

function sqliteTableCounts(databasePath: string): Record<string, number> {
  const database = new DatabaseSync(databasePath);

  try {
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);

    return Object.fromEntries(
      tables.map((table) => {
        const row = database.prepare(`SELECT COUNT(*) as count FROM ${quoteIdentifier(table)}`).get() as {
          count: number;
        };

        return [table, row.count];
      })
    );
  } finally {
    database.close();
  }
}

function sqliteActiveLocalUserCount(databasePath: string): number {
  const database = new DatabaseSync(databasePath);

  try {
    if (!tableExists(database, "local_users")) {
      return 0;
    }

    const row = database.prepare("SELECT COUNT(*) as count FROM local_users WHERE status = 'active'").get() as {
      count: number;
    };

    return row.count;
  } finally {
    database.close();
  }
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
