// components/complementary-form/index.js
const { buildTimeSelector, formatDate, normalizeRecordTime } = require('../../utils/util')
const recordService = require('../../services/record')
const { uploadFile } = require('../../services/upload')

const DEFAULT_FOOD_TYPES = ['米粉', '土豆', '虾', '鸡蛋', '鸡肉', '鱼', '胡萝卜', '青菜']
const TEXTURE_OPTIONS = ['糊', '粥', '汤', '块', '饼', '泥', '碎末']
const AMOUNT_UNITS = ['克', '个', '勺', '碗']
const REACTION_OPTIONS = ['喜欢', '正常', '不喜欢', '过敏', '拉肚子', '呕吐']
const ABNORMAL_REACTIONS = ['过敏', '拉肚子', '呕吐']
const HISTORY_KEY = 'foodNameHistory'

function buildFoodOptions(names, selectedFoods) {
  return names.map(name => ({
    name,
    selected: selectedFoods.includes(name),
  }))
}

function buildFoodOptionData(selectedFoods, backendCustomFoods, localCustomFoods) {
  return {
    defaultFoodOptions: buildFoodOptions(DEFAULT_FOOD_TYPES, selectedFoods),
    backendCustomFoodOptions: buildFoodOptions(backendCustomFoods, selectedFoods),
    localCustomFoodOptions: buildFoodOptions(localCustomFoods, selectedFoods),
  }
}

