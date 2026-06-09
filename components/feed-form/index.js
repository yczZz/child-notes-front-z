// components/feed-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const recordService = require('../../services/record')

function getSideAccSec(record, side) {
  const rawSec = record[`${side}DurationSec`]
  if (rawSec !== undefined && rawSec !== null && rawSec !== '') {
    const sec = Number(rawSec)
    if (!Number.isNaN(sec) && sec >= 0) return sec
  }
  return (record[`${side}Duration`] || 0) * 60
}

function getActiveSideSec(record, side) {
  const startTime = record[`${side}StartTime`]
  if (!startTime) return 0
  const start = new Date(startTime.replace(/-/g, '/')).getTime()
  if (Number.isNaN(start)) return 0
  return Math.max(0, Math.floor((Date.now() - start) / 1000))
}

function hasActiveSideStart(record, side) {
  const startTime = record[`${side}StartTime`]
  if (!startTime) return false
  const start = new Date(startTime.replace(/-/g, '/')).getTime()
  return !Number.isNaN(start)
}

const DURATION_PICKER_RANGE = [
  Array.from({ length: 13 }, (_, i) => `${i}小时`),
  Array.from({ length: 60 }, (_, i) => `${i}分钟`),
]

const AMOUNT_OPTIONS = Array.from({ length: 99 }, (_, i) => 10 + i * 5)
const AMOUNT_PICKER_RANGE = AMOUNT_OPTIONS.map(value => `${value}ml`)

function getDurationIndex(sec) {
  const maxMin = 12 * 60 + 59
  const totalMin = Math.min(maxMin, Math.max(0, Math.ceil((Number(sec) || 0) / 60)))
  return [Math.floor(totalMin / 60), totalMin % 60]
}

function getDurationSecFromIndex(index) {
  const [hourIndex, minuteIndex] = index || [0, 0]
  return ((Number(hourIndex) || 0) * 60 + (Number(minuteIndex) || 0)) * 60
}

function normalizeAmount(value) {
  const raw = Number(value)
  if (!raw || raw <= 0 || Number.isNaN(raw)) return 10
  const rounded = Math.round(raw / 5) * 5
  return Math.max(10, Math.min(500, rounded))
}

function getAmountIndex(value) {
  return Math.max(0, AMOUNT_OPTIONS.indexOf(normalizeAmount(value)))
}

function getAmountFromIndex(index) {
  return AMOUNT_OPTIONS[Number(index) || 0] || 10
}

function findLatestAmountFromFeeds(feeds) {
  const list = Array.isArray(feeds) ? feeds : []
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const record = list[i] || {}
    if (record.type !== 'breast' && Number(record.amount) > 0) {
      return normalizeAmount(record.amount)
    }
  }
  return 0
}

