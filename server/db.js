const path = require('path')
const dotenv = require('dotenv')
const mysql = require('mysql2/promise')

dotenv.config({ path: path.join(__dirname, '.env') })

const pool = mysql.createPool(createConnectionOptions())

const schemaSql = `
CREATE TABLE IF NOT EXISTS question (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type ENUM('CHOICE', 'JUDGE') NOT NULL,
  content TEXT NOT NULL,
  options JSON NULL,
  answer VARCHAR(10) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_question_created_at (createdAt),
  INDEX idx_question_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function initDb() {
  await pool.query(schemaSql)
}

function createConnectionOptions() {
  const databaseUrl = process.env.DATABASE_URL
  const options = databaseUrl ? parseDatabaseUrl(databaseUrl) : {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
  }

  return {
    ...options,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  }
}

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl)
  if (url.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use the mysql:// protocol.')
  }

  const database = url.pathname.slice(1)
  if (!url.hostname || !database) {
    throw new Error('DATABASE_URL must include a database host and name.')
  }

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    database,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  }
}

function mapQuestion(row) {
  if (!row) return null

  return {
    id: String(row.id),
    type: row.type,
    content: row.content,
    options: parseOptions(row.options),
    answer: row.answer,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function parseOptions(options) {
  if (typeof options !== 'string') return options

  try {
    return JSON.parse(options)
  } catch (error) {
    return null
  }
}

module.exports = {
  pool,
  initDb,
  mapQuestion,
}
