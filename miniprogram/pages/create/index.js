const bio = require('../../util/bio')
const api = require('../../util/api')
const { getImageUrls } = require('../../util/cloud-images')

const defaultQuestionAnswerPicker = makeQuestionAnswerPickerState('CHOICE', 'A')

Page({
  data: {
    logoUrl: '',
    isManualMode: true,
    isImportMode: false,
    formTitle: '新增题目',
    formMeta: '手动填写或导入 Word 文件',
    ...defaultQuestionAnswerPicker,
    contentInput: '',
    optionFields: bio.makeOptionFields(),
    importBusy: false,
    savingImportedQuestions: false,
    importStatus: '',
    importQuestions: [],
    hasImportQuestions: false,
    importQuestionCount: 0,
    editingImportedQuestionId: '',
  },

  onLoad() {
    getImageUrls().then(({ logo }) => this.setData({ logoUrl: logo }))
      .catch((error) => console.error('Failed to load logo from cloud storage.', error))
  },

  onShow() {
    const pendingId = wx.getStorageSync(bio.PENDING_EDIT_KEY)
    if (!pendingId) return

    wx.removeStorageSync(bio.PENDING_EDIT_KEY)
    bio.getQuestionById(pendingId).then((result) => {
      if (!result.question) return
      this.loadQuestionToForm(result.question)
    })
  },

  setMode(event) {
    const mode = event.currentTarget.dataset.mode
    this.setData({
      isManualMode: mode === 'manual',
      isImportMode: mode === 'import',
    })
  },

  toggleQuestionTypeMenu() {
    this.setData({
      isQuestionTypeMenuOpen: !this.data.isQuestionTypeMenuOpen,
      isAnswerMenuOpen: false,
    })
  },

  selectQuestionType(event) {
    const index = Number(event.currentTarget.dataset.index)
    const questionType = bio.QUESTION_TYPES[index]
    if (!questionType) return
    this.setData(makeQuestionAnswerPickerState(questionType.value, ''))
  },

  toggleAnswerMenu() {
    this.setData({
      isQuestionTypeMenuOpen: false,
      isAnswerMenuOpen: !this.data.isAnswerMenuOpen,
    })
  },

  selectAnswer(event) {
    const index = Number(event.currentTarget.dataset.index)
    const answer = this.data.answerChoices[index]
    if (!answer) return
    this.setData(makeQuestionAnswerPickerState(this.data.questionType, answer))
  },

  onContentInput(event) {
    this.setData({ contentInput: event.detail.value })
  },

  onOptionInput(event) {
    const label = event.currentTarget.dataset.label
    const optionFields = this.data.optionFields.map((option) => (
      option.label === label ? { label: option.label, value: event.detail.value } : option
    ))
    this.setData({ optionFields })
  },

  async saveQuestion() {
    const validation = bio.validateQuestionForm({
      type: this.data.questionType,
      contentInput: this.data.contentInput,
      answerInput: this.data.answerInput,
      optionFields: this.data.optionFields,
    })
    if (!validation.ok) {
      showToast(validation.message)
      return
    }

    const result = await bio.createQuestion(validation.value)
    showToast(result.source === 'database' ? '题目已保存' : '数据库未连接，已保存本地缓存')
    this.resetForm()
  },

  resetForm() {
    this.setData({
      ...makeQuestionAnswerPickerState('CHOICE', 'A'),
      contentInput: '',
      optionFields: bio.makeOptionFields(),
    })
  },

  chooseImportFile() {
    if (!wx.chooseMessageFile) {
      showToast('当前版本不支持选择文件')
      return
    }

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['docx', 'doc'],
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file || !file.path) return

        this.setData({ importBusy: true, importStatus: '正在读取文件…' })
        try {
          const result = await api.upload('/api/questions/import', file.path)
          const stamp = Date.now()
          const importQuestions = (result.data || []).map((question, index) => ({
            ...question,
            id: `import-${stamp}-${index}`,
          }))
          const invalid = result.invalid || []

          this.setData({
            importQuestions,
            hasImportQuestions: importQuestions.length > 0,
            importQuestionCount: importQuestions.length,
            editingImportedQuestionId: '',
            importStatus: importQuestions.length
              ? `已读取 ${importQuestions.length} 道题，尚未保存。`
              : '未读取到可保存的题目。',
          })

          if (invalid.length) {
            wx.showModal({
              title: `有 ${invalid.length} 道题未导入`,
              content: invalid.map((item) => `第 ${item.index} 题：${item.message}`).join('\n'),
              showCancel: false,
            })
          }
        } catch (error) {
          this.setData({ importStatus: '' })
          showToast(error.message || '文件读取失败')
        } finally {
          this.setData({ importBusy: false })
        }
      },
    })
  },

  saveImportedQuestion(event) {
    const detail = event.detail || {}
    if (!detail.id || !detail.payload) return

    const importQuestions = this.data.importQuestions.map((question) => (
      question.id === detail.id ? { id: question.id, ...detail.payload } : question
    ))
    this.setData({ importQuestions })
    showToast('已更新暂存题目')
  },

  startImportedQuestionEdit(event) {
    const id = event.detail && event.detail.id
    if (!id) return
    if (this.data.editingImportedQuestionId && this.data.editingImportedQuestionId !== id) {
      showToast('请先完成当前题目的修改')
      return
    }
    this.setData({ editingImportedQuestionId: id })
  },

  endImportedQuestionEdit(event) {
    const id = event.detail && event.detail.id
    if (id && this.data.editingImportedQuestionId === id) {
      this.setData({ editingImportedQuestionId: '' })
    }
  },

  confirmRemoveImportedQuestion(event) {
    const id = event.detail && event.detail.id
    const question = this.data.importQuestions.find((item) => item.id === id)
    if (!question) return

    wx.showModal({
      title: '确认删除',
      content: `确定从本次导入中删除这道题吗？\n${question.content}`,
      confirmText: '删除',
      confirmColor: '#bf4b32',
      success: (res) => {
        if (!res.confirm) return
        const importQuestions = this.data.importQuestions.filter((item) => item.id !== id)
        this.setData({
          importQuestions,
          hasImportQuestions: importQuestions.length > 0,
          importQuestionCount: importQuestions.length,
          editingImportedQuestionId: this.data.editingImportedQuestionId === id ? '' : this.data.editingImportedQuestionId,
          importStatus: importQuestions.length ? `已保留 ${importQuestions.length} 道暂存题。` : '没有待保存的题目。',
        })
      },
    })
  },

  async saveImportedQuestions() {
    if (!this.data.importQuestions.length || this.data.savingImportedQuestions) return

    this.setData({ savingImportedQuestions: true })
    try {
      const results = []
      for (const question of this.data.importQuestions) {
        const result = await bio.createQuestion({
          type: question.type,
          content: question.content,
          options: question.options,
          answer: question.answer,
        })
        results.push(result)
      }

      const savedToDatabase = results.filter((result) => result.source === 'database').length
      this.setData({
        importQuestions: [],
        hasImportQuestions: false,
        importQuestionCount: 0,
        editingImportedQuestionId: '',
        importStatus: '',
      })
      showToast(savedToDatabase === results.length ? '已保存全部题目' : '已保存到本地缓存')
    } finally {
      this.setData({ savingImportedQuestions: false })
    }
  },

  loadQuestionToForm(question) {
    this.setData({
      isManualMode: true,
      isImportMode: false,
      ...makeQuestionAnswerPickerState(question.type, question.answer),
      contentInput: question.content,
      optionFields: bio.makeOptionFields(question.options),
    })
  },
})

function makeQuestionAnswerPickerState(type, answer) {
  const questionTypeIndex = bio.getQuestionTypeIndex(type)
  const questionType = bio.QUESTION_TYPES[questionTypeIndex].value
  const questionTypeName = bio.QUESTION_TYPES[questionTypeIndex].name
  const answerChoices = questionType === 'JUDGE' ? ['对', '错'] : ['A', 'B', 'C', 'D']
  const normalizedAnswer = bio.normalizeAnswer(answer, questionType) || answerChoices[0]

  return {
    questionType,
    questionTypeName,
    isChoiceType: questionType === 'CHOICE',
    answerInput: normalizedAnswer,
    questionTypeOptions: bio.QUESTION_TYPES,
    answerChoices,
    isQuestionTypeMenuOpen: false,
    isAnswerMenuOpen: false,
  }
}

function showToast(title) {
  wx.showToast({
    title,
    icon: 'none',
    duration: 1800,
  })
}
