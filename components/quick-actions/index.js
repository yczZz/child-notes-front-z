// components/quick-actions/index.js
Component({
  properties: {
    sleepActive: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    expanded: false,
  },

  methods: {
    onToggle() {
      this.setData({ expanded: !this.data.expanded })
    },

    onCollapse() {
      this.setData({ expanded: false })
    },

    onTap(e) {
      const type = e.currentTarget.dataset.type
      this.setData({ expanded: false })
      // 延迟触发让收起动画先播放
      setTimeout(() => {
        this.triggerEvent('record', { type })
      }, 200)
    },
  },
})
