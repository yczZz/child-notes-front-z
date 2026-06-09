// components/supplement-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const recordService = require('../../services/record')

const DEFAULT_SUPPLEMENTS = ['维生素D', '益生菌', 'DHA', '钙剂', '铁剂', '锌剂']
const DEFAULT_MEDICINES = ['泰诺林', '布洛芬', '美林', '蒙脱石散', '口服补液盐', '西替利嗪']
const DEFAULT_DOSE_UNITS = ['ml', '粒', '包']

function uniqueStrings(items) {
  const result = []
  ;(items || []).forEach(item => {
    const value = String(item || '').trim()
    if (value && !result.includes(value)) {
      result.push(value)
    }
  })
  return result
}

function isCustomDoseUnit(unit) {
  return !!unit && !DEFAULT_DOSE_UNITS.includes(unit)
}

function normalizeCustomDoseUnits(items) {
  return uniqueStrings(items).filter(item => isCustomDoseUnit(item))
}

function mergeDoseUnits(customUnits) {
  return [...DEFAULT_DOSE_UNITS, ...normalizeCustomDoseUnits(customUnits)]
}

function parseDose(rawDose, doseUnits = DEFAULT_DOSE_UNITS, explicitUnit = '') {
  const dose = rawDose || ''
  const explicit = String(explicitUnit || '').trim()
  if (explicit && !dose.endsWith(explicit)) {
    return {
      dose,
      doseUnit: explicit,
      customDoseUnit: isCustomDoseUnit(explicit),
    }
  }

  const units = uniqueStrings([explicit, ...doseUnits]).sort((a, b) => b.length - a.length)
  const unit = units.find(item => dose.endsWith(item))
  if (!unit) {
    return { dose, doseUnit: DEFAULT_DOSE_UNITS[0], customDoseUnit: false }
  }
  return {
    dose: dose.slice(0, -unit.length),
    doseUnit: unit,
    customDoseUnit: isCustomDoseUnit(unit),
  }
}

