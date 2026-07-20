const api = require('./api')
const config = require('../config')
const questionRdb = require('./question-rdb')

const STORAGE_KEY = 'bio-question-bank-v1'
const PENDING_EDIT_KEY = 'bio-pending-edit-id'

const QUESTION_TYPES = [
  { value: 'CHOICE', name: '选择题' },
  { value: 'JUDGE', name: '判断题' },
]

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const QUIZ_COUNT_OPTIONS = [10, 25, 50]

const seedQuestions = [
  {
    id: 'seed-1',
    type: 'CHOICE',
    content: '下列哪一项是植物细胞特有的结构？',
    options: [
      { label: 'A', text: '细胞膜' },
      { label: 'B', text: '细胞核' },
      { label: 'C', text: '叶绿体' },
      { label: 'D', text: '线粒体' },
    ],
    answer: 'C',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  },
  {
    id: 'seed-2',
    type: 'JUDGE',
    content: '酶在高温环境下通常会发生变性，活性降低或丧失。',
    options: null,
    answer: '对',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  },
  {
    id: 'seed-3',
    type: 'CHOICE',
    content: '人体血液中运输氧气的主要成分是？',
    options: [
      { label: 'A', text: '血浆' },
      { label: 'B', text: '红细胞中的血红蛋白' },
      { label: 'C', text: '白细胞' },
      { label: 'D', text: '血小板' },
    ],
    answer: 'B',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  },
  {
    id: 'seed-4',
    type: 'JUDGE',
    content: 'DNA 的基本组成单位是氨基酸。',
    options: null,
    answer: '错',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  },
  {
    id: 'seed-5',
    type: 'CHOICE',
    content: '生态系统中，能量流动的特点通常是？',
    options: [
      { label: 'A', text: '单向流动，逐级递减' },
      { label: 'B', text: '循环流动，逐级增加' },
      { label: 'C', text: '双向流动，保持不变' },
      { label: 'D', text: '随机流动，没有规律' },
    ],
    answer: 'A',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  },
]

function loadQuestions() {
  const stored = wx.getStorageSync(STORAGE_KEY)

  if (!stored) {
    persistQuestions(seedQuestions)
    return seedQuestions.slice()
  }

  if (Array.isArray(stored)) {
    return stored
  }

  if (typeof stored === 'string') {
    try {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      return []
    }
  }

  return []
}

function persistQuestions(questions) {
  wx.setStorageSync(STORAGE_KEY, questions)
}

async function fetchQuestionPage({ search = '', page = 1, pageSize = 8 } = {}) {
  const rdbResult = await tryCloudRdb(() => questionRdb.fetchQuestionPage({ search, page, pageSize }))
  if (rdbResult.ok) return rdbResult.value

  try {
    const result = await api.get('/api/questions', { search, page, pageSize })
    return {
      source: 'http-api',
      questions: result.data || [],
      total: result.total || 0,
      page: result.page || page,
      pageSize: result.pageSize || pageSize,
      pageCount: result.pageCount || 1,
      stats: result.stats || getStats([]),
    }
  } catch (error) {
    return localQuestionPage({ search, page, pageSize, error: rdbResult.error || error })
  }
}

async function fetchRandomQuestions(count) {
  const rdbResult = await tryCloudRdb(() => questionRdb.fetchRandomQuestions(count))
  if (rdbResult.ok) return rdbResult.value

  try {
    const result = await api.get('/api/questions/random', { count })
    return {
      source: 'http-api',
      questions: result.data || [],
    }
  } catch (error) {
    const questions = loadQuestions()
    return {
      source: 'local',
      error: rdbResult.error || error,
      questions: shuffle([...questions]).slice(0, count),
    }
  }
}

async function getQuestionById(id) {
  const rdbResult = await tryCloudRdb(() => questionRdb.getQuestionById(id))
  if (rdbResult.ok) return rdbResult.value

  try {
    const result = await api.get(`/api/questions/${encodeURIComponent(id)}`)
    return {
      source: 'http-api',
      question: result.data || null,
    }
  } catch (error) {
    return {
      source: 'local',
      error: rdbResult.error || error,
      question: loadQuestions().find((question) => question.id === id) || null,
    }
  }
}

