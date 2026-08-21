CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  result TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_action_idx ON audit_events(action);
CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events(occurred_at);
