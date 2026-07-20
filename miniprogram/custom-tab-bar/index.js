const { getImageFileIds } = require('../util/cloud-images')

const imageFileIds = getImageFileIds()

const tabs = [
  {
    pagePath: 'pages/bank/index',
    text: '\u9898\u5e93\u7ba1\u7406',
    iconFileId: imageFileIds.tabBank,
    selectedIconFileId: imageFileIds.tabBankActive,
  },
  {
    pagePath: 'pages/quiz/index',
    text: '\u968f\u673a\u7ec3\u4e60',
    iconFileId: imageFileIds.tabQuiz,
    selectedIconFileId: imageFileIds.tabQuizActive,
  },
  {
    pagePath: 'pages/create/index',
    text: '\u65b0\u589e\u9898\u76ee',
    iconFileId: imageFileIds.tabCreate,
    selectedIconFileId: imageFileIds.tabCreateActive,
  },
]

Component({
  data: {
    selected: 0,
    tabs: createTabData(0),
  },

  lifetimes: {
    attached() {
      this.updateSelected()
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
      const selectedIndex = selected < 0 ? 0 : selected
      this.setData({
        selected: selectedIndex,
        tabs: createTabData(selectedIndex),
      })
    },

    switchTab(event) {
      const index = event.currentTarget.dataset.index
      if (index === this.data.selected) return
      wx.switchTab({ url: `/${tabs[index].pagePath}` })
    },
  },
})

function createTabData(selected) {
  return tabs.map((tab, index) => ({
    ...tab,
    iconSrc: index === selected ? tab.selectedIconFileId : tab.iconFileId,
  }))
}
