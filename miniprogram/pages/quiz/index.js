const bio = require('../../util/bio')

Page({
  data: {
    questions: [],
    quizCountOptions: bio.QUIZ_COUNT_OPTIONS,
    quizCountIndex: 0,
    quizCount: 10,
    isQuizCountMenuOpen: false,
    quizQuestions: [],
    quizResponses: {},
    quizItems: [],
    hasQuizItems: false,
    quizStatus: '未开始',
  },

  toggleQuizCountMenu() {
    this.setData({ isQuizCountMenuOpen: !this.data.isQuizCountMenuOpen })
  },

  selectQuizCount(event) {
    const index = Number(event.currentTarget.dataset.index)
    const count = bio.QUIZ_COUNT_OPTIONS[index]
    if (!count) return
    this.setData({
      quizCountIndex: index,
      quizCount: count,
      isQuizCountMenuOpen: false,
    })
  },

  async startQuiz() {
    const result = await bio.fetchRandomQuestions(this.data.quizCount)
    const questions = result.questions

    if (questions.length === 0) {
      wx.showModal({
        title: '无法开始',
        content: '题库里还没有题目。',
        showCancel: false,
      })
      return
    }

    const requested = this.data.quizCount
    const count = Math.min(requested, questions.length)
    const quizQuestions = questions.slice(0, count)

    this.setData({
      questions,
      quizQuestions,
      quizResponses: {},
      isQuizCountMenuOpen: false,
    }, () => {
      this.renderQuiz()
      wx.nextTick(() => {
        wx.pageScrollTo({
          scrollTop: 0,
          duration: 300,
        })
      })
      if (result.source === 'local') {
        showToast('数据库未连接，已从本地缓存抽题')
        return
      }
      showToast(count < requested ? `题库不足 ${requested} 道，已抽取 ${count} 道` : `已抽取 ${count} 道题`)
    })
  },

  answerQuestion(event) {
    const id = event.currentTarget.dataset.id
    const selected = event.currentTarget.dataset.answer
    const question = this.data.quizQuestions.find((item) => item.id === id)

    if (!question || this.data.quizResponses[id]) return

    const normalizedSelected = bio.normalizeAnswer(selected, question.type)
    const normalizedCorrect = bio.normalizeAnswer(question.answer, question.type)
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

  renderQuiz() {
    const total = this.data.quizQuestions.length
    const answered = Object.keys(this.data.quizResponses).length
    const quizItems = this.data.quizQuestions.map((question, index) => {
      const response = this.data.quizResponses[question.id]
      const answeredQuestion = Boolean(response)
      const normalizedCorrect = bio.normalizeAnswer(question.answer, question.type)
      const answerOptions = bio.getAnswerOptions(question).map((option) => {
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
        feedbackText: answeredQuestion ? bio.renderFeedback(question, response) : '',
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

function showToast(title) {
  wx.showToast({
    title,
    icon: 'none',
    duration: 1800,
  })
}
