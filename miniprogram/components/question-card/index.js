const bio = require('../../util/bio')

Component({
  properties: {
    question: {
      type: Object,
      value: {},
    },
  },

  data: {
    isEditing: false,
    typeName: '',
    isChoice: false,
    draft: {
      content: '',
      answer: '',
      options: [],
    },
    answerChoices: [],
    isAnswerMenuOpen: false,
  },

  lifetimes: {
    attached() {
      this.setData(makeEditorState(this.properties.question))
    },
  },

  observers: {
    question(question) {
      if (!this.data.isEditing) {
        this.setData(makeEditorState(question))
      }
    },
  },

  methods: {
    startEdit() {
      this.setData({
        isEditing: true,
        isAnswerMenuOpen: false,
        ...makeEditorState(this.properties.question),
      })
    },

    cancelEdit() {
      this.setData({
        isEditing: false,
        isAnswerMenuOpen: false,
        ...makeEditorState(this.properties.question),
      })
    },

    onContentInput(event) {
      this.setData({ 'draft.content': event.detail.value })
    },

    onOptionInput(event) {
      const index = Number(event.currentTarget.dataset.index)
      const options = this.data.draft.options.map((option, optionIndex) => (
        optionIndex === index ? { ...option, text: event.detail.value } : option
      ))
      this.setData({ 'draft.options': options })
    },

    toggleAnswerMenu() {
      this.setData({ isAnswerMenuOpen: !this.data.isAnswerMenuOpen })
    },

    selectAnswer(event) {
      const index = Number(event.currentTarget.dataset.index)
      const answer = this.data.answerChoices[index]
      if (!answer) return
      this.setData({
        'draft.answer': answer,
        isAnswerMenuOpen: false,
      })
    },

    saveEdit() {
      const validation = bio.validateQuestionForm({
        type: this.properties.question.type,
        contentInput: this.data.draft.content,
        answerInput: this.data.draft.answer,
        optionFields: this.data.draft.options.map((option) => ({
          label: option.label,
          value: option.text,
        })),
      })

      if (!validation.ok) {
        wx.showToast({ title: validation.message, icon: 'none' })
        return
      }

      this.triggerEvent('save', {
        id: this.properties.question.id,
        payload: validation.value,
      })
      this.setData({
        isEditing: false,
        isAnswerMenuOpen: false,
      })
    },

    removeQuestion() {
      this.triggerEvent('remove', { id: this.properties.question.id })
    },
  },
})

function makeEditorState(question) {
  const type = question && question.type === 'JUDGE' ? 'JUDGE' : 'CHOICE'
  const answerChoices = type === 'CHOICE' ? ['A', 'B', 'C', 'D'] : ['对', '错']
  const answer = bio.normalizeAnswer(question && question.answer, type) || answerChoices[0]

  return {
    typeName: type === 'CHOICE' ? '选择题' : '判断题',
    isChoice: type === 'CHOICE',
    answerChoices,
    draft: {
      content: (question && question.content) || '',
      answer,
      options: type === 'CHOICE'
        ? bio.makeOptionFields(question && question.options).map((option) => ({
          label: option.label,
          text: option.value,
        }))
        : [],
    },
  }
}