Component({
  properties: {
    editData: { type: Object, value: null },
    initialType: { type: String, value: '' },
  },
  observers: {
    'editData'(val) {
      if (!val) return
      const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
      const parsedDose = parseDose(val.dose, this.data.doseUnits, val.doseUnit)
      const customDoseUnits = parsedDose.customDoseUnit
        ? normalizeCustomDoseUnits([...this.data.customDoseUnits, parsedDose.doseUnit])
        : this.data.customDoseUnits
      this.setData({
        formType: val.type || 'supplement',
        name: val.name || '',
        customName: Boolean(val.customName),
        dose: parsedDose.dose,
        doseUnit: parsedDose.doseUnit,
        customDoseUnit: parsedDose.customDoseUnit,
        customDoseUnits,
        doseUnits: mergeDoseUnits(customDoseUnits),
        note: val.note || '',
        recordTime,
        ...buildTimeSelector(recordTime),
      }, () => {
        this.syncNameOptions()
      })
    },
  },
  data: {
    formType: 'supplement',  // supplement | medicine
    nameOptions: DEFAULT_SUPPLEMENTS,
    customNameOptions: [],
    customSupplements: [],
    customMedicines: [],
    showCustomInput: false,
    customNameValue: '',
    customName: false,
    name: '',
    dose: '',
    doseUnit: DEFAULT_DOSE_UNITS[0],
    defaultDoseUnits: DEFAULT_DOSE_UNITS,
    customDoseUnits: [],
    doseUnits: DEFAULT_DOSE_UNITS,
    customDoseUnit: false,
    showCustomUnitInput: false,
    customUnitValue: '',
    note: '',
    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.properties.editData && this.properties.editData.time || formatDate(new Date(), 'YYYY-MM-DD HH:mm'))
      const formType = this.properties.editData && this.properties.editData.type || this.properties.initialType || 'supplement'
      this.setData({
        formType,
        recordTime,
        ...buildTimeSelector(recordTime),
      }, () => {
        this.syncNameOptions()
      })
      this.loadCustomItems()
    },
  },

  methods: {
    switchType(e) {
      this.setData({
        formType: e.currentTarget.dataset.type,
        name: '',
        customName: false,
        showCustomInput: false,
        customNameValue: '',
      }, () => {
        this.syncNameOptions()
      })
    },

    syncNameOptions() {
      const isMedicine = this.data.formType === 'medicine'
      this.setData({
        nameOptions: isMedicine ? DEFAULT_MEDICINES : DEFAULT_SUPPLEMENTS,
        customNameOptions: isMedicine ? this.data.customMedicines : this.data.customSupplements,
      })
    },

    async loadCustomItems() {
      try {
        const data = await recordService.getSupplementCustomItems()
        let customDoseUnits = normalizeCustomDoseUnits(data && data.doseUnits ? data.doseUnits : [])
        let doseUnits = mergeDoseUnits(customDoseUnits)
        const nextData = {
          customSupplements: data && data.supplements ? data.supplements : [],
          customMedicines: data && data.medicines ? data.medicines : [],
        }
        if (this.properties.editData) {
          const parsedDose = parseDose(this.properties.editData.dose, doseUnits, this.properties.editData.doseUnit)
          if (parsedDose.customDoseUnit) {
            customDoseUnits = normalizeCustomDoseUnits([...customDoseUnits, parsedDose.doseUnit])
            doseUnits = mergeDoseUnits(customDoseUnits)
          }
          nextData.dose = parsedDose.dose
          nextData.doseUnit = parsedDose.doseUnit
          nextData.customDoseUnit = parsedDose.customDoseUnit
        }
        nextData.customDoseUnits = customDoseUnits
        nextData.doseUnits = doseUnits
        this.setData(nextData, () => {
          this.syncNameOptions()
        })
      } catch (e) {
        console.warn('load supplement custom items failed:', e)
      }
    },

    selectName(e) {
      const custom = e.currentTarget.dataset.custom
      this.setData({
        name: e.currentTarget.dataset.name,
        customName: custom === true || custom === 'true',
        showCustomInput: false,
        customNameValue: '',
      })
    },

    tapAddCustom() {
      this.setData({ showCustomInput: true })
    },

    onCustomNameInput(e) {
      this.setData({ customNameValue: e.detail.value })
    },

    addCustomName() {
      const value = this.data.customNameValue.trim()
      if (!value) {
        wx.showToast({ title: '请输入名称', icon: 'none' })
        return
      }
      if (this.data.nameOptions.includes(value) || this.data.customNameOptions.includes(value)) {
        wx.showToast({ title: '该名称已存在', icon: 'none' })
        return
      }

      if (this.data.formType === 'medicine') {
        const customMedicines = [...this.data.customMedicines, value]
        this.setData({
          customMedicines,
          customNameOptions: customMedicines,
          name: value,
          customName: true,
          customNameValue: '',
          showCustomInput: false,
        })
        return
      }

      const customSupplements = [...this.data.customSupplements, value]
      this.setData({
        customSupplements,
        customNameOptions: customSupplements,
        name: value,
        customName: true,
        customNameValue: '',
        showCustomInput: false,
      })
    },

    deleteCustomName(e) {
      const name = e.currentTarget.dataset.name || (this.data.customName ? this.data.name : '')
      const type = this.data.formType
      if (!name || !this.data.customNameOptions.includes(name)) {
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
            await recordService.deleteCustomItem(type, name)
            const key = type === 'medicine' ? 'customMedicines' : 'customSupplements'
            const nextItems = this.data[key].filter(item => item !== name)
            const nextData = {
              [key]: nextItems,
              customNameOptions: nextItems,
            }
            if (this.data.name === name && this.data.customName) {
              nextData.name = ''
              nextData.customName = false
            }
            this.setData(nextData)
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        },
      })
    },

    onNameInput(e) {
      this.setData({ name: e.detail.value, customName: false })
    },

    onDoseInput(e) {
      this.setData({ dose: e.detail.value })
    },

    selectDoseUnit(e) {
      const unit = e.currentTarget.dataset.unit
      const custom = e.currentTarget.dataset.custom
      this.setData({
        doseUnit: unit,
        customDoseUnit: custom === true || custom === 'true',
        showCustomUnitInput: false,
        customUnitValue: '',
      })
    },

    tapAddCustomUnit() {
      this.setData({ showCustomUnitInput: true })
    },

    onCustomUnitInput(e) {
      this.setData({ customUnitValue: e.detail.value })
    },

    addCustomDoseUnit() {
      const value = this.data.customUnitValue.trim()
      if (!value) {
        wx.showToast({ title: '请输入单位', icon: 'none' })
        return
      }
      if (this.data.doseUnits.includes(value)) {
        wx.showToast({ title: '该单位已存在', icon: 'none' })
        return
      }

      const customDoseUnits = [...this.data.customDoseUnits, value]
      this.setData({
        customDoseUnits,
        doseUnits: mergeDoseUnits(customDoseUnits),
        doseUnit: value,
        customDoseUnit: true,
        customUnitValue: '',
        showCustomUnitInput: false,
      })
    },

    deleteCustomDoseUnit() {
      const unit = this.data.customDoseUnit ? this.data.doseUnit : ''
      if (!unit || !this.data.customDoseUnits.includes(unit)) {
        wx.showToast({ title: '请选择自定义单位', icon: 'none' })
        return
      }
      wx.showModal({
        title: '删除自定义单位',
        content: `确定删除“${unit}”吗？`,
        confirmText: '删除',
        confirmColor: '#fa5151',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await recordService.deleteCustomItem('dose_unit', unit)
            const customDoseUnits = this.data.customDoseUnits.filter(item => item !== unit)
            this.setData({
              customDoseUnits,
              doseUnits: mergeDoseUnits(customDoseUnits),
              doseUnit: DEFAULT_DOSE_UNITS[0],
              customDoseUnit: false,
            })
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        },
      })
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
      const { formType, name, dose, doseUnit, note, recordTime, customName, customDoseUnit } = this.data
      const trimmedName = name.trim()
      const trimmedDose = dose.trim()
      const normalizedDoseUnit = doseUnit || DEFAULT_DOSE_UNITS[0]
      if (!trimmedName) {
        wx.showToast({ title: '请输入名称', icon: 'none' })
        return
      }
      this.triggerEvent('save', {
        type: formType,
        name: trimmedName,
        dose: trimmedDose ? `${trimmedDose}${normalizedDoseUnit}` : undefined,
        doseUnit: trimmedDose ? normalizedDoseUnit : undefined,
        note: note || undefined,
        time: recordTime,
        customName: customName || undefined,
        customDoseUnit: customDoseUnit || undefined,
      })
      this.triggerEvent('close')
    },
  },
})
