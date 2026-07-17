CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM ('CHOICE', 'JUDGE');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Question" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type question_type NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  answer VARCHAR(10) NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_content_trgm
  ON "Question" USING gin (content gin_trgm_ops);
