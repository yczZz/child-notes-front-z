// components/activity-tracker/index.js
Component({
  properties: {
    lastActivity: {
      type: Object,
      value: null,
    },
    activities: {
      type: Array,
      value: [],
    },
    pageVersion: {
      type: Number,
      value: 0,
      observer() {
        this.setData({ showDetail: false, expanded: false })
      },
    },
  },

  data: {
    expanded: false,
    timeSince: '--',
    showDetail: false,
    timelineGroups: [],
    _timer: null,
  },

  observers: {
    'lastActivity'(val) {
      if (val && val.time) {
        this.startTimer(val.time)
      } else {
        this.stopTimer()
      }
    },
  },

  lifetimes: {
    detached() {
      this.stopTimer()
    },
  },

  methods: {
    startTimer(lastTime) {
      this.stopTimer()
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

    stopTimer() {
      if (this.data._timer) {
        clearInterval(this.data._timer)
        this.setData({ _timer: null, timeSince: '--' })
      }
    },

    onRecord() {
      this.triggerEvent('record')
    },

    onToggleDetail() {
      if (!this.data.showDetail) {
        this.buildTimeline()
      }
      this.setData({ showDetail: !this.data.showDetail })
    },

    onToggleExpanded() {
      this.setData({ expanded: !this.data.expanded })
    },

    onCloseDetail() {
      this.setData({ showDetail: false })
    },

    stopTap() {},

    buildTimeline() {
      const today = new Date()
      const todayStr = today.getFullYear() + '-'
        + String(today.getMonth() + 1).padStart(2, '0') + '-'
        + String(today.getDate()).padStart(2, '0')

      const groups = []
      let lastDate = ''
      this.data.activities.forEach(item => {
        const dateStr = item.time ? item.time.split(' ')[0] : ''
        if (dateStr !== lastDate) {
          lastDate = dateStr
          groups.push({
            label: dateStr === todayStr ? '今天' : dateStr,
            isToday: dateStr === todayStr,
            items: [],
          })
        }
        groups[groups.length - 1].items.push(item)
      })
      this.setData({ timelineGroups: groups })
    },
  },
})
