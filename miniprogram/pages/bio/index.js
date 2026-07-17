const STORAGE_KEY = 'bio-question-bank-v1'

const QUESTION_TYPES = [
  { value: 'CHOICE', name: '选择题' },
  { value: 'JUDGE', name: '判断题' },
]

const NAV_ITEMS = [
  { key: 'bank', text: '题库' },
  { key: 'quiz', text: '练习' },
  { key: 'import', text: '导入' },
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

Page({
  data: {
    navItems: makeNavItems('bank'),
    showBank: true,
    showQuiz: false,
    showImport: false,
    stats: {
      total: 0,
      choice: 0,
      judge: 0,
    },
    questions: [],
    displayQuestions: [],
    hasDisplayQuestions: false,
    resultCountText: '0 条',
    searchQuery: '',
    editingId: '',
    questionType: 'CHOICE',
    questionTypeIndex: 0,
    questionTypeNames: QUESTION_TYPES.map((item) => item.name),
    questionTypeName: '选择题',
    isChoiceType: true,
    answerPlaceholder: 'A / B / C / D',
    answerInput: '',
    contentInput: '',
    optionFields: makeOptionFields(),
    quizCountOptions: QUIZ_COUNT_OPTIONS,
    quizCountIndex: 0,
    quizCount: 10,
    quizQuestions: [],
    quizResponses: {},
    quizItems: [],
    hasQuizItems: false,
    quizStatus: '未开始',
    rawImportText: '',
    parsed: {
      typeName: '-',
      content: '-',
      optionsText: '-',
    },
  },

  onLoad() {
    const questions = loadQuestions()
    this.setData({ questions }, () => {
      this.renderAll()
    })
  },

  onNavTap(event) {
    this.setActiveView(event.currentTarget.dataset.view)
  },

  onSearchInput(event) {
    this.setData({ searchQuery: event.detail.value }, () => {
      this.renderQuestionList()
    })
  },

  onQuestionTypeChange(event) {
    const index = Number(event.detail.value)
    const type = QUESTION_TYPES[index].value
    this.applyQuestionType(type)
  },

  onQuizCountChange(event) {
    const index = Number(event.detail.value)
    this.setData({
      quizCountIndex: index,
      quizCount: QUIZ_COUNT_OPTIONS[index],
    })
  },

  onAnswerInput(event) {
    this.setData({ answerInput: event.detail.value })
  },

  onContentInput(event) {
    this.setData({ contentInput: event.detail.value })
  },

  onOptionInput(event) {
    const label = event.currentTarget.dataset.label
    const value = event.detail.value
    const optionFields = this.data.optionFields.map((option) => {
      if (option.label !== label) return option
      return { label: option.label, value }
    })
    this.setData({ optionFields })
  },

  onRawImportInput(event) {
    this.setData({ rawImportText: event.detail.value })
  },

  newQuestion() {
    this.resetForm()
    wx.pageScrollTo({ scrollTop: 0, duration: 180 })
  },

  resetForm() {
    this.setData({
      editingId: '',
      questionType: 'CHOICE',
      questionTypeIndex: 0,
      questionTypeName: '选择题',
      isChoiceType: true,
      answerPlaceholder: 'A / B / C / D',
      answerInput: '',
      contentInput: '',
      optionFields: makeOptionFields(),
    })
  },

  saveQuestion() {
    const type = this.data.questionType
    const content = compactText(this.data.contentInput)
    const answer = normalizeAnswer(this.data.answerInput, type)

    if (!content) {
      showToast('请填写题干')
      return
    }

    if (!answer) {
      showToast(type === 'CHOICE' ? '请填写 A-D 作为答案' : '请填写 对 或 错')
      return
    }

    const options = type === 'CHOICE' ? collectOptions(this.data.optionFields) : null

    if (type === 'CHOICE') {
      if (options.length < 2) {
        showToast('选择题至少需要两个选项')
        return
      }

      if (!options.some((option) => option.label === answer)) {
        showToast('答案必须对应已填写的选项')
        return
      }
    }

    const now = new Date().toISOString()
    const editingId = this.data.editingId
    let questions

    if (editingId) {
      questions = this.data.questions.map((question) => {
        if (question.id !== editingId) return question
        return {
          ...question,
          type,
          content,
          options,
          answer,
          updatedAt: now,
        }
      })
      showToast('题目已更新')
    } else {
      questions = [
        {
          id: createId(),
          type,
          content,
          options,
          answer,
          createdAt: now,
          updatedAt: now,
        },
        ...this.data.questions,
      ]
      showToast('题目已保存')
    }

    persistQuestions(questions)
    this.setData({ questions }, () => {
      this.resetForm()
      this.renderAll()
    })
  },

  editQuestion(event) {
    const id = event.currentTarget.dataset.id
    const question = this.data.questions.find((item) => item.id === id)
    if (!question) return

    const optionFields = makeOptionFields(question.options)
    const typeIndex = getQuestionTypeIndex(question.type)
    this.setData({
      editingId: question.id,
      questionType: question.type,
      questionTypeIndex: typeIndex,
      questionTypeName: QUESTION_TYPES[typeIndex].name,
      isChoiceType: question.type === 'CHOICE',
      answerPlaceholder: question.type === 'CHOICE' ? 'A / B / C / D' : '对 / 错',
      answerInput: question.answer,
      contentInput: question.content,
      optionFields,
    })
    this.setActiveView('bank')
    wx.pageScrollTo({ scrollTop: 0, duration: 180 })
  },

  confirmDeleteQuestion(event) {
    const id = event.currentTarget.dataset.id
    const question = this.data.questions.find((item) => item.id === id)
    if (!question) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这道题吗？\n${question.content}`,
      confirmText: '删除',
      confirmColor: '#bf4b32',
      success: (res) => {
        if (!res.confirm) return

        const questions = this.data.questions.filter((item) => item.id !== id)
        const quizQuestions = this.data.quizQuestions.filter((item) => item.id !== id)
        const quizResponses = { ...this.data.quizResponses }
        delete quizResponses[id]
        persistQuestions(questions)
        this.setData({ questions, quizQuestions, quizResponses }, () => {
          this.renderAll()
          showToast('题目已删除')
        })
      },
    })
  },

  startQuiz() {
    if (this.data.questions.length === 0) {
      wx.showModal({
        title: '无法开始',
        content: '题库里还没有题目。',
        showCancel: false,
      })
      return
    }

    const requested = this.data.quizCount
    const shuffled = shuffle([...this.data.questions])
    const count = Math.min(requested, shuffled.length)
    const quizQuestions = shuffled.slice(0, count)

    this.setData({
      quizQuestions,
      quizResponses: {},
    }, () => {
      this.renderQuiz()
      showToast(count < requested ? `题库不足 ${requested} 道，已抽取 ${count} 道` : `已抽取 ${count} 道题`)
    })
  },

  answerQuestion(event) {
    const id = event.currentTarget.dataset.id
    const selected = event.currentTarget.dataset.answer
    const question = this.data.quizQuestions.find((item) => item.id === id)

    if (!question || this.data.quizResponses[id]) return

    const normalizedSelected = normalizeAnswer(selected, question.type)
    const normalizedCorrect = normalizeAnswer(question.answer, question.type)
    const quizResponses = {
      ...this.data.quizResponses,
      [id]: {
        selected: normalizedSelected,
        correct: normalizedSelected === normalizedCorrect,
      },
    }

    this.setData({ quizResponses }, () => {
      this.renderQuiz()
    })
  },

  submitQuiz() {
    if (this.data.quizQuestions.length === 0) {
      wx.showModal({
        title: '尚未开始',
        content: '请先随机抽题。',
        showCancel: false,
      })
      return
    }

    const missing = this.data.quizQuestions
      .map((question, index) => (this.data.quizResponses[question.id] ? null : index + 1))
      .filter((index) => index !== null)

    if (missing.length > 0) {
      wx.showModal({
        title: '还有题没做',
        content: `未作答题号：${missing.join('、')}`,
        confirmText: '继续做题',
        showCancel: false,
      })
      return
    }

    const correct = Object.keys(this.data.quizResponses)
      .filter((id) => this.data.quizResponses[id].correct)
      .length
    const wrong = this.data.quizQuestions.length - correct

    wx.showModal({
      title: '练习完成',
      content: `做对题数：${correct}\n做错题数：${wrong}`,
      confirmText: '再来一组',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.startQuiz()
        }
      },
    })
  },

  chooseImportFile() {
    if (!wx.chooseMessageFile) {
      wx.showModal({
        title: '当前版本不支持',
        content: '请直接粘贴识别文本。',
        showCancel: false,
      })
      return
    }

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'md', 'text'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file || !file.path) return

        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: (readRes) => {
            this.setData({ rawImportText: String(readRes.data || '') }, () => {
              this.parseImportText()
            })
          },
          fail: () => showToast('文件读取失败'),
        })
      },
    })
  },

  pasteClipboard() {
    wx.getClipboardData({
      success: (res) => {
        this.setData({ rawImportText: res.data || '' }, () => {
          showToast('已粘贴剪贴板内容')
        })
      },
    })
  },

  parseImportText() {
    const parsedQuestion = parseQuestionText(this.data.rawImportText)

    if (!parsedQuestion.content) {
      showToast('没有识别到题干')
      return
    }

    const optionFields = makeOptionFields(parsedQuestion.options)
    const typeIndex = getQuestionTypeIndex(parsedQuestion.type)
    const parsed = {
      typeName: QUESTION_TYPES[typeIndex].name,
      content: parsedQuestion.content,
      optionsText: parsedQuestion.options && parsedQuestion.options.length
        ? parsedQuestion.options.map((option) => `${option.label}. ${option.text}`).join(' / ')
        : '无',
    }

    this.setData({
      parsed,
      editingId: '',
      questionType: parsedQuestion.type,
      questionTypeIndex: typeIndex,
      questionTypeName: QUESTION_TYPES[typeIndex].name,
      isChoiceType: parsedQuestion.type === 'CHOICE',
      answerPlaceholder: parsedQuestion.type === 'CHOICE' ? 'A / B / C / D' : '对 / 错',
      answerInput: parsedQuestion.answer || '',
      contentInput: parsedQuestion.content,
      optionFields,
    }, () => {
      this.setActiveView('bank')
      wx.pageScrollTo({ scrollTop: 0, duration: 180 })
      showToast('已填入编辑表单，请核对答案')
    })
  },

  setActiveView(view) {
    this.setData({
      navItems: makeNavItems(view),
      showBank: view === 'bank',
      showQuiz: view === 'quiz',
      showImport: view === 'import',
    })
  },

  applyQuestionType(type) {
    const index = getQuestionTypeIndex(type)
    this.setData({
      questionType: type,
      questionTypeIndex: index,
      questionTypeName: QUESTION_TYPES[index].name,
      isChoiceType: type === 'CHOICE',
      answerPlaceholder: type === 'CHOICE' ? 'A / B / C / D' : '对 / 错',
    })
  },

  renderAll() {
    this.renderStats()
    this.renderQuestionList()
    this.renderQuiz()
  },

  renderStats() {
    const questions = this.data.questions
    this.setData({
      stats: {
        total: questions.length,
        choice: questions.filter((question) => question.type === 'CHOICE').length,
        judge: questions.filter((question) => question.type === 'JUDGE').length,
      },
    })
  },

  renderQuestionList() {
    const query = this.data.searchQuery.trim()
    const displayQuestions = this.data.questions
      .filter((question) => fuzzyMatch(question.content, query))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((question) => ({
        ...question,
        typeName: question.type === 'CHOICE' ? '选择题' : '判断题',
        isChoice: question.type === 'CHOICE',
        options: question.options || [],
        updatedText: formatDate(question.updatedAt),
      }))

    this.setData({
      displayQuestions,
      hasDisplayQuestions: displayQuestions.length > 0,
      resultCountText: `${displayQuestions.length} 条`,
    })
  },

  renderQuiz() {
    const total = this.data.quizQuestions.length
    const answered = Object.keys(this.data.quizResponses).length
    const quizItems = this.data.quizQuestions.map((question, index) => {
      const response = this.data.quizResponses[question.id]
      const answeredQuestion = Boolean(response)
      const normalizedCorrect = normalizeAnswer(question.answer, question.type)
      const answerOptions = getAnswerOptions(question).map((option) => {
        const selected = response && response.selected === option.label
        const correctOption = option.label === normalizedCorrect
        const classNames = []

        if (answeredQuestion && correctOption) classNames.push('correct')
        if (answeredQuestion && selected && !response.correct) classNames.push('wrong')

        return {
          ...option,
          displayText: question.type === 'CHOICE' ? `${option.label}. ${option.text}` : option.text,
          className: classNames.join(' '),
        }
      })

      return {
        ...question,
        displayIndex: index + 1,
        typeName: question.type === 'CHOICE' ? '选择题' : '判断题',
        answered: answeredQuestion,
        answerOptions,
        feedbackText: answeredQuestion ? renderFeedback(question, response) : '',
        feedbackClass: answeredQuestion ? (response.correct ? 'correct' : 'wrong') : '',
      }
    })

    this.setData({
      quizItems,
      hasQuizItems: total > 0,
      quizStatus: total > 0 ? `${answered}/${total} 已作答` : '未开始',
    })
  },
})

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

function makeNavItems(activeKey) {
  return NAV_ITEMS.map((item) => ({
    ...item,
    active: item.key === activeKey,
  }))
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

function showToast(title) {
  wx.showToast({
    title,
    icon: 'none',
    duration: 1800,
  })
}
