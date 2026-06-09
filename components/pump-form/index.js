// components/pump-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')

Component({
  properties: {
    editData: { type: Object, value: null },
  },
  observers: {
    'editData'(val) {
      if (!val) return
      const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
      this.setData({
        leftDuration: val.leftDuration ? String(val.leftDuration) : '',
        rightDuration: val.rightDuration ? String(val.rightDuration) : '',
        leftAmount: val.leftAmount ? String(val.leftAmount) : '',
        rightAmount: val.rightAmount ? String(val.rightAmount) : '',
        totalAmount: val.totalAmount ? String(val.totalAmount) : '',
        note: val.note || '',
        recordTime,
        ...buildTimeSelector(recordTime),
      })
    },
  },
  data: {
    leftDuration: '',
    rightDuration: '',
    leftAmount: '',
    rightAmount: '',
    totalAmount: '',
    note: '',
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.properties.editData && this.properties.editData.time || formatDate(new Date(), 'YYYY-MM-DD HH:mm'))
      this.setData({
        recordTime,
        ...buildTimeSelector(recordTime),
      })
    },
  },

  methods: {
    onLeftDurationInput(e) {
      this.setData({ leftDuration: e.detail.value })
    },

    onRightDurationInput(e) {
      this.setData({ rightDuration: e.detail.value })
    },

    onLeftAmountInput(e) {
      const v = e.detail.value
      this.setData({ leftAmount: v })
      this.calcTotal(v, this.data.rightAmount)
    },

    onRightAmountInput(e) {
      const v = e.detail.value
      this.setData({ rightAmount: v })
      this.calcTotal(this.data.leftAmount, v)
    },

    calcTotal(left, right) {
      const l = parseInt(left) || 0
      const r = parseInt(right) || 0
      const total = l + r
      this.setData({ totalAmount: total > 0 ? String(total) : '' })
    },

    onNoteInput(e) {
      this.setData({ note: e.detail.value })
    },

    buildTimeRange() {
      this.setData(buildTimeSelector(this.data.recordTime))
    },

    onTimeChange(e) {
      const [y, m, d, h, min] = e.detail.value
      const t = this.data.timeRange
      const recordTime = `${t[0][y]}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      this.setData({ recordTime, timeIndex: e.detail.value })
    },

    onSave() {
      const { leftDuration, rightDuration, leftAmount, rightAmount, totalAmount, note, recordTime } = this.data

      const hasDuration = (parseInt(leftDuration) || 0) > 0 || (parseInt(rightDuration) || 0) > 0
      const hasAmount = (parseInt(leftAmount) || 0) > 0 || (parseInt(rightAmount) || 0) > 0

      if (!hasDuration && !hasAmount) {
        wx.showToast({ title: '请至少填写时长或奶量', icon: 'none' })
        return
      }

      this.triggerEvent('save', {
        leftDuration: (parseInt(leftDuration) || 0) > 0 ? parseInt(leftDuration) : undefined,
        rightDuration: (parseInt(rightDuration) || 0) > 0 ? parseInt(rightDuration) : undefined,
        leftAmount: (parseInt(leftAmount) || 0) > 0 ? parseInt(leftAmount) : undefined,
        rightAmount: (parseInt(rightAmount) || 0) > 0 ? parseInt(rightAmount) : undefined,
        totalAmount: (parseInt(totalAmount) || 0) > 0 ? parseInt(totalAmount) : undefined,
        note: note || undefined,
        time: recordTime,
      })
      this.triggerEvent('close')
    },
  },
})
