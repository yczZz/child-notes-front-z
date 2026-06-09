// components/activity-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const recordService = require('../../services/record')

const INDOOR_ACTIVITIES = ['排气操', '练抬头', '内耳前庭训练']
const OUTDOOR_ACTIVITIES = ['晒太阳', '婴儿车']

Component({
  properties: {
    editData: { type: Object, value: null },
  },
  observers: {
    'editData'(val) {
      if (!val) return
      const name = val.name || ''
      const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
      this.setData({
        category: val.category || 'indoor',
        selectedName: name,
        customSelected: Boolean(val.customName),
        duration: val.duration || '',
        note: val.note || '',
        recordTime,
        ...buildTimeSelector(recordTime),
      }, () => {
        this.syncPresets()
      })
    },
  },
  data: {
    category: 'indoor',
    presets: INDOOR_ACTIVITIES,
    customItems: [],
    selectedName: '',
    customSelected: false,
    showCustom: false,
    customInput: '',
    duration: '',
    note: '',
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.properties.editData && this.properties.editData.time || formatDate(new Date(), 'YYYY-MM-DD HH:mm'))
      this.setData({ recordTime, ...buildTimeSelector(recordTime) })
      this.loadCustomItems()
    },
  },

  methods: {
    switchCategory(e) {
      this.setData({
        category: e.currentTarget.dataset.cat,
        selectedName: '',
        customSelected: false,
        showCustom: false,
      }, () => {
        this.syncPresets()
      })
    },

    syncPresets() {
      this.setData({
        presets: this.data.category === 'indoor' ? INDOOR_ACTIVITIES : OUTDOOR_ACTIVITIES,
      })
    },

    async loadCustomItems() {
      try {
        const items = await recordService.getCustomItems('activity')
        this.setData({ customItems: Array.isArray(items) ? items : [] })
      } catch (e) {
        console.warn('load custom activity items failed:', e)
      }
    },

    selectName(e) {
      const custom = e.currentTarget.dataset.custom === true || e.currentTarget.dataset.custom === 'true'
      this.setData({
        selectedName: e.currentTarget.dataset.name,
        customSelected: custom,
        showCustom: false,
      })
    },

    onCustomTap() {
      this.setData({ showCustom: true, selectedName: '', customSelected: false })
    },

    onCustomInput(e) {
      this.setData({ customInput: e.detail.value })
    },

    addCustom() {
      const v = this.data.customInput.trim()
      if (!v) {
        wx.showToast({ title: '请输入活动名称', icon: 'none' })
        return
      }
      const allExisting = [...this.data.presets, ...this.data.customItems]
      if (allExisting.includes(v)) {
        wx.showToast({ title: '该名称已存在', icon: 'none' })
        return
      }
      const customItems = [...this.data.customItems, v]
      this.setData({
        customItems,
        selectedName: v,
        customSelected: true,
        customInput: '',
        showCustom: false,
      })
    },

    deleteCustom(e) {
      const name = e.currentTarget.dataset.name || (this.data.customSelected ? this.data.selectedName : '')
      if (!name || !this.data.customItems.includes(name)) {
        wx.showToast({ title: '请选择自定义项', icon: 'none' })
        return
      }
      wx.showModal({
        title: '删除自定义项',
        content: `确定删除“${name}”吗？`,
        confirmText: '删除',
        confirmColor: '#fa5151',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await recordService.deleteCustomItem('activity', name)
            const customItems = this.data.customItems.filter(item => item !== name)
            const nextData = { customItems }
            if (this.data.selectedName === name && this.data.customSelected) {
              nextData.selectedName = ''
              nextData.customSelected = false
            }
            this.setData(nextData)
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        },
      })
    },

    onDurationInput(e) { this.setData({ duration: e.detail.value }) },
    onNoteInput(e) { this.setData({ note: e.detail.value }) },

    buildTimeRange() {
      this.setData(buildTimeSelector(this.data.recordTime))
    },

    onTimeChange(e) {
      const [y, m, d, h, min] = e.detail.value
      const t = this.data.timeRange
      this.setData({
        recordTime: `${t[0][y]}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        timeIndex: e.detail.value,
      })
    },

    onSave() {
      const { category, selectedName, customSelected, duration, note, recordTime } = this.data
      const name = (selectedName || '').trim()
      if (!name) {
        wx.showToast({ title: '请选择或输入活动名称', icon: 'none' })
        return
      }
      if (!duration || parseInt(duration) <= 0) {
        wx.showToast({ title: '请输入活动时长', icon: 'none' })
        return
      }
      this.triggerEvent('save', {
        name,
        category,
        duration: parseInt(duration),
        note: note || undefined,
        time: recordTime,
        customName: customSelected || undefined,
      })
      this.triggerEvent('close')
    },
  },
})
