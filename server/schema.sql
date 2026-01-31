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

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx
  ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS user_sessions_token_idx
  ON user_sessions (token_hash);