async function createQuestion(payload) {
  const rdbResult = await tryCloudRdb(() => questionRdb.createQuestion(payload))
  if (rdbResult.ok) return rdbResult.value

  try {
    const result = await api.post('/api/questions', payload)
    return {
      source: 'http-api',
      question: result.data,
    }
  } catch (error) {
    const now = new Date().toISOString()
    const question = {
      id: createId(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    }
    const questions = [question, ...loadQuestions()]
    persistQuestions(questions)
    return { source: 'local', error: rdbResult.error || error, question }
  }
}

async function updateQuestion(id, payload) {
  const rdbResult = await tryCloudRdb(() => questionRdb.updateQuestion(id, payload))
  if (rdbResult.ok) return rdbResult.value

  try {
    const result = await api.put(`/api/questions/${encodeURIComponent(id)}`, payload)
    return {
      source: 'http-api',
      question: result.data,
    }
  } catch (error) {
    const now = new Date().toISOString()
    const questions = loadQuestions().map((question) => {
      if (question.id !== id) return question
      return {
        ...question,
        ...payload,
        updatedAt: now,
      }
    })
    const question = questions.find((item) => item.id === id) || null
    persistQuestions(questions)
    return { source: 'local', error: rdbResult.error || error, question }
  }
}

async function deleteQuestion(id) {
  const rdbResult = await tryCloudRdb(() => questionRdb.deleteQuestion(id))
  if (rdbResult.ok) return rdbResult.value

  try {
    await api.del(`/api/questions/${encodeURIComponent(id)}`)
    return { source: 'http-api' }
  } catch (error) {
    persistQuestions(loadQuestions().filter((question) => question.id !== id))
    return { source: 'local', error: rdbResult.error || error }
  }
}

async function tryCloudRdb(action) {
  if (config.questionDataSource !== 'cloud-rdb') {
    return { ok: false, error: null }
  }

  try {
    return { ok: true, value: await action() }
  } catch (error) {
    console.warn('Cloud RDB request failed; falling back to the original HTTP API.', error)
    return { ok: false, error }
  }
}

function getStats(questions) {
  return {
    total: questions.length,
    choice: questions.filter((question) => question.type === 'CHOICE').length,
    judge: questions.filter((question) => question.type === 'JUDGE').length,
  }
}

function localQuestionPage({ search, page, pageSize, error }) {
  const questions = loadQuestions()
  const matched = questions
    .filter((question) => fuzzyMatch(question.content, search))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize))
  const pageIndex = Math.min(page, pageCount)
  const start = (pageIndex - 1) * pageSize

  return {
    source: 'local',
    error,
    questions: matched.slice(start, start + pageSize),
    total: matched.length,
    page: pageIndex,
    pageSize,
    pageCount,
    stats: getStats(questions),
  }
}

function makeOptionFields(options) {
  return OPTION_LABELS.map((label) => {
    const matched = options && options.find((option) => option.label === label)
    return {
      label,
      value: matched ? matched.text : '',
    }
  })
}

function collectOptions(optionFields) {
  return optionFields
    .map((option) => ({
      label: option.label,
      text: compactText(option.value),
    }))
    .filter((option) => option.text)
}

function getQuestionTypeIndex(type) {
  const index = QUESTION_TYPES.findIndex((item) => item.value === type)
  return index >= 0 ? index : 0
}

function getAnswerOptions(question) {
  if (question.type === 'CHOICE') {
    return question.options || []
  }

  return [
    { label: '对', text: '对' },
    { label: '错', text: '错' },
  ]
}

function normalizeQuestionForList(question) {
  return {
    ...question,
    typeName: question.type === 'CHOICE' ? '选择题' : '判断题',
    isChoice: question.type === 'CHOICE',
    options: question.options || [],
    updatedText: formatDate(question.updatedAt),
  }
}

