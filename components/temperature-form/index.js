// components/temperature-form/index.js
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
        temperature: val.temperature ? String(val.temperature) : '',
        isAbnormal: val.isAbnormal || false,
        note: val.note || '',
        recordTime,
        ...buildTimeSelector(recordTime),
      })
    },
  },
  data: {
    temperature: '',
    isAbnormal: false,
    feverWarning: false,
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
    onTempInput(e) {
      const temperature = e.detail.value
      this.setData({
        temperature,
        feverWarning: Number(temperature) >= 37.3,
      })
    },

    toggleAbnormal() {
      this.setData({ isAbnormal: !this.data.isAbnormal })
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
      const { temperature, isAbnormal, note, recordTime } = this.data
      if (!temperature) {
        wx.showToast({ title: '请输入体温', icon: 'none' })
        return
      }
      const value = Number(temperature)
      this.triggerEvent('save', {
        temperature: value,
        isAbnormal: isAbnormal || value >= 37.3,
        note: note || undefined,
        time: recordTime,
      })
      this.triggerEvent('close')
    },
  },
})
