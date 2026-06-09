// components/vaccine-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const recordService = require('../../services/record')
const {
  buildDosePlans,
  buildTimelineGroups,
  createSkipPayload,
  createVaccinePayload,
} = require('../../constants/vaccines')

function toDueNumber(value) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function buildCustomVaccineDue(item) {
  const due = item && item.due
  if (due && (due.days !== undefined || due.weeks !== undefined || due.months !== undefined)) {
    const normalized = {}
    const days = toDueNumber(due.days)
    const weeks = toDueNumber(due.weeks)
    const months = toDueNumber(due.months)
    if (days !== null) normalized.days = days
    if (weeks !== null) normalized.weeks = weeks
    if (months !== null) normalized.months = months
    return Object.keys(normalized).length ? normalized : null
  }

  const normalized = {}
  const days = toDueNumber(item && item.dueDays)
  const weeks = toDueNumber(item && item.dueWeeks)
  const months = toDueNumber(item && item.dueMonths)
  if (days !== null) normalized.days = days
  if (weeks !== null) normalized.weeks = weeks
  if (months !== null) normalized.months = months
  return Object.keys(normalized).length ? normalized : null
}

function normalizeCustomVaccineItem(item) {
  if (!item || !item.id || !item.name) return null
  const rawId = String(item.id)
  const due = buildCustomVaccineDue(item)
  if (!due) return null
  return {
    ...item,
    id: rawId.startsWith('custom_') ? rawId : `custom_${rawId}`,
    backendId: item.backendId || item.id,
    name: String(item.name).trim(),
    category: item.category === 'free' ? 'free' : 'paid',
    disease: item.disease || '自定义疫苗',
    doseLabel: item.doseLabel || '1剂',
    ageLabel: item.ageLabel || '按门诊安排',
    due,
    custom: true,
  }
}

function normalizeCustomVaccineList(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeCustomVaccineItem)
    .filter(Boolean)
}

