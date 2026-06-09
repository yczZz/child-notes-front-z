// components/fever-tracker/index.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    temperature: {
      type: Number,
      value: 0,
    },
    lastMedTime: {
      type: String,
      value: '',
    },
  },

  data: {
    timeSinceMed: '--',
    overdoseWarning: false,
    _timer: null,
  },

  observers: {
    'visible, lastMedTime'(visible, lastMedTime) {
      if (visible && lastMedTime) {
        this.startCountdown(lastMedTime)
      } else {
        this.stopCountdown()
        this.setData({ timeSinceMed: '暂未用药' })
      }
    },
  },

  lifetimes: {
    detached() {
      this.stopCountdown()
    },
  },

  methods: {
    startCountdown(lastMedTime) {
      this.stopCountdown()
      const update = () => {
        const last = new Date(lastMedTime.replace(/-/g, '/'))
        const now = new Date()
        const diffMin = Math.floor((now - last) / 1000 / 60)
        const h = Math.floor(diffMin / 60)
        const m = diffMin % 60
        this.setData({
          timeSinceMed: h > 0 ? `${h}小时${m}分钟` : `${m}分钟`,
          overdoseWarning: diffMin < 240, // 4小时 = 240分钟
        })
      }
      update()
      this.setData({ _timer: setInterval(update, 30000) })
    },

    stopCountdown() {
      if (this.data._timer) {
        clearInterval(this.data._timer)
        this.setData({ _timer: null })
      }
    },

    onRecordTemp() {
      this.triggerEvent('recordtemp')
    },

    onRecordMed() {
      this.triggerEvent('recordmed')
    },

    onRecovered() {
      wx.showModal({
        title: '确认退烧',
        content: '宝宝已经退烧了吗？点击确认后将关闭发烧追踪面板。',
        confirmText: '确认退烧',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('recovered')
          }
        },
      })
    },
  },
})
