CREATE TABLE IF NOT EXISTS sync_clients (
  client_id TEXT PRIMARY KEY,
  registered_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_cursor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_commands (
  server_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES sync_clients(client_id),
  local_sequence INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_version INTEGER,
  intent_json TEXT NOT NULL,
  status TEXT NOT NULL,
  policy TEXT NOT NULL,
  result_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL REFERENCES sync_commands(command_id),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  policy TEXT NOT NULL,
  reason TEXT NOT NULL,
  user_visible INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sync_commands_client_sequence_idx ON sync_commands(client_id, local_sequence);
CREATE INDEX IF NOT EXISTS sync_commands_server_sequence_idx ON sync_commands(server_sequence);
CREATE INDEX IF NOT EXISTS sync_conflicts_command_id_idx ON sync_conflicts(command_id);
