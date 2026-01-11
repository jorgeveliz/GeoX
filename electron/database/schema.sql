-- Collars table
CREATE TABLE IF NOT EXISTS collars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hole_id TEXT UNIQUE NOT NULL,
  east REAL,
  north REAL,
  rl REAL,
  depth REAL,
  end_date TEXT,
  prospect_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_collar_hole_id ON collars(hole_id);

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hole_id TEXT NOT NULL,
  depth REAL,
  azimuth REAL,
  dip REAL,
  FOREIGN KEY (hole_id) REFERENCES collars(hole_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_hole_id ON surveys(hole_id);
CREATE INDEX IF NOT EXISTS idx_survey_depth ON surveys(depth);

-- Assays table
CREATE TABLE IF NOT EXISTS assays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hole_id TEXT NOT NULL,
  from_depth REAL,
  to_depth REAL,
  grade REAL,
  element TEXT,
  FOREIGN KEY (hole_id) REFERENCES collars(hole_id)
);

CREATE INDEX IF NOT EXISTS idx_assay_hole_id ON assays(hole_id);
CREATE INDEX IF NOT EXISTS idx_assay_depth ON assays(from_depth, to_depth);

-- 3D Coordinates cache
CREATE TABLE IF NOT EXISTS coordinates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hole_id TEXT NOT NULL,
  depth REAL,
  x REAL,
  y REAL,
  z REAL,
  FOREIGN KEY (hole_id) REFERENCES collars(hole_id)
);

CREATE INDEX IF NOT EXISTS idx_coord_hole_id ON coordinates(hole_id);