Component({
  properties: {
    editData: { type: Object, value: null },
    feedOngoing: { type: Object, value: null },
  },
  observers: {
    'editData'(val) {
      if (!val) return
      this.clearAllTimers()
      const t = val.type || 'bottle'
      const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
      if (t === 'breast') {
        let leftSec = getSideAccSec(val, 'left')
        const rightSec = getSideAccSec(val, 'right')
        if (leftSec === 0 && rightSec === 0 && val.duration) {
          leftSec = (Number(val.duration) || 0) * 60
        }
        const leftSeconds = getActiveSideSec(val, 'left')
        const rightSeconds = getActiveSideSec(val, 'right')
        const leftTiming = hasActiveSideStart(val, 'left')
        const rightTiming = hasActiveSideStart(val, 'right')
        this.setData({
          feedType: 'breast',
          mode: 'timer',
          leftAccSec: leftSec,
          rightAccSec: rightSec,
          leftAccMin: Math.floor(leftSec / 60),
          rightAccMin: Math.floor(rightSec / 60),
          leftTiming,
          rightTiming,
          leftSeconds,
          rightSeconds,
          leftTimerDisplay: this._fmtDuration(leftSec + leftSeconds),
          rightTimerDisplay: this._fmtDuration(rightSec + rightSeconds),
          totalTimerDisplay: this._fmtDuration(leftSec + rightSec + leftSeconds + rightSeconds),
          leftDurationIndex: getDurationIndex(leftSec + leftSeconds),
          rightDurationIndex: getDurationIndex(rightSec + rightSeconds),
          duration: val.duration ? String(val.duration) : '',
          note: val.note || '',
          recordTime,
          ...buildTimeSelector(recordTime),
          _ongoingId: val.id || null,
          _ongoingTime: recordTime,
        })
        if (leftTiming) this._startLeftInterval()
        if (rightTiming) this._startRightInterval()
      } else {
        this.setData({
          feedType: t,
          mode: val.duration ? 'manual' : 'timer',
          timerSeconds: 0,
          timerDisplay: '00:00',
          duration: val.duration ? String(val.duration) : '',
          amount: String(normalizeAmount(val.amount || this.data.amount)),
          amountIndex: getAmountIndex(val.amount || this.data.amount),
          amountReady: true,
          note: val.note || '',
          recordTime,
          ...buildTimeSelector(recordTime),
        })
      }
    },
    'feedOngoing'(val) {
      if (val && val.saveProgress && val.id === this.data._ongoingId) {
        return
      }
      if (val && val.id && val.type === 'breast' && !val.duration) {
        const leftAcc = getSideAccSec(val, 'left')
        const rightAcc = getSideAccSec(val, 'right')
        const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
        const now = Date.now()
        let leftSec = 0, rightSec = 0
        let leftTiming = false, rightTiming = false

        if (val.leftStartTime) {
          const st = new Date(val.leftStartTime.replace(/-/g, '/')).getTime()
          if (!isNaN(st)) {
            leftTiming = true
            leftSec = Math.floor((now - st) / 1000)
          }
        }
        if (val.rightStartTime) {
          const st = new Date(val.rightStartTime.replace(/-/g, '/')).getTime()
          if (!isNaN(st)) {
            rightTiming = true
            rightSec = Math.floor((now - st) / 1000)
          }
        }

        this.setData({
          feedType: 'breast',
          leftAccSec: leftAcc,
          rightAccSec: rightAcc,
          leftAccMin: Math.floor(leftAcc / 60),
          rightAccMin: Math.floor(rightAcc / 60),
          leftTiming, rightTiming,
          leftSeconds: leftSec,
          rightSeconds: rightSec,
          leftTimerDisplay: this._fmtDuration(leftAcc + leftSec),
          rightTimerDisplay: this._fmtDuration(rightAcc + rightSec),
          leftDurationIndex: getDurationIndex(leftAcc + leftSec),
          rightDurationIndex: getDurationIndex(rightAcc + rightSec),
          note: val.note || '',
          recordTime,
          ...buildTimeSelector(recordTime),
          _ongoingId: val.id,
          _ongoingTime: recordTime,
        })
        this._updateTotal()
        if (leftTiming) this._startLeftInterval()
        if (rightTiming) this._startRightInterval()
      }
    },
  },
  data: {
    feedType: 'bottle',
    mode: 'timer',
    // 原单侧计时（配方奶/瓶喂用）
    timing: false,
    timerSeconds: 0,
    timerDisplay: '00:00',
    // 母乳双侧计时
    leftTiming: false,
    rightTiming: false,
    leftSeconds: 0,
    rightSeconds: 0,
    leftTimerDisplay: '00:00',
    rightTimerDisplay: '00:00',
    leftAccSec: 0,
    rightAccSec: 0,
    leftAccMin: 0,
    rightAccMin: 0,
    durationPickerRange: DURATION_PICKER_RANGE,
    leftDurationIndex: [0, 0],
    rightDurationIndex: [0, 0],
    totalTimerDisplay: '00:00',
    // 通用
    side: 'left',
    duration: '',
    amount: '10',
    amountPickerRange: AMOUNT_PICKER_RANGE,
    amountIndex: 0,
    amountReady: false,
    note: '',
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [0, 0, 0, 0, 0],
    _leftTimer: null,
    _rightTimer: null,
    _singleTimer: null,
    _ongoingId: null,
    _ongoingTime: null,
    _amountTouched: false,
  },

  lifetimes: {
    attached() {
      const editTime = this.properties.editData && this.properties.editData.time
      const ongoingTime = this.properties.feedOngoing && this.properties.feedOngoing.time
      const recordTime = normalizeRecordTime(editTime || ongoingTime || formatDate(new Date(), 'YYYY-MM-DD HH:mm'))
      this.setData({
        recordTime,
        ...buildTimeSelector(recordTime),
      })
      this.loadLatestAmount()
    },
    detached() {
      this.clearAllTimers()
    },
  },

  methods: {
    switchType(e) {
      const type = e.currentTarget.dataset.type
      this.clearAllTimers()
      this.setData({
        feedType: type,
        leftTiming: false, rightTiming: false,
        leftSeconds: 0, rightSeconds: 0,
        leftAccSec: 0, rightAccSec: 0,
        leftAccMin: 0, rightAccMin: 0,
        leftTimerDisplay: '00:00', rightTimerDisplay: '00:00',
        leftDurationIndex: [0, 0], rightDurationIndex: [0, 0],
        totalTimerDisplay: '00:00',
        timing: false, timerSeconds: 0, timerDisplay: '00:00',
        mode: 'timer',
      })
      if (type === 'bottle' || type === 'expressed') {
        this.applyAmount(this.data.amount || 10)
      }
    },

    setMode(e) {
      this.clearAllTimers()
      this.setData({
        mode: 'manual',
        leftAccSec: 0, rightAccSec: 0,
        leftAccMin: 0, rightAccMin: 0,
        leftSeconds: 0, rightSeconds: 0,
        leftTimerDisplay: '00:00', rightTimerDisplay: '00:00',
        leftDurationIndex: [0, 0], rightDurationIndex: [0, 0],
        totalTimerDisplay: '00:00',
        _ongoingId: null,
      })
    },

    // ==================== 双侧计时 ====================
    _fmtDuration(sec) {
      const total = Math.max(0, Math.floor(sec || 0))
      const h = Math.floor(total / 3600)
      const m = Math.floor((total % 3600) / 60)
      const s = total % 60
      if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      }
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    },

    _getSideTotalSec(side) {
      return (Number(this.data[`${side}AccSec`]) || 0) + (Number(this.data[`${side}Seconds`]) || 0)
    },

    _applySideDuration(side, totalSec) {
      const otherSide = side === 'left' ? 'right' : 'left'
      const otherTotal = this._getSideTotalSec(otherSide)
      this.setData({
        mode: 'timer',
        duration: '',
        [`${side}AccSec`]: totalSec,
        [`${side}AccMin`]: Math.floor(totalSec / 60),
        [`${side}Seconds`]: 0,
        [`${side}TimerDisplay`]: this._fmtDuration(totalSec),
        [`${side}DurationIndex`]: getDurationIndex(totalSec),
        totalTimerDisplay: this._fmtDuration(totalSec + otherTotal),
      })
    },

    _updateTotal() {
      const leftTotal = this.data.leftAccSec + this.data.leftSeconds
      const rightTotal = this.data.rightAccSec + this.data.rightSeconds
      this.setData({ totalTimerDisplay: this._fmtDuration(leftTotal + rightTotal) })
    },

    _startLeftInterval() {
      this._stopLeftInterval()
      this._leftTimer = setInterval(() => {
        const sec = this.data.leftSeconds + 1
        this.setData({ leftSeconds: sec, leftTimerDisplay: this._fmtDuration(this.data.leftAccSec + sec) })
        this._updateTotal()
      }, 1000)
    },

    _stopLeftInterval() {
      if (this._leftTimer) { clearInterval(this._leftTimer); this._leftTimer = null }
    },

    _startRightInterval() {
      this._stopRightInterval()
      this._rightTimer = setInterval(() => {
        const sec = this.data.rightSeconds + 1
        this.setData({ rightSeconds: sec, rightTimerDisplay: this._fmtDuration(this.data.rightAccSec + sec) })
        this._updateTotal()
      }, 1000)
    },

    _stopRightInterval() {
      if (this._rightTimer) { clearInterval(this._rightTimer); this._rightTimer = null }
    },

    _autoStopOpposite(side) {
      if (side === 'left' && this.data.rightTiming) {
        this._stopRightInterval()
        const accSec = this.data.rightAccSec + this.data.rightSeconds
        this.setData({
          rightTiming: false, rightAccSec: accSec,
          rightAccMin: Math.floor(accSec / 60), rightSeconds: 0,
          rightTimerDisplay: this._fmtDuration(accSec),
          rightDurationIndex: getDurationIndex(accSec),
        })
      }
      if (side === 'right' && this.data.leftTiming) {
        this._stopLeftInterval()
        const accSec = this.data.leftAccSec + this.data.leftSeconds
        this.setData({
          leftTiming: false, leftAccSec: accSec,
          leftAccMin: Math.floor(accSec / 60), leftSeconds: 0,
          leftTimerDisplay: this._fmtDuration(accSec),
          leftDurationIndex: getDurationIndex(accSec),
        })
      }
    },

    startLeft() {
      this._autoStopOpposite('left')
      const now = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
      this.setData({
        leftTiming: true, leftSeconds: 0,
        leftTimerDisplay: this._fmtDuration(this.data.leftAccSec),
      })
      this._startLeftInterval()
      this._updateTotal()
      if (this.data._ongoingId) {
        this._saveState({ leftStartTime: now, rightStartTime: null })
      } else {
        const recordTime = this.data.recordTime || now
        this.setData({ _ongoingTime: recordTime })
        this.triggerEvent('save', { startOnly: true, type: 'breast', side: 'left', leftStartTime: now, time: recordTime })
      }
    },

    stopLeft() {
      this._stopLeftInterval()
      const accSec = this.data.leftAccSec + this.data.leftSeconds
      this.setData({
        leftTiming: false, leftAccSec: accSec,
        leftAccMin: Math.floor(accSec / 60), leftSeconds: 0,
        leftTimerDisplay: this._fmtDuration(accSec),
        leftDurationIndex: getDurationIndex(accSec),
      })
      this._updateTotal()
      this._saveState({ leftStartTime: null })
    },

    startRight() {
      this._autoStopOpposite('right')
      const now = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
      this.setData({
        rightTiming: true, rightSeconds: 0,
        rightTimerDisplay: this._fmtDuration(this.data.rightAccSec),
      })
      this._startRightInterval()
      this._updateTotal()
      if (this.data._ongoingId) {
        this._saveState({ rightStartTime: now, leftStartTime: null })
      } else {
        const recordTime = this.data.recordTime || now
        this.setData({ _ongoingTime: recordTime })
        this.triggerEvent('save', { startOnly: true, type: 'breast', side: 'right', rightStartTime: now, time: recordTime })
      }
    },

    stopRight() {
      this._stopRightInterval()
      const accSec = this.data.rightAccSec + this.data.rightSeconds
      this.setData({
        rightTiming: false, rightAccSec: accSec,
        rightAccMin: Math.floor(accSec / 60), rightSeconds: 0,
        rightTimerDisplay: this._fmtDuration(accSec),
        rightDurationIndex: getDurationIndex(accSec),
      })
      this._updateTotal()
      this._saveState({ rightStartTime: null })
    },

    _saveState(overrides) {
      const id = this.data._ongoingId
      if (!id) return
      const { leftAccSec, rightAccSec, leftTiming, rightTiming, note } = this.data
      const recordTime = this.data._ongoingTime || this.data.recordTime
      const payload = {
        id, type: 'breast',
        leftDurationSec: leftAccSec,
        rightDurationSec: rightAccSec,
        leftDuration: Math.ceil(leftAccSec / 60),
        rightDuration: Math.ceil(rightAccSec / 60),
        time: recordTime, note: note || undefined, saveProgress: true,
      }
      if ('leftStartTime' in overrides) payload.leftStartTime = overrides.leftStartTime
      if ('rightStartTime' in overrides) payload.rightStartTime = overrides.rightStartTime
      this.triggerEvent('save', payload)
    },

    clearAllTimers() {
      this._stopLeftInterval()
      this._stopRightInterval()
      if (this._singleTimer) { clearInterval(this._singleTimer); this._singleTimer = null }
      if (this.data._timer) { clearInterval(this.data._timer); this.setData({ _timer: null }) }
    },

    // ==================== 单侧计时（配方奶/瓶喂用） ====================
    _startSingleInterval() {
      this.clearAllTimers()
      this._singleTimer = setInterval(() => {
        const sec = this.data.timerSeconds + 1
        this.setData({ timerSeconds: sec, timerDisplay: this._fmtDuration(sec) })
      }, 1000)
    },

    startSingleTimer() {
      this.setData({ timing: true })
      this._startSingleInterval()
    },

    stopSingleTimer() {
      if (this._singleTimer) { clearInterval(this._singleTimer); this._singleTimer = null }
      this.setData({ timing: false })
    },

    // ==================== 通用 ====================
    onDurationInput(e) {
      this.setData({ duration: e.detail.value })
    },

    onSideDurationChange(e) {
      const side = e.currentTarget.dataset.side
      if (!side || this.data[`${side}Timing`]) return
      this._applySideDuration(side, getDurationSecFromIndex(e.detail.value))
    },

    onAmountChange(e) {
      this.setData({ _amountTouched: true })
      this.applyAmount(getAmountFromIndex(e.detail.value))
    },

    applyAmount(value) {
      const amount = normalizeAmount(value)
      this.setData({
        amount: String(amount),
        amountIndex: getAmountIndex(amount),
        amountReady: true,
      })
    },

    shouldAutoFillAmount() {
      return !this.properties.editData && !this.data._amountTouched
    },

    async loadLatestAmount() {
      if (!this.shouldAutoFillAmount()) return
      try {
        const today = await recordService.getTodayRecords()
        if (!this.shouldAutoFillAmount()) return
        let amount = findLatestAmountFromFeeds(today && today.feeds)
        if (!amount) {
          const history = await recordService.getHistoryRecords()
          if (!this.shouldAutoFillAmount()) return
          const days = Array.isArray(history) ? history : []
          for (let i = 0; i < days.length && !amount; i += 1) {
            amount = findLatestAmountFromFeeds(days[i] && days[i].feeds)
          }
        }
        this.applyAmount(amount || 10)
      } catch (e) {
        this.applyAmount(this.data.amount || 10)
      }
    },

    onNoteInput(e) {
      this.setData({ note: e.detail.value })
    },

    buildTimeRange() {
      this.setData(buildTimeSelector(this.data.recordTime))
    },

    onTimeChange(e) {
      const [y, m, d, h, min] = e.detail.value
      const recordTime = `${this.data.timeRange[0][y]}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      this.setData({ recordTime, timeIndex: e.detail.value })
    },

    onSave() {
      const { feedType, amount, note, recordTime, _ongoingId, leftAccSec, rightAccSec } = this.data
      let data

      if (feedType === 'breast') {
        let leftTotalSec = leftAccSec
        let rightTotalSec = rightAccSec
        if (this.data.leftTiming) leftTotalSec += this.data.leftSeconds
        if (this.data.rightTiming) rightTotalSec += this.data.rightSeconds
        const leftMin = Math.ceil(leftTotalSec / 60)
        const rightMin = Math.ceil(rightTotalSec / 60)
        const totalDuration = leftMin + rightMin
        if (totalDuration <= 0) { wx.showToast({ title: '暂无喂奶时长', icon: 'none' }); return }
        data = {
          type: 'breast', duration: totalDuration,
          leftDuration: leftMin, rightDuration: rightMin,
          leftDurationSec: leftTotalSec, rightDurationSec: rightTotalSec,
          leftStartTime: null, rightStartTime: null,
          time: recordTime, note: note || undefined,
        }
        if (_ongoingId) data.id = _ongoingId
      } else {
        if (!this.data.amountReady) { wx.showToast({ title: '正在读取上次奶量', icon: 'none' }); return }
        if (!amount || Number(amount) <= 0) { wx.showToast({ title: '请输入喂养量', icon: 'none' }); return }
        data = { type: feedType, amount: Number(amount), time: recordTime, note: note || undefined }
      }

      this.clearAllTimers()
      this.triggerEvent('save', data)
      this.triggerEvent('close')
    },
  },
})
