// components/vaccine-tracker/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const {
  buildDosePlans,
  buildTimelineGroups,
  createSkipPayload,
  createVaccinePayload,
  findNextDosePlans,
} = require('../../constants/vaccines')

Component({
  properties: {
    baby: {
      type: Object,
      value: null,
      observer() {
        this.refreshSchedule()
      },
    },
    lastVaccine: {
      type: Object,
      value: null,
    },
    vaccineList: {
      type: Array,
      value: [],
      observer(list) {
        this.setData({ reversedList: [...(list || [])].reverse() })
        this.refreshSchedule()
      },
    },
    customVaccines: {
      type: Array,
      value: [],
      observer() {
        this.refreshSchedule()
      },
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
    showDetail: false,
    reversedList: [],
    timelineGroups: [],
    dosePlans: [],
    nextSections: [],
    doneCount: 0,
    handledCount: 0,
    totalCount: 0,
    progressText: '0/0',
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.data.recordTime)
      this.setData({
        recordTime,
        ...buildTimeSelector(recordTime, this.getBirthDate()),
      })
      this.refreshSchedule()
    },
  },

  methods: {
    getBirthDate() {
      const baby = this.properties.baby || {}
      return baby.birthDate || ''
    },

    getRecords() {
      return Array.isArray(this.properties.vaccineList) ? this.properties.vaccineList : []
    },

    getCustomVaccines() {
      return Array.isArray(this.properties.customVaccines) ? this.properties.customVaccines : []
    },

    refreshSchedule() {
      const records = this.getRecords()
      const birthDate = this.getBirthDate()
      const customVaccines = this.getCustomVaccines()
      const dosePlans = buildDosePlans(records, birthDate, customVaccines)
      const doneCount = dosePlans.filter(item => item.done).length
      const handledCount = dosePlans.filter(item => item.handled).length
      const totalCount = dosePlans.length

      this.setData({
        timelineGroups: buildTimelineGroups(records, birthDate, customVaccines),
        dosePlans,
        nextSections: findNextDosePlans(records, birthDate, customVaccines),
        doneCount,
        handledCount,
        totalCount,
        progressText: `${handledCount}/${totalCount}`,
        ...buildTimeSelector(this.data.recordTime, birthDate),
      })
    },

    onToggleDetail() {
      this.setData({ showDetail: !this.data.showDetail })
    },

    onToggleExpanded() {
      this.setData({ expanded: !this.data.expanded })
    },

    onCloseDetail() {
      this.setData({ showDetail: false })
    },

    onRecord() {
      this.triggerEvent('record')
    },

    getPlanByKey(key) {
      return this.data.dosePlans.find(item => item.key === key) || null
    },

    getRecordTimeFromIndex(value) {
      const [y, m, d, h, min] = value
      const t = this.data.timeRange
      if (!t || !t[0] || !t[0][y]) {
        return normalizeRecordTime(this.data.recordTime)
      }
      return `${t[0][y]}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    },

    quickMarkPlan(plan, recordTime = '') {
      if (!plan) return
      if (plan.handled) {
        wx.showToast({ title: '这针已处理过了', icon: 'none' })
        return
      }
      const payload = createVaccinePayload(plan, this.getRecords(), this.getBirthDate(), recordTime, this.getCustomVaccines())
      if (!payload) return
      this.triggerEvent('quickmark', payload)
    },

    onQuickMark(e) {
      const key = e.currentTarget.dataset.key
      this.quickMarkPlan(this.getPlanByKey(key))
    },

    onQuickMarkTimeChange(e) {
      const key = e.currentTarget.dataset.key
      const plan = this.getPlanByKey(key)
      const recordTime = this.getRecordTimeFromIndex(e.detail.value)
      this.setData({
        recordTime,
        timeIndex: e.detail.value,
      })
      this.quickMarkPlan(plan, recordTime)
    },

    onSkip(e) {
      const key = e.currentTarget.dataset.key
      const plan = this.data.dosePlans.find(item => item.key === key)
      if (!plan) return
      if (plan.handled) {
        wx.showToast({ title: '这针已处理过了', icon: 'none' })
        return
      }
      wx.showModal({
        title: '跳过这针？',
        content: `将不再提醒「${plan.name}」，建议确认门诊安排后再跳过。`,
        confirmText: '跳过',
        confirmColor: '#d45a1f',
        success: (res) => {
          if (!res.confirm) return
          const payload = createSkipPayload(plan, this.getRecords(), this.getBirthDate(), '手动跳过', this.getCustomVaccines())
          if (payload) {
            this.triggerEvent('skip', payload)
          }
        },
      })
    },

    stopTap() {},
  },
})
