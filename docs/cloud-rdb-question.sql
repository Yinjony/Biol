-- CloudBase RDB (PostgreSQL): question table used by this mini program.
-- Run this once in the CloudBase RDB SQL console if the table does not exist yet.

CREATE TABLE IF NOT EXISTS question (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(16) NOT NULL CHECK (type IN ('CHOICE', 'JUDGE')),
  content TEXT NOT NULL,
  options JSONB,
  answer VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_created_at ON question (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_type ON question (type);

CREATE OR REPLACE FUNCTION set_question_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_question_updated_at ON question;
CREATE TRIGGER trg_question_updated_at
BEFORE UPDATE ON question
FOR EACH ROW
EXECUTE FUNCTION set_question_updated_at();
