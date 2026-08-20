CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seed_imports (
  schema_version TEXT PRIMARY KEY,
  generated_on TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  criticality TEXT NOT NULL,
  default_pursuit_state TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capability_levels (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quest_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  target_level INTEGER NOT NULL REFERENCES capability_levels(number),
  taxonomy_json TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  estimated_cost_usd INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  priority TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  validation TEXT NOT NULL,
  dependencies_json TEXT NOT NULL,
  accomplishments_json TEXT NOT NULL,
  friction_goal_json TEXT,
  bom_json TEXT
);

CREATE INDEX IF NOT EXISTS quest_templates_category_id_idx ON quest_templates(category_id);
CREATE INDEX IF NOT EXISTS quest_templates_priority_idx ON quest_templates(priority);
