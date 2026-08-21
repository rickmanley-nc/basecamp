CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  maturity TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS location_relationships (
  id TEXT PRIMARY KEY,
  parent_location_id TEXT NOT NULL REFERENCES locations(id),
  child_location_id TEXT NOT NULL REFERENCES locations(id),
  relationship TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS location_readiness (
  location_id TEXT NOT NULL REFERENCES locations(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  source_capability_outpost_id TEXT,
  validated_at TEXT,
  PRIMARY KEY (location_id, category_id)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  state TEXT NOT NULL,
  functional_requirement TEXT,
  unit TEXT,
  capability_state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_lots (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  location_id TEXT NOT NULL REFERENCES locations(id),
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  state TEXT NOT NULL,
  expires_at TEXT,
  acquired_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inventory_items(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  location_id TEXT REFERENCES locations(id),
  state TEXT NOT NULL,
  serial_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_tags (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  tag_code TEXT NOT NULL UNIQUE,
  qr_payload TEXT NOT NULL,
  lookup_path TEXT NOT NULL,
  print_label TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location_id TEXT REFERENCES locations(id),
  category_id TEXT REFERENCES categories(id),
  state TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kit_items (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL REFERENCES kits(id),
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  required_quantity REAL NOT NULL,
  present_quantity REAL NOT NULL,
  required INTEGER NOT NULL,
  state TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS inventory_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  item_id TEXT REFERENCES inventory_items(id),
  asset_id TEXT REFERENCES assets(id),
  lot_id TEXT REFERENCES inventory_lots(id),
  from_location_id TEXT REFERENCES locations(id),
  to_location_id TEXT REFERENCES locations(id),
  quantity_delta REAL,
  unit TEXT,
  state_after TEXT,
  notes TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  asset_id TEXT REFERENCES assets(id),
  item_id TEXT REFERENCES inventory_items(id),
  location_id TEXT REFERENCES locations(id),
  category_id TEXT REFERENCES categories(id),
  interval_count INTEGER NOT NULL,
  interval_unit TEXT NOT NULL,
  active INTEGER NOT NULL,
  last_completed_at TEXT,
  next_due_at TEXT,
  instructions TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_events (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES maintenance_policies(id),
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  next_due_at TEXT,
  notes TEXT,
  follow_up_quest_title TEXT
);

CREATE INDEX IF NOT EXISTS locations_kind_idx ON locations(kind);
CREATE INDEX IF NOT EXISTS inventory_items_category_id_idx ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS inventory_lots_item_location_idx ON inventory_lots(item_id, location_id);
CREATE INDEX IF NOT EXISTS assets_location_id_idx ON assets(location_id);
CREATE INDEX IF NOT EXISTS asset_tags_asset_id_idx ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS kits_location_id_idx ON kits(location_id);
CREATE INDEX IF NOT EXISTS inventory_events_occurred_at_idx ON inventory_events(occurred_at);
CREATE INDEX IF NOT EXISTS maintenance_policies_next_due_idx ON maintenance_policies(next_due_at);