Component({
  properties: {
    baby: {
      type: Object,
      value: null,
      observer() {
        this.refreshCatalog()
      },
    },
    vaccineList: {
      type: Array,
      value: [],
      observer() {
        this.refreshCatalog()
      },
    },
    customVaccines: {
      type: Array,
      value: [],
      observer(list) {
        this.setData({ localCustomVaccines: normalizeCustomVaccineList(list) })
        this.refreshCatalog()
      },
    },
  },

  data: {
    timelineGroups: [],
    localCustomVaccines: [],
    selectedKey: '',
    selectedPlan: null,
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],
    showCustomVaccineForm: false,
    customVaccineName: '',
    customVaccineCategory: 'paid',
    customVaccineDisease: '',
    customVaccineAgeValue: '',
    customVaccineAgeUnit: 'months',
    customVaccineAgeUnits: ['日龄', '周龄', '月龄', '周岁'],
    customVaccineAgeUnitIndex: 2,
    customVaccineSaving: false,
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.data.recordTime)
      this.setData({
        localCustomVaccines: normalizeCustomVaccineList(this.properties.customVaccines),
        recordTime,
        ...buildTimeSelector(recordTime, this.getBirthDate()),
      })
      this.refreshCatalog()
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
      return normalizeCustomVaccineList(this.data.localCustomVaccines)
    },

    refreshCatalog() {
      const records = this.getRecords()
      const birthDate = this.getBirthDate()
      const customVaccines = this.getCustomVaccines()
      const plans = buildDosePlans(records, birthDate, customVaccines)
      const selectedPlan = this.data.selectedKey
        ? plans.find(item => item.key === this.data.selectedKey) || null
        : null

      this.setData({
        timelineGroups: buildTimelineGroups(records, birthDate, customVaccines),
        ...buildTimeSelector(this.data.recordTime, birthDate),
        selectedPlan,
      })
    },

    selectDose(e) {
      const key = e.currentTarget.dataset.key
      const plans = buildDosePlans(this.getRecords(), this.getBirthDate(), this.getCustomVaccines())
      const selectedPlan = plans.find(item => item.key === key)
      if (!selectedPlan) return

      this.setData({
        selectedKey: key,
        selectedPlan,
      })
    },

    getPlanByKey(key) {
      const plans = buildDosePlans(this.getRecords(), this.getBirthDate(), this.getCustomVaccines())
      return plans.find(item => item.key === key) || null
    },

    buildDonePayload(plan, selectedTime = this.data.recordTime) {
      const recordTime = normalizeRecordTime(selectedTime)
      const payload = createVaccinePayload(plan, this.getRecords(), this.getBirthDate(), recordTime, this.getCustomVaccines())
      if (!payload) return null
      return payload
    },

    submitPayload(payload) {
      if (!payload) return
      this.triggerEvent('save', payload)
      this.triggerEvent('close')
    },

    getRecordTimeFromIndex(value) {
      const [y, m, d, h, min] = value
      const t = this.data.timeRange
      return `${t[0][y]}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    },

    onMarkDoseTimeChange(e) {
      const plan = this.getPlanByKey(e.currentTarget.dataset.key)
      if (!plan) return
      if (plan.handled) {
        wx.showToast({ title: '这针已处理过了', icon: 'none' })
        return
      }
      const recordTime = this.getRecordTimeFromIndex(e.detail.value)
      this.setData({
        selectedKey: plan.key,
        selectedPlan: plan,
        recordTime,
        timeIndex: e.detail.value,
      })
      this.submitPayload(this.buildDonePayload(plan, recordTime))
    },

    onSkipDose(e) {
      const plan = this.getPlanByKey(e.currentTarget.dataset.key)
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
            this.submitPayload(payload)
          }
        },
      })
    },

    toggleCustomVaccineForm() {
      this.setData({ showCustomVaccineForm: !this.data.showCustomVaccineForm })
    },

    onCustomVaccineNameInput(e) {
      this.setData({ customVaccineName: e.detail.value })
    },

    onCustomVaccineDiseaseInput(e) {
      this.setData({ customVaccineDisease: e.detail.value })
    },

    onCustomVaccineAgeInput(e) {
      this.setData({ customVaccineAgeValue: e.detail.value })
    },

    switchCustomVaccineCategory(e) {
      this.setData({ customVaccineCategory: e.currentTarget.dataset.category })
    },

    onCustomVaccineAgeUnitChange(e) {
      const index = Number(e.detail.value)
      const units = ['days', 'weeks', 'months', 'years']
      this.setData({
        customVaccineAgeUnitIndex: index,
        customVaccineAgeUnit: units[index] || 'months',
      })
    },

    buildCustomDue(value, unit) {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return null
      const intValue = Math.floor(n)
      if (unit === 'days') return { days: intValue }
      if (unit === 'weeks') return { weeks: intValue }
      if (unit === 'years') return { months: intValue * 12 }
      return { months: intValue }
    },

    buildCustomAgeLabel(value, unit) {
      const n = Math.floor(Number(value))
      if (unit === 'days' && n === 0) return '出生时'
      if (unit === 'days') return `${n}日龄`
      if (unit === 'weeks') return `${n}周龄`
      if (unit === 'years') return `${n}周岁`
      return `${n}月龄`
    },

    async addCustomVaccine() {
      if (this.data.customVaccineSaving) return
      const name = String(this.data.customVaccineName || '').trim()
      const disease = String(this.data.customVaccineDisease || '').trim()
      const due = this.buildCustomDue(this.data.customVaccineAgeValue, this.data.customVaccineAgeUnit)
      if (!name) {
        wx.showToast({ title: '请输入疫苗名称', icon: 'none' })
        return
      }
      if (!due) {
        wx.showToast({ title: '请输入接种时间', icon: 'none' })
        return
      }
      const existing = this.getCustomVaccines()
      if (existing.some(item => item.name === name)) {
        wx.showToast({ title: '该疫苗已存在', icon: 'none' })
        return
      }

      const payload = {
        name,
        category: this.data.customVaccineCategory === 'free' ? 'free' : 'paid',
        disease: disease || '自定义疫苗',
        doseLabel: '1剂',
        ageLabel: this.buildCustomAgeLabel(this.data.customVaccineAgeValue, this.data.customVaccineAgeUnit),
        due,
      }
      this.setData({ customVaccineSaving: true })
      try {
        const saved = await recordService.addCustomVaccine(payload)
        const item = normalizeCustomVaccineItem(saved)
        if (!item) {
          wx.showToast({ title: '添加失败', icon: 'none' })
          return
        }
        const localCustomVaccines = [
          ...existing.filter(custom => custom.backendId !== item.backendId && custom.id !== item.id),
          item,
        ]
        this.setData({
          localCustomVaccines,
          showCustomVaccineForm: false,
          customVaccineName: '',
          customVaccineDisease: '',
          customVaccineAgeValue: '',
        }, () => {
          this.refreshCatalog()
          this.triggerEvent('customchange', { customVaccines: localCustomVaccines })
          wx.showToast({ title: '已加入时间线', icon: 'success' })
        })
      } catch (e) {
        console.warn('addCustomVaccine failed:', e)
      } finally {
        this.setData({ customVaccineSaving: false })
      }
    },
  },
})
