const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { initDb, mapQuestion, pool } = require('./db')
const { parseQuestionDocument } = require('./document-parser')

const app = express()
const port = Number(process.env.PORT || 3000)

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.get('/api/questions', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim()
    const page = clampInt(req.query.page, 1, 100000, 1)
    const pageSize = clampInt(req.query.pageSize, 1, 100, 8)
    const whereSql = search ? 'WHERE content ILIKE $1' : ''
    const params = search ? [`%${search}%`] : []
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM "Question" ${whereSql}`,
      params
    )
    const total = countResult.rows[0].total
    const offset = (page - 1) * pageSize
    const listResult = await pool.query(
      `
      SELECT id::text, type, content, options, answer, "createdAt", "updatedAt"
      FROM "Question"
      ${whereSql}
      ORDER BY "createdAt" DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, pageSize, offset]
    )
    const stats = await getStats()

    res.json({
      ok: true,
      data: listResult.rows.map(mapQuestion),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      stats,
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/questions/random', async (req, res, next) => {
  try {
    const count = clampInt(req.query.count, 1, 100, 10)
    const result = await pool.query(
      `
      SELECT id::text, type, content, options, answer, "createdAt", "updatedAt"
      FROM "Question"
      ORDER BY random()
      LIMIT $1
      `,
      [count]
    )

    res.json({
      ok: true,
      data: result.rows.map(mapQuestion),
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/questions/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT id::text, type, content, options, answer, "createdAt", "updatedAt"
      FROM "Question"
      WHERE id = $1
      `,
      [req.params.id]
    )

    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, message: '题目不存在' })
      return
    }

    res.json({ ok: true, data: mapQuestion(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/questions/import', documentUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ ok: false, message: '请选择 Word 文件' })
      return
    }

    const result = await parseQuestionDocument(req.file)
    res.json({ ok: true, data: result.questions, invalid: result.invalid })
  } catch (error) {
    next(error)
  }
})

app.post('/api/questions', async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body)
    const result = await pool.query(
      `
      INSERT INTO "Question" (type, content, options, answer)
      VALUES ($1::question_type, $2, $3::jsonb, $4)
      RETURNING id::text, type, content, options, answer, "createdAt", "updatedAt"
      `,
      [payload.type, payload.content, payload.options, payload.answer]
    )

    res.status(201).json({ ok: true, data: mapQuestion(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.put('/api/questions/:id', async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body)
    const result = await pool.query(
      `
      UPDATE "Question"
      SET type = $1::question_type,
          content = $2,
          options = $3::jsonb,
          answer = $4
      WHERE id = $5
      RETURNING id::text, type, content, options, answer, "createdAt", "updatedAt"
      `,
      [payload.type, payload.content, payload.options, payload.answer, req.params.id]
    )

    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, message: '题目不存在' })
      return
    }

    res.json({ ok: true, data: mapQuestion(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/questions/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM "Question" WHERE id = $1', [req.params.id])

    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, message: '题目不存在' })
      return
    }

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({
    ok: false,
    message: error.message || '服务器错误',
  })
})

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Bio question API listening at http://127.0.0.1:${port}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize database')
    console.error(error)
    process.exit(1)
  })

async function getStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE type = 'CHOICE')::int AS choice,
      COUNT(*) FILTER (WHERE type = 'JUDGE')::int AS judge
    FROM "Question"
  `)
  return result.rows[0]
}

function normalizePayload(body) {
  const type = String(body.type || '').trim()
  const content = String(body.content || '').trim()
  const answer = String(body.answer || '').trim()
  const options = type === 'CHOICE' ? JSON.stringify(body.options || []) : null

  if (!['CHOICE', 'JUDGE'].includes(type)) {
    throw new Error('题型不正确')
  }

  if (!content) {
    throw new Error('题干不能为空')
  }

  if (!answer) {
    throw new Error('答案不能为空')
  }

  return { type, content, options, answer }
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}
