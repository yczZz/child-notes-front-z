// components/maternal-food-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const recordService = require('../../services/record')
const { uploadFile } = require('../../services/upload')

const DEFAULT_FOODS = ['牛奶/奶制品', '鸡蛋', '小麦', '大豆', '花生/坚果', '鱼虾海鲜', '辛辣', '咖啡/茶', '水果', '蔬菜', '肉类', '主食']
const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
]
const SUSPICION_OPTIONS = [
  { value: 'none', label: '普通记录' },
  { value: 'watch', label: '观察中' },
  { value: 'suspect', label: '疑似相关' },
  { value: 'avoid', label: '已忌口' },
]

function unique(arr) {
  return (arr || []).filter((item, index, source) => item && source.indexOf(item) === index)
}

function buildFoodOptions(names, selectedFoods) {
  return names.map(name => ({
    name,
    selected: selectedFoods.includes(name),
  }))
}

function buildFoodOptionData(selectedFoods, backendCustomFoods, localCustomFoods) {
  return {
    defaultFoodOptions: buildFoodOptions(DEFAULT_FOODS, selectedFoods),
    backendCustomFoodOptions: buildFoodOptions(backendCustomFoods, selectedFoods),
    localCustomFoodOptions: buildFoodOptions(localCustomFoods, selectedFoods),
  }
}

