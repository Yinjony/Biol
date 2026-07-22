const config = require('../config')
const { getCurrentOwnerKey } = require('./current-user')

const QUESTION_FIELDS = 'id,type,content,options,answer,createdAt,updatedAt'

function getQuestionTable() {
  const cloudbase = getApp().globalData.cloudbase
  if (!cloudbase || typeof cloudbase.rdb !== 'function') {
    throw new Error('CloudBase RDB is unavailable. Check app.js initialization first.')
  }

  return cloudbase.rdb().from(config.rdbQuestionTable)
}

async function fetchQuestionPage({ search = '', page = 1, pageSize = 8, ownerOnly = false } = {}) {
  const offset = (Math.max(page, 1) - 1) * pageSize
  const ownerKey = ownerOnly ? await getCurrentOwnerKey() : ''
  let query = getQuestionTable()
    .select(QUESTION_FIELDS, { count: 'exact' })
    .order('createdAt', { ascending: false })

  if (ownerKey) {
    query = query.eq('owner_key', ownerKey)
  }

  if (search) {
    query = query.ilike('content', `%${escapeLike(search)}%`)
  }

  const [pageResult, stats] = await Promise.all([
    query.range(offset, offset + pageSize - 1),
    fetchStats(ownerOnly).catch((error) => {
      console.warn('Failed to load question statistics.', error)
      return { total: 0, choice: 0, judge: 0 }
    }),
  ])
  assertSuccess(pageResult.error, 'query question table')

  const total = Number(pageResult.count || 0)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageIndex = Math.min(Math.max(page, 1), pageCount)

  return {
    source: 'database',
    questions: (pageResult.data || []).map(mapQuestion),
    total,
    page: pageIndex,
    pageSize,
    pageCount,
    stats,
  }
}

async function fetchRandomQuestions(count) {
  const totalResult = await getQuestionTable().select('id', { count: 'exact', head: true })
  assertSuccess(totalResult.error, 'count questions')

  const total = Number(totalResult.count || 0)
  if (total === 0) {
    return { source: 'database', questions: [] }
  }

  const size = Math.min(count, total)
  const offset = Math.floor(Math.random() * (total - size + 1))
  const result = await getQuestionTable()
    .select(QUESTION_FIELDS)
    .order('createdAt', { ascending: false })
    .range(offset, offset + size - 1)
  assertSuccess(result.error, 'query random questions')

  return {
    source: 'database',
    questions: shuffle((result.data || []).map(mapQuestion)),
  }
}

async function getQuestionById(id) {
  // Query records by id using the CloudBase RDB API.
  const { data, error } = await getQuestionTable()
    .select(QUESTION_FIELDS)
    .eq('id', id)
  assertSuccess(error, 'query question by id')

  const rows = Array.isArray(data) ? data : []
  return {
    source: 'database',
    question: rows[0] ? mapQuestion(rows[0]) : null,
  }
}

async function createQuestion(payload) {
  const result = await writeQuestion('create', { payload })

  return {
    source: 'database',
    question: mapQuestion(result.question),
  }
}

async function updateQuestion(id, payload) {
  const result = await writeQuestion('update', { id, payload })

  return {
    source: 'database',
    question: mapQuestion(result.question),
  }
}

async function deleteQuestion(id) {
  await writeQuestion('delete', { id })

  return { source: 'database' }
}

async function fetchStats(ownerOnly) {
  const result = await writeQuestion('stats', { ownerOnly: Boolean(ownerOnly) })
  return result.stats || { total: 0, choice: 0, judge: 0 }
}

function mapQuestion(row) {
  if (!row) return null

  return {
    id: row.id === undefined || row.id === null ? '' : String(row.id),
    type: row.type,
    content: row.content,
    options: normalizeOptions(row.options),
    answer: row.answer,
    createdAt: row.created_at || row.createdAt || '',
    updatedAt: row.updated_at || row.updatedAt || '',
  }
}

async function writeQuestion(action, data) {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    throw new Error('Cloud functions are unavailable. Check app.js initialization first.')
  }

  const result = await wx.cloud.callFunction({
    name: 'questionWrite',
    data: { action, ...data },
  })
  const payload = result && result.result || {}
  if (payload.ok === false) {
    throw new Error(payload.message || 'question write failed')
  }
  return payload
}

function normalizeOptions(options) {
  if (Array.isArray(options)) return options
  if (typeof options !== 'string') return options || null

  try {
    const parsed = JSON.parse(options)
    if (Array.isArray(parsed)) return parsed
    if (typeof parsed === 'string') {
      const nestedParsed = JSON.parse(parsed)
      return Array.isArray(nestedParsed) ? nestedParsed : null
    }
    return null
  } catch (error) {
    return null
  }
}

function assertSuccess(error, operation) {
  if (error) {
    throw new Error(`${operation} failed: ${error.message || error.code || 'unknown error'}`)
  }
}

function escapeLike(value) {
  return String(value).replace(/[%_]/g, '\\$&')
}

function shuffle(items) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = current
  }
  return shuffled
}

module.exports = {
  fetchQuestionPage,
  fetchRandomQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
}
