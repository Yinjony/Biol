const config = require('../config')

function getQuestionTable() {
  const cloudbase = getApp().globalData.cloudbase
  if (!cloudbase || typeof cloudbase.rdb !== 'function') {
    throw new Error('CloudBase RDB is unavailable. Check app.js initialization first.')
  }

  return cloudbase.rdb().from(config.rdbQuestionTable)
}

async function fetchQuestionPage({ search = '', page = 1, pageSize = 8 } = {}) {
  const questions = await fetchAllQuestions()
  const matchedQuestions = questions
    .filter((question) => containsText(question.content, search))
    .sort(sortByNewest)
  const total = matchedQuestions.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageIndex = Math.min(Math.max(page, 1), pageCount)
  const offset = (pageIndex - 1) * pageSize

  return {
    source: 'database',
    questions: matchedQuestions.slice(offset, offset + pageSize),
    total,
    page: pageIndex,
    pageSize,
    pageCount,
    stats: getStats(questions),
  }
}

async function fetchRandomQuestions(count) {
  const questions = await fetchAllQuestions()
  return {
    source: 'database',
    questions: shuffle(questions).slice(0, count),
  }
}

async function getQuestionById(id) {
  // Query records by id using the CloudBase RDB API.
  const { data, error } = await getQuestionTable()
    .select('*')
    .eq('id', id)
  assertSuccess(error, 'query question by id')

  const rows = Array.isArray(data) ? data : []
  return {
    source: 'database',
    question: rows[0] ? mapQuestion(rows[0]) : null,
  }
}

async function createQuestion(payload) {
  // Insert a new question using the CloudBase RDB API.
  const { data, error } = await getQuestionTable().insert(toRdbRecord(payload))
  assertSuccess(error, 'insert question')

  return {
    source: 'database',
    question: mapFirstQuestion(data, payload),
  }
}

async function updateQuestion(id, payload) {
  // Update the matching question using update(...).eq('id', id).
  const { data, error } = await getQuestionTable()
    .update(toRdbRecord(payload))
    .eq('id', id)
  assertSuccess(error, 'update question')

  return {
    source: 'database',
    question: mapFirstQuestion(data, { id, ...payload }),
  }
}

async function deleteQuestion(id) {
  // Delete the matching question using delete().eq('id', id).
  const { error } = await getQuestionTable()
    .delete()
    .eq('id', id)
  assertSuccess(error, 'delete question')

  return { source: 'database' }
}

async function fetchAllQuestions() {
  // Query the question table through the initialized app-level CloudBase client.
  const { data, error } = await getQuestionTable()
    .select('*')
  assertSuccess(error, 'query question table')

  return (Array.isArray(data) ? data : []).map(mapQuestion)
}

function toRdbRecord(payload) {
  return {
    type: payload.type,
    content: payload.content,
    options: payload.type === 'CHOICE' ? payload.options || [] : null,
    answer: payload.answer,
  }
}

function mapFirstQuestion(data, fallback) {
  const row = Array.isArray(data) ? data[0] : data
  return mapQuestion(row || fallback)
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

function normalizeOptions(options) {
  if (Array.isArray(options)) return options
  if (typeof options !== 'string') return options || null

  try {
    return JSON.parse(options)
  } catch (error) {
    return null
  }
}

function assertSuccess(error, operation) {
  if (error) {
    throw new Error(`${operation} failed: ${error.message || error.code || 'unknown error'}`)
  }
}

function getStats(questions) {
  return {
    total: questions.length,
    choice: questions.filter((question) => question.type === 'CHOICE').length,
    judge: questions.filter((question) => question.type === 'JUDGE').length,
  }
}

function containsText(content, search) {
  const query = String(search || '').trim().toLowerCase()
  return !query || String(content || '').toLowerCase().includes(query)
}

function sortByNewest(first, second) {
  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
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
