const bio = require('../../util/bio')
const { getImageUrls } = require('../../util/cloud-images')


const PAGE_SIZE = 8;

Page({
  data: {
    logoUrl: '',
    questions: [],
    stats: {
      total: 0,
      choice: 0,
      judge: 0,
    },
    searchQuery: '',
    showingMyQuestions: false,
    displayQuestions: [],
    hasDisplayQuestions: false,
    hasMatchedQuestions: false,
    resultCountText: '0 条',
    pagerText: '第 1/1 页',
    pageIndex: 1,
    pageCount: 1,
    canPrevPage: false,
    canNextPage: false,
    editingQuestionId: '',
  },

  onLoad() {
    getImageUrls().then(({ logo }) => this.setData({ logoUrl: logo }))
      .catch((error) => console.error('Failed to load logo from cloud storage.', error))
  },

  onShow() {
    syncTabBar(this, 0)
    this.reloadQuestions()
  },

  onSearchInput(event) {
    const searchQuery = event.detail.value
    this.setData({
      searchQuery,
      pageIndex: 1,
    })

    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => this.reloadQuestions(), 300)
  },

  toggleMyQuestions() {
    this.setData({
      showingMyQuestions: !this.data.showingMyQuestions,
      pageIndex: 1,
      editingQuestionId: '',
    }, () => this.reloadQuestions())
  },

  onUnload() {
    clearTimeout(this.searchTimer)
  },

  prevPage() {
    if (!this.data.canPrevPage) return
    this.setData({ pageIndex: this.data.pageIndex - 1 }, () => {
      this.reloadQuestions()
    })
  },

  nextPage() {
    if (!this.data.canNextPage) return
    this.setData({ pageIndex: this.data.pageIndex + 1 }, () => {
      this.reloadQuestions()
    })
  },

  scrollToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 220,
    })
  },

  async saveQuestionCard(event) {
    const detail = event.detail || {}
    if (!detail.id || !detail.payload) return

    try {
      const result = await bio.updateQuestion(detail.id, detail.payload)
      await this.reloadQuestions()
      showToast(result.source === 'database' ? '题目已保存' : '数据库未连接，已保存本地缓存')
    } catch (error) {
      console.error('Failed to update CloudBase RDB question.', error)
      showToast('修改失败：请检查数据库写入权限')
    }
  },

  startQuestionCardEdit(event) {
    const id = event.detail && event.detail.id
    if (!id) return
    if (this.data.editingQuestionId && this.data.editingQuestionId !== id) {
      showToast('请先完成当前题目的修改')
      return
    }
    this.setData({ editingQuestionId: id })
  },

  endQuestionCardEdit(event) {
    const id = event.detail && event.detail.id
    if (id && this.data.editingQuestionId === id) {
      this.setData({ editingQuestionId: '' })
    }
  },

  confirmDeleteQuestion(event) {
    const id = event.detail && event.detail.id
    const question = this.data.displayQuestions.find((item) => item.id === id)
    if (!question) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这道题吗？\n${question.content}`,
      confirmText: '删除',
      confirmColor: '#bf4b32',
      success: async (res) => {
        if (!res.confirm) return

        try {
          const result = await bio.deleteQuestion(id)
          const editingQuestionId = this.data.editingQuestionId === id ? '' : this.data.editingQuestionId
          this.setData({ editingQuestionId })
          await this.reloadQuestions()
          showToast(result.source === 'database' ? '题目已删除' : '数据库未连接，已删除本地缓存')
        } catch (error) {
          console.error('Failed to delete CloudBase RDB question.', error)
          showToast('删除失败：请检查数据库写入权限')
        }
      },
    })
  },

  async reloadQuestions() {
    const requestId = (this.questionRequestId || 0) + 1
    this.questionRequestId = requestId

    try {
    const result = await bio.fetchQuestionPage({
      search: this.data.searchQuery.trim(),
      page: this.data.pageIndex,
      pageSize: PAGE_SIZE,
      ownerOnly: this.data.showingMyQuestions,
    })
    if (requestId !== this.questionRequestId) return
    const displayQuestions = result.questions.map(bio.normalizeQuestionForList)
    const sourceText = result.source === 'database' ? '数据库' : '本地缓存'

    this.setData({
      displayQuestions,
      pageIndex: result.page,
      pageCount: result.pageCount,
      stats: result.stats,
      hasDisplayQuestions: displayQuestions.length > 0,
      hasMatchedQuestions: result.total > 0,
      resultCountText: `${result.total} 条 · ${sourceText}`,
      pagerText: `第 ${result.page}/${result.pageCount} 页`,
      canPrevPage: result.page > 1,
      canNextPage: result.page < result.pageCount,
    })
    } catch (error) {
      if (requestId !== this.questionRequestId) return
      console.error('Failed to load CloudBase RDB questions.', error)
      showToast('题库加载超时，请稍后重试')
    }
  },
})

function showToast(title) {
  wx.showToast({
    title,
    icon: 'none',
    duration: 1800,
  })
}

function syncTabBar(page, selected) {
  const tabBar = typeof page.getTabBar === 'function' && page.getTabBar()
  if (tabBar) tabBar.setSelected(selected)
}
