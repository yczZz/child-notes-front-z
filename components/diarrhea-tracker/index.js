// components/diarrhea-tracker/index.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    diarrheaTypes: {
      type: String,
      value: '',
    },
    lastTime: {
      type: String,
      value: '',
    },
  },

  data: {
    timeSince: '--',
    _timer: null,
  },

  observers: {
    'visible, lastTime'(visible, lastTime) {
      if (visible && lastTime) {
        this.startCountdown(lastTime)
      } else {
        this.stopCountdown()
        this.setData({ timeSince: '--' })
      }
    },
  },

  lifetimes: {
    detached() {
      this.stopCountdown()
    },
  },

  methods: {
    startCountdown(lastTime) {
      this.stopCountdown()
      const update = () => {
        const last = new Date(lastTime.replace(/-/g, '/'))
        const now = new Date()
        const diffMin = Math.floor((now - last) / 1000 / 60)
        const h = Math.floor(diffMin / 60)
        const m = diffMin % 60
        this.setData({
          timeSince: h > 0 ? `${h}小时${m}分钟前` : `${m}分钟前`,
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

    onRecordDiaper() {
      this.triggerEvent('recorddiaper')
    },

    onRecordAbnormal() {
      this.triggerEvent('recordabnormal')
    },

    onRecordMaternalFood() {
      this.triggerEvent('recordmaternalfood')
    },

    onRecovered() {
      wx.showModal({
        title: '确认恢复',
        content: '宝宝腹泻已经好转了吗？',
        confirmText: '确认恢复',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('recovered')
          }
        },
      })
    },
  },
})
