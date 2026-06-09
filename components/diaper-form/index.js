// components/diaper-form/index.js
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
      this.setData({
        diaperType: val.type || 'wet',
        selectedColor: val.color || '',
        selectedConsistency: val.consistency || '',
        selectedUrineColor: val.urineColor || '',
        selectedUrineAmount: val.urineAmount || '',
        selectedStoolAmount: val.stoolAmount || '',
        selectedDiarrhea: val.diarrhea || [],
        photos: val.photos || [],
        note: val.note || '',
        recordTime,
        ...buildTimeSelector(recordTime),
      }, () => {
        this.syncDiarrheaOptions()
      })
    },
  },
  data: {
    diaperType: 'wet',
    selectedColor: '',
    selectedConsistency: '',
    selectedDiarrhea: [],
    selectedUrineColor: '',
    selectedUrineAmount: '',
    selectedStoolAmount: '',
    urineColors: [
      { value: 'normal', label: '正常', hex: '#E8E8E8' },
      { value: 'yellow', label: '黄色', hex: '#F5DE8A' },
      { value: 'deepYellow', label: '深黄色', hex: '#E8B84A' },
      { value: 'red', label: '红色', hex: '#E8746A' },
    ],
    diarrheaTypes: [
      { value: '蛋花汤样', label: '蛋花汤样' },
      { value: '水样便', label: '水样便' },
      { value: '带黏液/血丝', label: '带黏液/血丝' },
    ],
    diarrheaOptions: [
      { value: '蛋花汤样', label: '蛋花汤样', selected: false },
      { value: '水样便', label: '水样便', selected: false },
      { value: '带黏液/血丝', label: '带黏液/血丝', selected: false },
    ],
    colors: [
      { value: 'yellow', label: '黄色', hex: '#E8C84A' },
      { value: 'brown', label: '棕色', hex: '#8B5E3C' },
      { value: 'green', label: '绿色', hex: '#6DA544' },
      { value: 'red', label: '红色', hex: '#E8746A' },
      { value: 'black', label: '黑色', hex: '#4A3020' },
      { value: 'gray', label: '灰白色', hex: '#D0D0D0' },
    ],
    consistencies: [
      { value: 'normal', label: '正常' },
      { value: 'loose', label: '偏稀' },
      { value: 'dry', label: '干硬' },
    ],
    urineAmounts: [
      { value: 'small', label: '量少' },
      { value: 'medium', label: '量中等' },
      { value: 'large', label: '量多' },
    ],
    stoolAmounts: [
      { value: 'small', label: '量少' },
      { value: 'medium', label: '量中等' },
      { value: 'large', label: '量多' },
    ],
    note: '',
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],

    photos: [],
    uploading: false,
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.properties.editData && this.properties.editData.time || formatDate(new Date(), 'YYYY-MM-DD HH:mm'))
      this.setData({
        recordTime,
        ...buildTimeSelector(recordTime),
      })
      this.syncDiarrheaOptions()
    },
  },

  methods: {
    selectType(e) {
      const type = e.currentTarget.dataset.type
      this.setData({ diaperType: type })
      if (type === 'wet' || type === 'dry') {
        this.setData({ selectedColor: '', selectedConsistency: '' })
      }
    },

    selectColor(e) {
      const color = e.currentTarget.dataset.color
      this.setData({ selectedColor: this.data.selectedColor === color ? '' : color })
    },

    selectUrineColor(e) {
      const color = e.currentTarget.dataset.color
      this.setData({ selectedUrineColor: this.data.selectedUrineColor === color ? '' : color })
    },

    selectUrineAmount(e) {
      const amount = e.currentTarget.dataset.amount
      this.setData({ selectedUrineAmount: this.data.selectedUrineAmount === amount ? '' : amount })
    },

    selectStoolAmount(e) {
      const amount = e.currentTarget.dataset.amount
      this.setData({ selectedStoolAmount: this.data.selectedStoolAmount === amount ? '' : amount })
    },

    selectConsistency(e) {
      const consistency = e.currentTarget.dataset.consistency
      this.setData({ selectedConsistency: this.data.selectedConsistency === consistency ? '' : consistency })
    },

    toggleDiarrhea(e) {
      const value = e.currentTarget.dataset.value
      let arr = [...this.data.selectedDiarrhea]
      const idx = arr.indexOf(value)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(value)
      this.setData({ selectedDiarrhea: arr }, () => {
        this.syncDiarrheaOptions()
      })
    },

    syncDiarrheaOptions() {
      const sel = this.data.selectedDiarrhea
      const options = this.data.diarrheaTypes.map(item => ({
        ...item,
        selected: sel.indexOf(item.value) > -1,
      }))
      this.setData({ diarrheaOptions: options })
    },

    addPhoto() {
      if (this.data.uploading) return
      const that = this
      this.triggerEvent('photochoose')
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success(res) {
          const filePath = res.tempFilePaths[0]
          that.setData({ uploading: true })
          uploadFile(filePath)
            .then(url => {
              that.setData({
                photos: [...that.data.photos, url],
                uploading: false,
              })
            })
            .catch(() => {
              wx.showToast({ title: '上传失败', icon: 'none' })
              that.setData({ uploading: false })
            })
        },
        complete() {
          that.triggerEvent('photochooseend')
        },
      })
    },

    removePhoto(e) {
      const idx = e.currentTarget.dataset.index
      const photos = [...this.data.photos]
      photos.splice(idx, 1)
      this.setData({ photos })
    },

    onNoteInput(e) {
      this.setData({ note: e.detail.value })
    },

    previewPhoto(e) {
      const url = e.currentTarget.dataset.url
      const urls = this.data.photos
      wx.previewImage({
        current: url,
        urls,
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
      const { diaperType, selectedColor, selectedConsistency, selectedDiarrhea, selectedUrineColor, selectedUrineAmount, selectedStoolAmount, photos, note, recordTime } = this.data
      const hasDiarrhea = selectedDiarrhea.length > 0
      this.triggerEvent('save', {
        type: diaperType,
        color: selectedColor || undefined,
        consistency: selectedConsistency || undefined,
        urineColor: selectedUrineColor || undefined,
        urineAmount: selectedUrineAmount || undefined,
        stoolAmount: selectedStoolAmount || undefined,
        diarrhea: hasDiarrhea ? selectedDiarrhea : undefined,
        abnormal: hasDiarrhea || undefined,
        photos: photos.length > 0 ? photos : undefined,
        note: note || undefined,
        time: recordTime,
      })
      this.triggerEvent('close')
    },
  },
})
