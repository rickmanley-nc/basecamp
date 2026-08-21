CREATE TABLE IF NOT EXISTS evidence_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  links_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  supersedes_evidence_id TEXT REFERENCES evidence_records(id),
  deletion_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_progress (
  skill_id TEXT PRIMARY KEY,
  name TEXT,
  category_id TEXT REFERENCES categories(id),
  state TEXT NOT NULL,
  training_records_json TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL,
  last_practiced_at TEXT,
  validated_at TEXT,
  expires_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_records (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skill_progress(skill_id),
  course_name TEXT NOT NULL,
  provider TEXT,
  completed_at TEXT NOT NULL,
  expires_at TEXT,
  evidence_ids_json TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS drill_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  scenario TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  success_criteria_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  recommended_quest_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drill_runs (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES drill_templates(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  result TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT NOT NULL,
  criteria_results_json TEXT NOT NULL,
  failures_json TEXT NOT NULL,
  lessons TEXT,
  evidence_ids_json TEXT NOT NULL,
  follow_up_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS evidence_records_status_idx ON evidence_records(status);
CREATE INDEX IF NOT EXISTS skill_progress_category_id_idx ON skill_progress(category_id);
CREATE INDEX IF NOT EXISTS training_records_skill_id_idx ON training_records(skill_id);
CREATE INDEX IF NOT EXISTS drill_templates_category_id_idx ON drill_templates(category_id);
CREATE INDEX IF NOT EXISTS drill_runs_template_id_idx ON drill_runs(template_id);
CREATE INDEX IF NOT EXISTS drill_runs_category_id_idx ON drill_runs(category_id);
