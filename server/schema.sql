CREATE TABLE IF NOT EXISTS glucose_measurements (
  id text NOT NULL,
  user_id text NOT NULL,
  value double precision NOT NULL,
  type text NOT NULL,
  timestamp bigint NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

CREATE INDEX IF NOT EXISTS glucose_measurements_user_timestamp_idx
  ON glucose_measurements (user_id, timestamp DESC);
