CREATE TABLE IF NOT EXISTS category_pursuits (
  category_id TEXT PRIMARY KEY REFERENCES categories(id),
  pursuit_state TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quest_instances (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL UNIQUE REFERENCES quest_templates(id),
  status TEXT NOT NULL,
  selected_by_user INTEGER NOT NULL,
  category_pursuit_state TEXT NOT NULL,
  progress_percent INTEGER NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  snoozed_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quest_events (
  id TEXT PRIMARY KEY,
  quest_instance_id TEXT NOT NULL REFERENCES quest_instances(id),
  template_id TEXT NOT NULL REFERENCES quest_templates(id),
  action TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS quest_instances_status_idx ON quest_instances(status);
CREATE INDEX IF NOT EXISTS quest_events_template_id_idx ON quest_events(template_id);
CREATE INDEX IF NOT EXISTS xp_events_source_idx ON xp_events(source_type, source_id);