function renderFeedback(question, response) {
  if (response.correct) {
    return '回答正确'
  }

  return `回答错误，正确答案：${normalizeAnswer(question.answer, question.type)}`
}

function normalizeAnswer(answer, type) {
  const value = String(answer || '').trim()
  if (!value) return ''

  if (type === 'CHOICE') {
    const matched = value.toUpperCase().match(/[A-D]/)
    return matched ? matched[0] : ''
  }

  const lower = value.toLowerCase()
  if (['对', '正确', 'true', 't', 'yes', 'y', '√'].includes(lower)) return '对'
  if (['错', '错误', 'false', 'f', 'no', 'n', '×', 'x'].includes(lower)) return '错'
  return ''
}

function validateQuestionForm({ type, contentInput, answerInput, optionFields }) {
  const content = compactText(contentInput)
  const answer = normalizeAnswer(answerInput, type)

  if (!content) {
    return { ok: false, message: '请填写题干' }
  }

  if (!answer) {
    return {
      ok: false,
      message: type === 'CHOICE' ? '请填写 A-D 作为答案' : '请填写 对 或 错',
    }
  }

  const options = type === 'CHOICE' ? collectOptions(optionFields) : null

  if (type === 'CHOICE') {
    if (options.length < 2) {
      return { ok: false, message: '选择题至少需要两个选项' }
    }

    if (!options.some((option) => option.label === answer)) {
      return { ok: false, message: '答案必须对应已填写的选项' }
    }
  }

  return {
    ok: true,
    value: {
      type,
      content,
      options,
      answer,
    },
  }
}

function parseQuestionText(rawText) {
  const text = String(rawText || '').replace(/\r/g, '\n').trim()
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const answerMatch = text.match(/(?:答案|参考答案|正确答案)\s*[:：]?\s*([A-Da-d]|正确|错误|对|错|√|×|true|false)/i)
  const options = []
  const contentLines = []

  lines.forEach((line) => {
    if (/^(答案|参考答案|正确答案)\s*[:：]?/i.test(line)) {
      return
    }

    const optionMatch = line.match(/^([A-Da-d])\s*[.．、:：)]\s*(.+)$/)
    if (optionMatch) {
      options.push({
        label: optionMatch[1].toUpperCase(),
        text: compactText(optionMatch[2]),
      })
      return
    }

    contentLines.push(line.replace(/^(题目|题干|判断题|选择题)\s*[:：]?\s*/i, ''))
  })

  const type = options.length >= 2 ? 'CHOICE' : 'JUDGE'
  const content = compactText(contentLines.join('\n'))
  const rawAnswer = answerMatch ? answerMatch[1] : ''

  return {
    type,
    content,
    options: type === 'CHOICE' ? options : null,
    answer: rawAnswer ? normalizeAnswer(rawAnswer, type) : '',
  }
}

function fuzzyMatch(content, query) {
  const normalizedContent = normalizeForSearch(content)
  const normalizedQuery = normalizeForSearch(query)
  if (!normalizedQuery) return true
  if (normalizedContent.indexOf(normalizedQuery) >= 0) return true

  let index = 0
  for (let i = 0; i < normalizedContent.length; i += 1) {
    if (normalizedContent[i] === normalizedQuery[index]) index += 1
    if (index === normalizedQuery.length) return true
  }

  return false
}

function normalizeForSearch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

function compactText(value) {
  return String(value || '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
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

function createId() {
  return `q-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

module.exports = {
  STORAGE_KEY,
  PENDING_EDIT_KEY,
  QUESTION_TYPES,
  OPTION_LABELS,
  QUIZ_COUNT_OPTIONS,
  loadQuestions,
  persistQuestions,
  fetchQuestionPage,
  fetchRandomQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getStats,
  makeOptionFields,
  collectOptions,
  getQuestionTypeIndex,
  getAnswerOptions,
  normalizeQuestionForList,
  renderFeedback,
  normalizeAnswer,
  validateQuestionForm,
  parseQuestionText,
  fuzzyMatch,
  compactText,
  shuffle,
  createId,
  formatDate,
}
