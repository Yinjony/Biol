const { getImageUrls } = require('../util/cloud-images')

const tabs = [
  { pagePath: 'pages/bank/index', text: '\u9898\u5e93\u7ba1\u7406', iconKey: 'tabBank', selectedIconKey: 'tabBankActive' },
  { pagePath: 'pages/quiz/index', text: '\u968f\u673a\u7ec3\u4e60', iconKey: 'tabQuiz', selectedIconKey: 'tabQuizActive' },
  { pagePath: 'pages/create/index', text: '\u65b0\u589e\u9898\u76ee', iconKey: 'tabCreate', selectedIconKey: 'tabCreateActive' },
]

Component({
  data: {
    selected: 0,
    tabs,
  },

  lifetimes: {
    attached() {
      this.updateSelected()
      getImageUrls().then((imageUrls) => {
        this.setData({
          tabs: tabs.map((tab) => ({
            ...tab,
            iconUrl: imageUrls[tab.iconKey],
            selectedIconUrl: imageUrls[tab.selectedIconKey],
          })),
        })
      }).catch((error) => console.error('Failed to load tab bar images from cloud storage.', error))
    },
  },

  pageLifetimes: {
    show() {
      this.updateSelected()
    },
  },

  methods: {
    updateSelected() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      const selected = tabs.findIndex((tab) => tab.pagePath === current.route)
      this.setData({ selected: selected < 0 ? 0 : selected })
    },

    switchTab(event) {
      const index = event.currentTarget.dataset.index
      if (index === this.data.selected) return
      wx.switchTab({ url: `/${tabs[index].pagePath}` })
    },
  },
})
