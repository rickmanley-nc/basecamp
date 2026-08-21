export type DatabaseKind = "sqlite" | "postgresql";

export interface BasecampStatementResult {
  changes: number | bigint;
  lastInsertRowid?: number | bigint;
}

export interface BasecampStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): BasecampStatementResult;
}

export interface BasecampDatabase {
  readonly kind?: DatabaseKind;
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): BasecampStatement;
}

export function databaseKind(database: BasecampDatabase): DatabaseKind {
  return database.kind ?? "sqlite";
}
