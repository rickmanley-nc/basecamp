import { receiveMessageOnPort, MessageChannel, Worker } from "node:worker_threads";
import type {
  BasecampDatabase,
  BasecampStatement,
  BasecampStatementResult
} from "./connection";

export interface PostgresDatabaseSyncOptions {
  connectionString: string;
  ssl?: false | { rejectUnauthorized: boolean };
  timeoutMs?: number;
}

interface WorkerResponse {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export class PostgresDatabaseSync implements BasecampDatabase {
  readonly kind = "postgresql";
  private readonly timeoutMs: number;
  private readonly worker: Worker;
  private closed = false;

  constructor(options: PostgresDatabaseSyncOptions) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.worker = new Worker(new URL("./postgres-sync-worker.js", import.meta.url), {
      workerData: {
        connectionString: options.connectionString,
        ssl: options.ssl ?? false
      }
    });
  }

  exec(sql: string): void {
    this.request("exec", sql, []);
  }

  prepare(sql: string): BasecampStatement {
    return new PostgresStatementSync(this, sql);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    try {
      this.request("close", "", []);
    } finally {
      this.closed = true;
      void this.worker.terminate();
    }
  }

  query(operation: "all" | "get" | "run", sql: string, params: unknown[]): unknown {
    return this.request(operation, sql, params);
  }

  private request(operation: string, sql: string, params: unknown[]): unknown {
    if (this.closed && operation !== "close") {
      throw new Error("PostgreSQL database connection is already closed.");
    }

    const signal = new Int32Array(new SharedArrayBuffer(4));
    const { port1, port2 } = new MessageChannel();

    this.worker.postMessage(
      {
        operation,
        sql,
        params,
        responsePort: port2,
        signal
      },
      [port2]
    );

    const result = Atomics.wait(signal, 0, 0, this.timeoutMs);

    if (result === "timed-out") {
      port1.close();
      throw new Error(`PostgreSQL operation timed out after ${this.timeoutMs}ms.`);
    }

    const message = receiveMessageOnPort(port1)?.message as WorkerResponse | undefined;
    port1.close();

    if (message === undefined) {
      throw new Error("PostgreSQL worker did not return a response.");
    }

    if (!message.ok) {
      throw new Error(message.error ?? "PostgreSQL operation failed.");
    }

    return message.value;
  }
}

class PostgresStatementSync implements BasecampStatement {
  constructor(
    private readonly database: PostgresDatabaseSync,
    private readonly sql: string
  ) {}

  all(...params: unknown[]): unknown[] {
    return this.database.query("all", this.sql, params) as unknown[];
  }

  get(...params: unknown[]): unknown {
    return this.database.query("get", this.sql, params);
  }

  run(...params: unknown[]): BasecampStatementResult {
    return this.database.query("run", this.sql, params) as BasecampStatementResult;
  }
}

export function createPostgresDatabaseSync(options: PostgresDatabaseSyncOptions): PostgresDatabaseSync {
  return new PostgresDatabaseSync(options);
}
