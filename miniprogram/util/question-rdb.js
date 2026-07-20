const config = require('../config')

let cloudbaseApp

function getCloudbaseApp() {
  if (cloudbaseApp) return cloudbaseApp

  // Keep this optional dependency lazy: a missing/stale miniprogram_npm build
  // must not prevent the question bank from falling back to the HTTP API.
  const cloudbase = require('@cloudbase/js-sdk')
  // RDB is an optional CloudBase SDK module and must be registered before init().
  require('@cloudbase/js-sdk/mysql')
  cloudbaseApp = cloudbase.init({ env: config.envId })
  return cloudbaseApp
}

function getQuestionTable() {
  if (!wx.cloud) {
    throw new Error('wx.cloud is unavailable. Cloud RDB requires a Cloud Development environment.')
  }

  const rdb = getCloudbaseApp().rdb()
  if (!rdb || typeof rdb.from !== 'function') {
    throw new Error('Cloud RDB is unavailable. Build the npm package in WeChat DevTools first.')
  }

  return rdb.from(config.rdbQuestionTable)
}

async function fetchQuestionPage({ search = '', page = 1, pageSize = 8 } = {}) {
  const offset = (page - 1) * pageSize
  let query = getQuestionTable()
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('content', `%${escapeLike(search)}%`)
  }

  const [pageResult, stats] = await Promise.all([
    query.range(offset, offset + pageSize - 1),
    fetchStats(),
  ])
  assertSuccess(pageResult, 'query question table')

  const total = Number(pageResult.count || 0)
  return {
    source: 'cloud-rdb',
    questions: (pageResult.data || []).map(mapQuestion),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    stats,
  }
}

async function fetchRandomQuestions(count) {
  const result = await getQuestionTable().select('*')
  assertSuccess(result, 'query question table')

  return {
    source: 'cloud-rdb',
    questions: shuffle((result.data || []).map(mapQuestion)).slice(0, count),
  }
}

async function getQuestionById(id) {
  const result = await getQuestionTable()
    .select('*')
    .eq('id', id)
    .maybeSingle()
  assertSuccess(result, 'query question by id')

  return {
    source: 'cloud-rdb',
    question: result.data ? mapQuestion(result.data) : null,
  }
}

async function createQuestion(payload) {
  const result = await getQuestionTable()
    .insert(toRdbRecord(payload))
    .select('*')
    .single()
  assertSuccess(result, 'insert question')

  return {
    source: 'cloud-rdb',
    question: mapQuestion(result.data),
  }
}

async function updateQuestion(id, payload) {
  const result = await getQuestionTable()
    .update({
      ...toRdbRecord(payload),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  assertSuccess(result, 'update question')

  if (!result.data) {
    throw new Error(`Question ${id} does not exist in Cloud RDB.`)
  }

  return {
    source: 'cloud-rdb',
    question: mapQuestion(result.data),
  }
}

async function deleteQuestion(id) {
  const result = await getQuestionTable()
    .delete()
    .eq('id', id)
  assertSuccess(result, 'delete question')

  return { source: 'cloud-rdb' }
}

async function fetchStats() {
  const [totalResult, choiceResult, judgeResult] = await Promise.all([
    getQuestionTable().select('id', { count: 'exact', head: true }),
    getQuestionTable().select('id', { count: 'exact', head: true }).eq('type', 'CHOICE'),
    getQuestionTable().select('id', { count: 'exact', head: true }).eq('type', 'JUDGE'),
  ])

  assertSuccess(totalResult, 'count questions')
  assertSuccess(choiceResult, 'count choice questions')
  assertSuccess(judgeResult, 'count judge questions')

  return {
    total: Number(totalResult.count || 0),
    choice: Number(choiceResult.count || 0),
    judge: Number(judgeResult.count || 0),
  }
}

function toRdbRecord(payload) {
  return {
    type: payload.type,
    content: payload.content,
    options: payload.type === 'CHOICE' ? payload.options || [] : null,
    answer: payload.answer,
  }
}

function mapQuestion(row) {
  return {
    id: String(row.id),
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

function assertSuccess(result, operation) {
  if (result && result.error) {
    throw new Error(`${operation} failed: ${result.error.message || result.error.code || 'unknown error'}`)
  }
}

function escapeLike(value) {
  return String(value).replace(/[%_]/g, '\\$&')
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = items[index]
    items[index] = items[randomIndex]
    items[randomIndex] = current
  }
  return items
}

module.exports = {
  fetchQuestionPage,
  fetchRandomQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
}
