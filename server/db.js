const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

dotenv.config({ path: path.join(__dirname, '.env') })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'Biol_DB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Yinjojony',
  max: 10,
})

const schemaSql = `
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

CREATE OR REPLACE FUNCTION set_question_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_question_updated_at ON "Question";
CREATE TRIGGER trg_question_updated_at
BEFORE UPDATE ON "Question"
FOR EACH ROW
EXECUTE FUNCTION set_question_updated_at();
`

async function initDb() {
  await pool.query(schemaSql)
}

function mapQuestion(row) {
  if (!row) return null

  return {
    id: row.id,
    type: row.type,
    content: row.content,
    options: row.options,
    answer: row.answer,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

module.exports = {
  pool,
  initDb,
  mapQuestion,
}
