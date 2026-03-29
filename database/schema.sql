-- Knowledge Decay Predictor — PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Topics
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    difficulty  VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    description TEXT,
    tags        TEXT[],
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_user_id ON topics(user_id);

-- ─────────────────────────────────────────
-- Study Sessions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    study_duration  INTEGER NOT NULL,   -- minutes
    notes           TEXT,
    session_date    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_topic_id ON study_sessions(topic_id);

-- ─────────────────────────────────────────
-- Quiz Results
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score           INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    total_questions INTEGER NOT NULL DEFAULT 10,
    time_taken      INTEGER,            -- seconds
    attempt_number  INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_topic_id ON quiz_results(topic_id);

-- ─────────────────────────────────────────
-- Review Records
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_count    INTEGER NOT NULL DEFAULT 1,
    last_reviewed   TIMESTAMPTZ DEFAULT NOW(),
    next_review     TIMESTAMPTZ,
    retention_score FLOAT,              -- 0.0 to 1.0
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic_id, user_id)
);

CREATE INDEX idx_reviews_next_review ON reviews(next_review);

-- ─────────────────────────────────────────
-- Predictions Cache
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id                UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    retention_rule_based    FLOAT NOT NULL,
    retention_ml            FLOAT,
    predicted_at            TIMESTAMPTZ DEFAULT NOW(),
    model_version           VARCHAR(50) DEFAULT 'v1.0'
);

-- ─────────────────────────────────────────
-- Seed Demo User
-- ─────────────────────────────────────────
-- password: demo1234 (bcrypt hash)
INSERT INTO users (id, email, name, password_hash) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'demo@knowdecay.ai',
   'Demo User',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgRzBcAHpFYMgJZEqvB1dG')
ON CONFLICT DO NOTHING;
