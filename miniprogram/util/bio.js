const questionRdb = require('./question-rdb')

const PENDING_EDIT_KEY = 'bio-pending-edit-id'

const QUESTION_TYPES = [
  { value: 'CHOICE', name: '选择题' },
  { value: 'JUDGE', name: '判断题' },
]

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const QUIZ_COUNT_OPTIONS = [10, 25, 50]

async function fetchQuestionPage(options) {
  return questionRdb.fetchQuestionPage(options)
}

async function fetchRandomQuestions(count) {
  return questionRdb.fetchRandomQuestions(count)
}

async function getQuestionById(id) {
  return questionRdb.getQuestionById(id)
}

async function createQuestion(payload) {
  return questionRdb.createQuestion(payload)
}

async function updateQuestion(id, payload) {
  return questionRdb.updateQuestion(id, payload)
}

async function deleteQuestion(id) {
  return questionRdb.deleteQuestion(id)
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
  if (response.correct) return '回答正确'
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
      message: type === 'CHOICE' ? '请填写 A-D 作为答案' : '请填写对或错',
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

function compactText(value) {
  return String(value || '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
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
  PENDING_EDIT_KEY,
  QUESTION_TYPES,
  QUIZ_COUNT_OPTIONS,
  fetchQuestionPage,
  fetchRandomQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  makeOptionFields,
  getQuestionTypeIndex,
  getAnswerOptions,
  normalizeQuestionForList,
  renderFeedback,
  normalizeAnswer,
  validateQuestionForm,
}
