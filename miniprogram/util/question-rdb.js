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
    fetchStats(ownerKey),
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
  // Insert a new question using the CloudBase RDB API.
  const ownerKey = await getCurrentOwnerKey()
  const record = {
    id: createUuid(),
    owner_key: ownerKey,
    ...toRdbRecord(payload),
  }
  const { data, error } = await getQuestionTable().insert(record)
  assertSuccess(error, 'insert question')

  return {
    source: 'database',
    question: mapFirstQuestion(data, record),
  }
}

async function updateQuestion(id, payload) {
  // Update the matching question using update(...).eq('id', id).
  const { data, error, count } = await getQuestionTable()
    .update(toRdbRecord(payload), { count: 'exact' })
    .eq('id', id)
  assertSuccess(error, 'update question')
  assertAffected(count, 'update question')

  return {
    source: 'database',
    question: mapFirstQuestion(data, { id, ...payload }),
  }
}

async function deleteQuestion(id) {
  // Delete the matching question using delete().eq('id', id).
  const { error, count } = await getQuestionTable()
    .delete({ count: 'exact' })
    .eq('id', id)
  assertSuccess(error, 'delete question')
  assertAffected(count, 'delete question')

  return { source: 'database' }
}

async function fetchStats(ownerKey = '') {
  const [totalResult, choiceResult, judgeResult] = await Promise.all([
    createCountQuery(ownerKey),
    createCountQuery(ownerKey, 'CHOICE'),
    createCountQuery(ownerKey, 'JUDGE'),
  ])
  assertSuccess(totalResult.error, 'count questions')
  assertSuccess(choiceResult.error, 'count choice questions')
  assertSuccess(judgeResult.error, 'count judge questions')

  return {
    total: Number(totalResult.count || 0),
    choice: Number(choiceResult.count || 0),
    judge: Number(judgeResult.count || 0),
  }
}

function createCountQuery(ownerKey, type) {
  let query = getQuestionTable().select('id', { count: 'exact', head: true })
  if (ownerKey) query = query.eq('owner_key', ownerKey)
  if (type) query = query.eq('type', type)
  return query
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

function assertAffected(count, operation) {
  if (Number(count) === 0) {
    throw new Error(`${operation} did not affect any record. Check the record id and RDB write permissions.`)
  }
}

function escapeLike(value) {
  return String(value).replace(/[%_]/g, '\\$&')
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
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
