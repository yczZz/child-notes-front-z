// components/sleep-form/index.js
const {
  buildTimeRange: buildRecordTimeRange,
  formatDate,
  getTimeIndex,
  normalizeRecordTime,
} = require('../../utils/util')

function parseRecordTime(time) {
  if (!time) return null
  const date = new Date(time.replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

function hasSecondPrecision(time) {
  return /\d{1,2}:\d{2}:\d{2}/.test(String(time || ''))
}

function getElapsedSecondsFrom(startTime) {
  const start = parseRecordTime(startTime)
  if (!start) return 0
  const now = new Date()
  if (!hasSecondPrecision(startTime)) now.setSeconds(0, 0)
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
}

function getSleepDurationSec(record) {
  if (!record) return 0
  if (record.duration) return Math.max(0, Number(record.duration) || 0) * 60
  const start = parseRecordTime(record.startTime)
  const end = parseRecordTime(record.endTime)
  if (start && end && end > start) {
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
  }
  if (start && !record.endTime) {
    return getElapsedSecondsFrom(record.startTime)
  }
  return 0
}

function isCompletedSleepEdit(record) {
  return Boolean(record && record.id && record.startTime && record.endTime)
}

Component({
  properties: {
    editData: { type: Object, value: null },
    sleepOngoing: { type: Object, value: null },
  },
  observers: {
    'editData'(val) {
      if (!val) return
      this.clearTimer()
      const startTime = val.startTime ? normalizeRecordTime(val.startTime) : ''
      const endTime = val.endTime ? normalizeRecordTime(val.endTime) : ''
      const timeRange = buildRecordTimeRange([startTime, endTime])
      const timerSeconds = getSleepDurationSec(val)
      const timing = Boolean(startTime && !endTime)
      const completedEdit = isCompletedSleepEdit(val)
      this.setData({
        ongoingId: val.id || null,
        timing,
        completedEdit,
        timerSeconds,
        timerDisplay: this._fmtTimer(timerSeconds),
        startTime,
        endTime,
        duration: val.duration ? String(val.duration) : '',
        note: val.note || '',
        timeRange,
        startTimeIndex: getTimeIndex(startTime, timeRange),
        endTimeIndex: getTimeIndex(endTime || startTime, timeRange),
      })
      if (timing) {
        this._timerBaseSeconds = timerSeconds
        this._intervalStartTime = Date.now()
        this._startInterval()
      }
    },
    'sleepOngoing'(val) {
      if (val && val.id) {
        this.setData({ ongoingId: val.id })
        if (!this.data.timing) {
          const start = val.startTime ? new Date(val.startTime.replace(/-/g, '/')) : new Date()
          const startTime = val.startTime ? normalizeRecordTime(val.startTime) : formatDate(start, 'YYYY-MM-DD HH:mm')
          const timeRange = buildRecordTimeRange([startTime])
          const elapsedSec = val.startTime ? getElapsedSecondsFrom(val.startTime) : 0
          this._intervalStartTime = start.getTime()
          this.setData({
            timing: true,
            startTime,
            timeRange,
            startTimeIndex: getTimeIndex(startTime, timeRange),
            endTimeIndex: getTimeIndex(startTime, timeRange),
            timerSeconds: elapsedSec,
            timerDisplay: this._fmtTimer(elapsedSec),
          })
          this._timerBaseSeconds = elapsedSec
          this._intervalStartTime = Date.now()
          this._startInterval()
        }
      }
    },
  },
  data: {
    ongoingId: null,
    timing: false,
    timerSeconds: 0,
    timerDisplay: '00:00:00',
    startTime: '',
    endTime: '',
    note: '',
    duration: '',
    manualDuration: '',
    completedEdit: false,
    timeRange: [],
    startTimeIndex: [],
    endTimeIndex: [],
  },

  lifetimes: {
    attached() {
      const editData = this.properties.editData
      const ongoing = this.properties.sleepOngoing
      const startTime = editData && editData.startTime
        ? normalizeRecordTime(editData.startTime)
        : (ongoing && ongoing.startTime ? normalizeRecordTime(ongoing.startTime) : '')
      const endTime = editData && editData.endTime ? normalizeRecordTime(editData.endTime) : ''
      const timeRange = buildRecordTimeRange([startTime, endTime])
      this.setData({
        timeRange,
        startTimeIndex: getTimeIndex(startTime, timeRange),
        endTimeIndex: getTimeIndex(endTime || startTime, timeRange),
      })
    },
    detached() {
      this.clearTimer()
    },
  },

  methods: {
    _fmtTimer(sec) {
      const h = Math.floor(sec / 3600)
      const m = Math.floor((sec % 3600) / 60)
      const s = sec % 60
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    },

    _startInterval() {
      this.clearTimer()
      this._timerId = setInterval(() => {
        const sec = (this._timerBaseSeconds || 0) + Math.floor((Date.now() - this._intervalStartTime) / 1000)
        this.setData({ timerSeconds: sec, timerDisplay: this._fmtTimer(sec) })
      }, 200)
    },

    _elapsedSecondsFrom(startTime) {
      return getElapsedSecondsFrom(startTime)
    },

    _activateOngoingTimer(startTime) {
      const elapsedSec = this._elapsedSecondsFrom(startTime)
      const timeRange = buildRecordTimeRange([startTime])
      this._timerBaseSeconds = elapsedSec
      this._intervalStartTime = Date.now()
      this.setData({
        timing: true,
        completedEdit: false,
        startTime,
        endTime: '',
        duration: '',
        manualDuration: '',
        timerSeconds: elapsedSec,
        timerDisplay: this._fmtTimer(elapsedSec),
        timeRange,
        startTimeIndex: getTimeIndex(startTime, timeRange),
        endTimeIndex: getTimeIndex(startTime, timeRange),
      })
      this._startInterval()
    },

    _saveOngoingStartTime(startTime) {
      const data = {
        startTime,
        endTime: null,
        note: this.data.note || undefined,
      }
      if (this.data.ongoingId) {
        data.id = this.data.ongoingId
        data.saveProgress = true
      }
      this.triggerEvent('save', data)
    },

    startTimer() {
      if (this.data.completedEdit) return
      const startTime = this.data.startTime || formatDate(new Date(), 'YYYY-MM-DD HH:mm')
      this._activateOngoingTimer(startTime)
      this._saveOngoingStartTime(startTime)
    },

    stopTimer() {
      this.clearTimer()
      const sec = this.data.timerSeconds || 0
      const endTime = formatDate(new Date(), 'YYYY-MM-DD HH:mm')
      const duration = Math.max(1, Math.ceil(sec / 60))
      this.setData({ timing: false, endTime, duration: String(duration) })
      if (this.properties.editData && this.properties.editData.id) {
        this.triggerEvent('save', { startTime: this.data.startTime, endTime, duration, note: this.data.note || undefined })
        this.triggerEvent('close')
        return
      }
      this.triggerEvent('wake', { id: this.data.ongoingId, startTime: this.data.startTime, note: this.data.note || undefined })
    },

    onNoteInput(e) {
      this.setData({ note: e.detail.value })
    },

    clearTimer() {
      if (this._timerId) {
        clearInterval(this._timerId)
        this._timerId = null
      }
    },

    buildTimeRange() {
      const timeRange = buildRecordTimeRange([this.data.startTime, this.data.endTime])
      this.setData({
        timeRange,
        startTimeIndex: getTimeIndex(this.data.startTime, timeRange),
        endTimeIndex: getTimeIndex(this.data.endTime || this.data.startTime, timeRange),
      })
    },

    onStartTimeChange(e) {
      const [y, m, d, h, min] = e.detail.value
      const t = this.data.timeRange
      const startTime = `${t[0][y]}-${String(m + 1).padStart(2,'0')}-${String(d + 1).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
      this.setData({ startTime, startTimeIndex: e.detail.value })
      if (!this.data.completedEdit) {
        this._activateOngoingTimer(startTime)
        this._saveOngoingStartTime(startTime)
        return
      }
      this.calcManualDuration(startTime, this.data.endTime)
    },

    onEndTimeChange(e) {
      const [y, m, d, h, min] = e.detail.value
      const t = this.data.timeRange
      const endTime = `${t[0][y]}-${String(m + 1).padStart(2,'0')}-${String(d + 1).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
      this.setData({ endTime, endTimeIndex: e.detail.value })
      this.calcManualDuration(this.data.startTime, endTime)
    },

    calcManualDuration(start, end) {
      if (!start || !end) return
      const s = new Date(start.replace(/-/g, '/'))
      const e = new Date(end.replace(/-/g, '/'))
      if (e <= s) { this.setData({ manualDuration: '结束时间必须晚于开始时间' }); return }
      const min = Math.floor((e - s) / 1000 / 60)
      const h = Math.floor(min / 60), m = min % 60
      this.setData({ manualDuration: h > 0 ? `${h}小时${m}分钟` : `${m}分钟` })
    },

    onManualSave() {
      const { startTime, endTime } = this.data
      if (!startTime || !endTime) { wx.showToast({ title: '请选择起止时间', icon: 'none' }); return }
      const s = new Date(startTime.replace(/-/g, '/'))
      const e = new Date(endTime.replace(/-/g, '/'))
      if (e <= s) { wx.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' }); return }
      const duration = Math.ceil((e - s) / 1000 / 60)
      const data = { startTime, endTime, duration, note: this.data.note || undefined }
      if (this.data.ongoingId) data.id = this.data.ongoingId
      this.triggerEvent('save', data)
      this.triggerEvent('close')
    },
  },
})
