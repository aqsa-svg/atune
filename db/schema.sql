-- Attune schema — PostgreSQL (Cohesivity/Neon over HTTP)
-- Idempotent: safe to re-run. Executed as one transaction via scripts/db-exec.mjs.

-- Users mirror the Cohesivity social-login identity (user.id is a number).
CREATE TABLE IF NOT EXISTS app_user (
  id            BIGINT PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT,
  picture       TEXT,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  onboarded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Onboarding answers — the seed of personalization.
CREATE TABLE IF NOT EXISTS profile (
  user_id      BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  wake_time    TEXT,              -- 'HH:MM'
  sleep_time   TEXT,              -- 'HH:MM'
  goals        TEXT[] NOT NULL DEFAULT '{}',   -- sleep | stress | focus | move | ...
  low_periods  TEXT[] NOT NULL DEFAULT '{}',   -- monday_morning | evenings | ...
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The handful of habits a user chose to track.
CREATE TABLE IF NOT EXISTS habit (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  emoji       TEXT,
  sort        INT NOT NULL DEFAULT 0,
  archived    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS habit_user_idx ON habit(user_id) WHERE archived = FALSE;

-- One check-in row per user per day (mood, energy, sleep, free note).
CREATE TABLE IF NOT EXISTS daily_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL,
  mood         SMALLINT,          -- 1..5
  energy       SMALLINT,          -- 1..5
  sleep_hours  NUMERIC(3,1),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

-- Per-habit completion for a given day.
CREATE TABLE IF NOT EXISTS habit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  habit_id    BIGINT NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, log_date)
);
CREATE INDEX IF NOT EXISTS habit_log_user_date_idx ON habit_log(user_id, log_date);

-- Generated insights (day-one suggestion, daily coach, patterns).
-- `grounding` is the human-readable receipt of the data behind it.
CREATE TABLE IF NOT EXISTS insight (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  insight_date  DATE NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'daily',  -- day_one | daily | pattern
  body          TEXT NOT NULL,
  grounding     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, insight_date, kind)
);

-- Freemium state (Stripe wired later).
CREATE TABLE IF NOT EXISTS subscription (
  user_id                BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  tier                   TEXT NOT NULL DEFAULT 'free',   -- free | premium
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT,
  current_period_end     TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