function defaultMealType() {
  const hour = new Date().getHours()
  if (hour < 10) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

Component({
  properties: {
    editData: { type: Object, value: null },
  },

  observers: {
    editData(val) {
      if (!val) return
      const selectedFoods = unique(val.foods || [])
      const customFoods = unique(val.customFoods || selectedFoods.filter(item => !DEFAULT_FOODS.includes(item)))
      const backendCustomFoods = unique([...this.data.backendCustomFoods, ...customFoods])
      const localCustomFoods = selectedFoods.filter(item => !DEFAULT_FOODS.includes(item) && !backendCustomFoods.includes(item))
      const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
      this.setData({
        selectedFoods,
        backendCustomFoods,
        localCustomFoods,
        ...buildFoodOptionData(selectedFoods, backendCustomFoods, localCustomFoods),
        mealType: val.mealType || this.data.mealType,
        suspicionLevel: val.suspicionLevel || 'none',
        note: val.note || '',
        photos: val.photos || [],
        recordTime,
        ...buildTimeSelector(recordTime),
      })
    },
  },

  data: {
    mealTypes: MEAL_TYPES,
    mealType: defaultMealType(),
    suspicionOptions: SUSPICION_OPTIONS,
    suspicionLevel: 'none',

    selectedFoods: [],
    backendCustomFoods: [],
    backendCustomFoodOptions: [],
    localCustomFoods: [],
    localCustomFoodOptions: [],
    defaultFoodOptions: buildFoodOptions(DEFAULT_FOODS, []),

    showCustomInput: false,
    customFoodValue: '',
    note: '',
    photos: [],
    uploading: false,

    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.properties.editData && this.properties.editData.time || formatDate(new Date(), 'YYYY-MM-DD HH:mm'))
      this.setData({ recordTime, ...buildTimeSelector(recordTime) })
      this.loadCustomFoods()
    },
  },

  methods: {
    toggleFood(e) {
      const value = e.currentTarget.dataset.value
      const selectedFoods = [...this.data.selectedFoods]
      const index = selectedFoods.indexOf(value)
      if (index >= 0) {
        selectedFoods.splice(index, 1)
      } else {
        selectedFoods.push(value)
      }
      this.setData({
        selectedFoods,
        ...buildFoodOptionData(selectedFoods, this.data.backendCustomFoods, this.data.localCustomFoods),
      })
    },

    selectMealType(e) {
      this.setData({ mealType: e.currentTarget.dataset.value })
    },

    selectSuspicion(e) {
      this.setData({ suspicionLevel: e.currentTarget.dataset.value })
    },

    tapAddCustom() {
      this.setData({ showCustomInput: true })
    },

    onCustomFoodInput(e) {
      this.setData({ customFoodValue: e.detail.value })
    },

    addCustomFood() {
      const value = (this.data.customFoodValue || '').trim()
      if (!value) {
        wx.showToast({ title: '请输入食物名称', icon: 'none' })
        return
      }
      const allFoods = [...DEFAULT_FOODS, ...this.data.backendCustomFoods, ...this.data.localCustomFoods]
      if (allFoods.includes(value)) {
        wx.showToast({ title: '该食物已存在', icon: 'none' })
        return
      }
      const localCustomFoods = [...this.data.localCustomFoods, value]
      const selectedFoods = [...this.data.selectedFoods, value]
      this.setData({
        localCustomFoods,
        selectedFoods,
        ...buildFoodOptionData(selectedFoods, this.data.backendCustomFoods, localCustomFoods),
        customFoodValue: '',
        showCustomInput: false,
      })
    },

    async loadCustomFoods() {
      try {
        const items = await recordService.getCustomItems('maternal_food')
        if (!Array.isArray(items)) return
        const backendCustomFoods = unique(items)
        this.setData({
          backendCustomFoods,
          ...buildFoodOptionData(this.data.selectedFoods, backendCustomFoods, this.data.localCustomFoods),
        })
      } catch (e) {
        console.warn('load maternal food custom items failed:', e)
      }
    },

    deleteCustomFood(e) {
      const value = e.currentTarget.dataset.value
      const selectedBackendFoods = value && this.data.backendCustomFoods.includes(value)
        ? [value]
        : this.data.selectedFoods.filter(item => this.data.backendCustomFoods.includes(item))
      const selectedLocalFoods = value && this.data.localCustomFoods.includes(value)
        ? [value]
        : this.data.selectedFoods.filter(item => this.data.localCustomFoods.includes(item))
      const selectedCustomFoods = [...selectedBackendFoods, ...selectedLocalFoods]
      if (selectedCustomFoods.length === 0) {
        wx.showToast({ title: '请选择自定义食物', icon: 'none' })
        return
      }
      wx.showModal({
        title: '删除自定义食物',
        content: selectedCustomFoods.length === 1
          ? `确定删除“${selectedCustomFoods[0]}”吗？`
          : `确定删除选中的 ${selectedCustomFoods.length} 个自定义食物吗？`,
        confirmText: '删除',
        confirmColor: '#fa5151',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await Promise.all(selectedBackendFoods.map(item => recordService.deleteCustomItem('maternal_food', item)))
            const backendCustomFoods = this.data.backendCustomFoods.filter(item => !selectedBackendFoods.includes(item))
            const localCustomFoods = this.data.localCustomFoods.filter(item => !selectedLocalFoods.includes(item))
            const selectedFoods = this.data.selectedFoods.filter(item => !selectedCustomFoods.includes(item))
            this.setData({
              backendCustomFoods,
              localCustomFoods,
              selectedFoods,
              ...buildFoodOptionData(selectedFoods, backendCustomFoods, localCustomFoods),
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

    onTimeChange(e) {
      const [y, m, d, h, min] = e.detail.value
      const timeRange = this.data.timeRange
      const recordTime = `${timeRange[0][y]}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      this.setData({ recordTime, timeIndex: e.detail.value })
    },

    onSave() {
      const { selectedFoods, mealType, suspicionLevel, note, photos, recordTime, uploading } = this.data
      if (selectedFoods.length === 0) {
        wx.showToast({ title: '请至少选择一种食物', icon: 'none' })
        return
      }
      if (uploading) {
        wx.showToast({ title: '图片上传中', icon: 'none' })
        return
      }
      const customFoods = selectedFoods.filter(item => !DEFAULT_FOODS.includes(item))
      this.triggerEvent('save', {
        mealType,
        foods: selectedFoods,
        customFoods: customFoods.length > 0 ? customFoods : undefined,
        suspicionLevel,
        note: (note || '').trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        time: recordTime,
      })
      this.triggerEvent('close')
    },
  },
})
