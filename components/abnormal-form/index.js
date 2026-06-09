// components/abnormal-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const { uploadFile } = require('../../services/upload')

Component({
  properties: {
    editData: { type: Object, value: null },
  },
  observers: {
    'editData'(val) {
      if (!val) return
      const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
      const legacyMedicine = val.medicine ? [val.medicine.name, val.medicine.dose].filter(Boolean).join(' ') : ''
      this.setData({
        respiratory: val.respiratory || [],
        vomit: val.vomit || '',
        other: val.other || legacyMedicine,
        note: val.note || '',
        photos: val.photos || [],
        recordTime,
        ...buildTimeSelector(recordTime),
      })
    },
  },
  data: {
    respiratory: [],
    vomit: '',
    other: '',
    note: '',
    photos: [],
    uploading: false,
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],

    respiratoryOptions: [
      { value: '咳嗽(轻微)', label: '咳嗽(轻微)' },
      { value: '咳嗽(频繁)', label: '咳嗽(频繁)' },
      { value: '打喷嚏', label: '打喷嚏' },
      { value: '流鼻涕', label: '流鼻涕' },
      { value: '鼻塞', label: '鼻塞' },
      { value: '呼吸急促', label: '呼吸急促' },
    ],
    vomitTypes: [
      { value: '溢奶', label: '溢奶（轻微）' },
      { value: '喷射', label: '喷射状呕吐（严重）' },
    ],
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
    toggleRespiratory(e) {
      const value = e.currentTarget.dataset.value
      let arr = [...this.data.respiratory]
      const idx = arr.indexOf(value)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(value)
      this.setData({ respiratory: arr })
    },

    selectVomit(e) {
      const value = e.currentTarget.dataset.value
      this.setData({ vomit: this.data.vomit === value ? '' : value })
    },

    onOtherInput(e) {
      this.setData({ other: e.detail.value })
    },

    onNoteInput(e) {
      this.setData({ note: e.detail.value })
    },

    addPhoto() {
      if (this.data.uploading) return
      this.triggerEvent('photochoose')
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: (res) => {
          this.setData({ uploading: true })
          uploadFile(res.tempFilePaths[0])
            .then(url => {
              this.setData({
                photos: [...this.data.photos, url],
                uploading: false,
              })
            })
            .catch(() => {
              wx.showToast({ title: '上传失败', icon: 'none' })
              this.setData({ uploading: false })
            })
        },
        complete: () => {
          this.triggerEvent('photochooseend')
        },
      })
    },

    removePhoto(e) {
      const photos = [...this.data.photos]
      photos.splice(e.currentTarget.dataset.index, 1)
      this.setData({ photos })
    },

    previewPhoto(e) {
      wx.previewImage({
        current: e.currentTarget.dataset.url,
        urls: this.data.photos,
      })
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
      const {
        respiratory, vomit,
        other, note, photos, recordTime, uploading,
      } = this.data
      const otherText = (other || '').trim()
      const noteText = (note || '').trim()

      if (respiratory.length === 0 &&
          !vomit && !otherText && !noteText) {
        wx.showToast({ title: '请至少填写一项', icon: 'none' })
        return
      }
      if (uploading) {
        wx.showToast({ title: '图片上传中', icon: 'none' })
        return
      }

      this.triggerEvent('save', {
        respiratory: respiratory.length > 0 ? respiratory : undefined,
        vomit: vomit || undefined,
        other: otherText || undefined,
        note: noteText || undefined,
        photos,
        time: recordTime,
      })
      this.triggerEvent('close')
    },
  },
})