Component({
  properties: {
    editData: { type: Object, value: null },
  },
  observers: {
    'editData'(val) {
      if (!val) return
      const customFoodTypes = val.customFoodTypes || []
      const allFoods = val.foodTypes || []
      const defaultFoods = allFoods.filter(f => DEFAULT_FOOD_TYPES.includes(f))
      const backendCustoms = allFoods.filter(f => !DEFAULT_FOOD_TYPES.includes(f) && customFoodTypes.includes(f))
      const localCustoms = allFoods.filter(f => !DEFAULT_FOOD_TYPES.includes(f) && !customFoodTypes.includes(f))
      const recordTime = normalizeRecordTime(val.time || this.data.recordTime)
      const selectedFoods = [...defaultFoods, ...backendCustoms, ...localCustoms]
      const backendCustomFoods = [...this.data.backendCustomFoods, ...backendCustoms].filter((v, i, a) => a.indexOf(v) === i)
      this.setData({
        selectedFoods,
        backendCustomFoods,
        localCustomFoods: localCustoms,
        ...buildFoodOptionData(selectedFoods, backendCustomFoods, localCustoms),
        texture: val.texture || '',
        foodName: val.foodName || '',
        amount: val.amount || '',
        amountUnit: val.amountUnit || '克',
        note: val.note || '',
        photos: val.photos || [],
        reaction: val.reaction || '',
        recordTime,
        ...buildTimeSelector(recordTime),
      })
    },
  },
  data: {
    defaultFoodTypes: DEFAULT_FOOD_TYPES,
    defaultFoodOptions: buildFoodOptions(DEFAULT_FOOD_TYPES, []),
    selectedFoods: [],
    backendCustomFoods: [],
    backendCustomFoodOptions: [],
    localCustomFoods: [],
    localCustomFoodOptions: [],
    showCustomInput: false,
    customFoodValue: '',

    texture: '',
    textureOptions: TEXTURE_OPTIONS,

    foodName: '',
    foodNameHistory: [],

    amount: '',
    amountUnit: '克',
    amountUnits: AMOUNT_UNITS,

    note: '',
    photos: [],
    uploading: false,

    reaction: '',
    reactionOptions: REACTION_OPTIONS,

    recordTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    timeRange: [],
    timeIndex: [],
  },

  lifetimes: {
    attached() {
      const recordTime = normalizeRecordTime(this.properties.editData && this.properties.editData.time || formatDate(new Date(), 'YYYY-MM-DD HH:mm'))
      this.setData({ recordTime, ...buildTimeSelector(recordTime) })
      this.loadFoodHistory()
      this.loadCustomFoodTypes()
    },
  },

  methods: {
    // --- 食物种类 ---
    toggleFood(e) {
      const value = e.currentTarget.dataset.value
      let arr = [...this.data.selectedFoods]
      const idx = arr.indexOf(value)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(value)
      this.setData({
        selectedFoods: arr,
        ...buildFoodOptionData(arr, this.data.backendCustomFoods, this.data.localCustomFoods),
      })
    },

    toggleBackendCustom(e) {
      const value = e.currentTarget.dataset.value
      let arr = [...this.data.selectedFoods]
      const idx = arr.indexOf(value)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(value)
      this.setData({
        selectedFoods: arr,
        ...buildFoodOptionData(arr, this.data.backendCustomFoods, this.data.localCustomFoods),
      })
    },

    toggleLocalCustom(e) {
      const value = e.currentTarget.dataset.value
      let arr = [...this.data.selectedFoods]
      const idx = arr.indexOf(value)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(value)
      this.setData({
        selectedFoods: arr,
        ...buildFoodOptionData(arr, this.data.backendCustomFoods, this.data.localCustomFoods),
      })
    },

    tapAddCustom() {
      this.setData({ showCustomInput: true })
    },

    removeLocalCustom(e) {
      const value = e.currentTarget.dataset.value
      const localCustomFoods = this.data.localCustomFoods.filter(v => v !== value)
      const selectedFoods = this.data.selectedFoods.filter(v => v !== value)
      this.setData({
        localCustomFoods,
        selectedFoods,
        ...buildFoodOptionData(selectedFoods, this.data.backendCustomFoods, localCustomFoods),
      })
    },

    deleteBackendCustom(e) {
      const value = e.currentTarget.dataset.value
      const selectedBackendFoods = value && this.data.backendCustomFoods.includes(value)
        ? [value]
        : this.data.selectedFoods.filter(item => this.data.backendCustomFoods.includes(item))
      const selectedLocalFoods = value && this.data.localCustomFoods.includes(value)
        ? [value]
        : this.data.selectedFoods.filter(item => this.data.localCustomFoods.includes(item))
      const selectedCustomFoods = [...selectedBackendFoods, ...selectedLocalFoods]
      if (selectedCustomFoods.length === 0) {
        wx.showToast({ title: '请选择自定义项', icon: 'none' })
        return
      }
      wx.showModal({
        title: '删除自定义项',
        content: selectedCustomFoods.length === 1
          ? `确定删除“${selectedCustomFoods[0]}”吗？`
          : `确定删除选中的${selectedCustomFoods.length}个自定义项吗？`,
        confirmText: '删除',
        confirmColor: '#fa5151',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await Promise.all(selectedBackendFoods.map(item => recordService.deleteCustomItem('complementary', item)))
            const backendCustomFoods = this.data.backendCustomFoods.filter(v => !selectedBackendFoods.includes(v))
            const localCustomFoods = this.data.localCustomFoods.filter(v => !selectedLocalFoods.includes(v))
            const selectedFoods = this.data.selectedFoods.filter(v => !selectedCustomFoods.includes(v))
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

    onCustomFoodInput(e) {
      this.setData({ customFoodValue: e.detail.value })
    },

    addCustomFood() {
      const v = this.data.customFoodValue.trim()
      if (!v) {
        wx.showToast({ title: '请输入种类名称', icon: 'none' })
        return
      }
      const allExisting = [...DEFAULT_FOOD_TYPES, ...this.data.backendCustomFoods, ...this.data.localCustomFoods]
      if (allExisting.includes(v)) {
        wx.showToast({ title: '该种类已存在', icon: 'none' })
        return
      }
      const localCustomFoods = [...this.data.localCustomFoods, v]
      const selectedFoods = [...this.data.selectedFoods, v]
      this.setData({
        localCustomFoods,
        selectedFoods,
        ...buildFoodOptionData(selectedFoods, this.data.backendCustomFoods, localCustomFoods),
        customFoodValue: '',
        showCustomInput: false,
      })
    },

    async loadCustomFoodTypes() {
      try {
        const items = await recordService.getCustomItems('complementary')
        if (Array.isArray(items) && items.length > 0) {
          this.setData({
            backendCustomFoods: items,
            ...buildFoodOptionData(this.data.selectedFoods, items, this.data.localCustomFoods),
          })
        }
      } catch (e) {
        console.warn('load custom complementary items failed:', e)
      }
    },

    // --- 性状 ---
    selectTexture(e) {
      const v = e.currentTarget.dataset.value
      this.setData({ texture: this.data.texture === v ? '' : v })
    },

    // --- 辅食名称 ---
    loadFoodHistory() {
      try {
        const history = wx.getStorageSync(HISTORY_KEY) || []
        this.setData({ foodNameHistory: history })
      } catch (e) {
        // ignore
      }
    },

    onFoodNameInput(e) { this.setData({ foodName: e.detail.value }) },

    selectFoodName(e) { this.setData({ foodName: e.currentTarget.dataset.name }) },

    // --- 食量 ---
    onAmountInput(e) { this.setData({ amount: e.detail.value }) },

    selectUnit(e) { this.setData({ amountUnit: e.currentTarget.dataset.unit }) },

    // --- 备注 & 照片 ---
    onNoteInput(e) { this.setData({ note: e.detail.value }) },

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
      const idx = e.currentTarget.dataset.index
      const photos = [...this.data.photos]
      photos.splice(idx, 1)
      this.setData({ photos })
    },

    // --- 宝宝反应 ---
    selectReaction(e) {
      const v = e.currentTarget.dataset.value
      this.setData({ reaction: this.data.reaction === v ? '' : v })
    },

    // --- 时间选择 ---
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

    // --- 保存 ---
    onSave() {
      const { selectedFoods, localCustomFoods, texture, foodName, amount, amountUnit, note, photos, reaction, recordTime, uploading } = this.data

      if (selectedFoods.length === 0 && !foodName) {
        wx.showToast({ title: '请至少选择食物种类或填写名称', icon: 'none' })
        return
      }
      if (uploading) {
        wx.showToast({ title: '图片上传中', icon: 'none' })
        return
      }

      if (foodName && foodName.trim()) {
        let history = this.data.foodNameHistory.filter(n => n !== foodName.trim())
        history.unshift(foodName.trim())
        if (history.length > 30) history = history.slice(0, 30)
        wx.setStorageSync(HISTORY_KEY, history)
      }

      const customFoodTypes = selectedFoods.filter(f => !DEFAULT_FOOD_TYPES.includes(f))

      const isAbnormal = ABNORMAL_REACTIONS.includes(reaction)

      this.triggerEvent('save', {
        foodTypes: selectedFoods.length > 0 ? selectedFoods : undefined,
        customFoodTypes: customFoodTypes.length > 0 ? customFoodTypes : undefined,
        texture: texture || undefined,
        foodName: foodName.trim() || undefined,
        amount: amount || undefined,
        amountUnit: amountUnit || undefined,
        note: note || undefined,
        photos: photos.length > 0 ? photos : undefined,
        reaction: reaction || undefined,
        abnormal: isAbnormal || undefined,
        time: recordTime,
      })
      this.triggerEvent('close')
    },
  },
})
