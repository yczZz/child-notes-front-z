// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    tabs: [
      { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
      { pagePath: '/pages/feeding/index', text: '喂养', icon: '🍼' },
      { pagePath: '/pages/growth/index', text: '成长', icon: '📏' },
      { pagePath: '/pages/mine/index', text: '我的', icon: '👤' },
    ],
  },

  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      if (this.data.selected === index) return
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    },
  },
})
