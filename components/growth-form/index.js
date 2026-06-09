// components/growth-form/index.js
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
        height: val.height ? String(val.height) : '',
        weight: val.weight ? String(val.weight) : '',
        note: val.note || '',
        recordTime,
        ...buildTimeSelector(recordTime),
      })
    },
  },
  data: {
    height: '',
    weight: '',
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
    onHeightInput(e) {
      this.setData({ height: e.detail.value })
    },

    onWeightInput(e) {
      this.setData({ weight: e.detail.value })
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
      const { height, weight, note, recordTime } = this.data
      if (!height && !weight) {
        wx.showToast({ title: '请至少填写身高或体重', icon: 'none' })
        return
      }
      this.triggerEvent('save', {
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        note: note || undefined,
        time: recordTime,
      })
      this.triggerEvent('close')
    },
  },
})
