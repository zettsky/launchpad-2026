CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_device_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'collecting', 'deciding', 'decided')),
  mode TEXT CHECK (mode IN ('auto', 'swipe')),
  swipe_count INTEGER,
  swiping_member_count INTEGER,
  meeting_lat REAL,
  meeting_lng REAL,
  meeting_zone TEXT CHECK (meeting_zone IN ('north', 'south', 'east', 'west')),
  deadline TEXT,
  decided_place_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  device_id TEXT NOT NULL,
  display_name TEXT,
  is_host INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, device_id)
);

CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  cuisines TEXT NOT NULL,
  budget_min INTEGER NOT NULL,
  budget_max INTEGER NOT NULL,
  dietary TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, member_id)
);

CREATE TABLE IF NOT EXISTS restaurant_candidates (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cuisine_tag TEXT,
  price_level INTEGER,
  rating REAL,
  distance_m REAL,
  photo_ref TEXT,
  lat REAL,
  lng REAL,
  rank INTEGER NOT NULL,
  UNIQUE(session_id, place_id)
);

CREATE TABLE IF NOT EXISTS swipes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  place_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, member_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_members_session ON members(session_id);
CREATE INDEX IF NOT EXISTS idx_preferences_session ON preferences(session_id);
CREATE INDEX IF NOT EXISTS idx_candidates_session ON restaurant_candidates(session_id);
CREATE INDEX IF NOT EXISTS idx_swipes_session_place ON swipes(session_id, place_id);
