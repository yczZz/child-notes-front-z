// pages/index/index.js
const babyService = require('../../services/baby')
const recordService = require('../../services/record')
const app = getApp()

const DEFAULT_BABY = {
  name: '',
  age: '',
  avatar: '',
  avatarText: '👶',
}

const DEFAULT_STATS = {
  timeSinceLastFeed: '--',
  todaySleepTotal: '--',
  diaperCount: 0,
  wetDiaperCount: 0,
  dirtyDiaperCount: 0,
  latestHeight: null,
  latestWeight: null,
}

function getDefaultBaby() {
  return { ...DEFAULT_BABY }
}

function getDefaultStats() {
  return { ...DEFAULT_STATS }
}

function formatBabyForHome(baby) {
  if (!baby) return getDefaultBaby()
  return {
    ...baby,
    avatarText: baby.gender === 'girl' ? '👧' : '👦',
  }
}

function getAuthToken() {
  return app.globalData.token || wx.getStorageSync('token') || ''
}

function isLoggedIn() {
  return !!getAuthToken()
}

const DAILY_RECORD_SOURCES = [
  { key: 'feeds', type: 'feed', timeField: 'time' },
  { key: 'diapers', type: 'diaper', timeField: 'time' },
  { key: 'sleeps', type: 'sleep', timeField: 'startTime' },
  { key: 'temperatures', type: 'temperature', timeField: 'time' },
  { key: 'supplements', type: 'supplement', timeField: 'time' },
  { key: 'growths', type: 'growth', timeField: 'time' },
  { key: 'complementaries', type: 'complementary', timeField: 'time' },
  { key: 'maternalFoods', type: 'maternal_food', timeField: 'time' },
  { key: 'pumps', type: 'pump', timeField: 'time' },
  { key: 'abnormals', type: 'abnormal', timeField: 'time' },
]

function parseRecordTime(time) {
  if (!time) return null
  const date = new Date(String(time).replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

function getRecordSortValue(record, timeField) {
  const rawTime = record && (record[timeField] || record.time || record.startTime)
  const parsed = parseRecordTime(rawTime)
  return parsed ? parsed.getTime() : 0
}

function findLatestDailyRecord(records) {
  let latest = null
  DAILY_RECORD_SOURCES.forEach(source => {
    ;(records[source.key] || []).forEach(record => {
      const sortValue = getRecordSortValue(record, source.timeField)
      if (!latest || sortValue > latest.sortValue) {
        latest = { type: source.type, record, sortValue }
      }
    })
  })
  return latest
}

function findLatestVaccineRecord(records) {
  let latest = null
  ;(records || []).forEach((record, index) => {
    if (record.status === 'skipped' || record.skipped === true) return
    const sortValue = getRecordSortValue(record, 'time')
    if (!latest || sortValue > latest.sortValue || (sortValue === latest.sortValue && index > latest.index)) {
      latest = { record, sortValue, index }
    }
  })
  return latest ? latest.record : null
}

function buildCustomVaccineDue(item) {
  const due = item && item.due
  if (due && (due.days !== undefined || due.weeks !== undefined || due.months !== undefined)) {
    return {
      ...(due.days !== undefined ? { days: Number(due.days) } : {}),
      ...(due.weeks !== undefined ? { weeks: Number(due.weeks) } : {}),
      ...(due.months !== undefined ? { months: Number(due.months) } : {}),
    }
  }
  const normalized = {}
  if (item && item.dueDays !== undefined && item.dueDays !== null) normalized.days = Number(item.dueDays)
  if (item && item.dueWeeks !== undefined && item.dueWeeks !== null) normalized.weeks = Number(item.dueWeeks)
  if (item && item.dueMonths !== undefined && item.dueMonths !== null) normalized.months = Number(item.dueMonths)
  return Object.keys(normalized).length ? normalized : null
}

function normalizeCustomVaccineItem(item) {
  if (!item || !item.id || !item.name) return null
  const rawId = String(item.id)
  const backendId = item.backendId || item.id
  const due = buildCustomVaccineDue(item)
  if (!due) return null
  return {
    ...item,
    id: rawId.startsWith('custom_') ? rawId : `custom_${rawId}`,
    backendId,
    name: String(item.name).trim(),
    category: item.category === 'free' ? 'free' : 'paid',
    disease: item.disease || '自定义疫苗',
    doseLabel: item.doseLabel || '1剂',
    ageLabel: item.ageLabel || '按门诊安排',
    due,
    custom: true,
  }
}

function normalizeCustomVaccines(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeCustomVaccineItem)
    .filter(Boolean)
}

function formatSleepStatusText(record) {
  const displayStartTime = record && (record.displayStartTime || record.startTime)
  const start = parseRecordTime(displayStartTime)
  if (!start) return '安静睡眠中'
  const minutes = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000))
  const startTimeText = String(displayStartTime || '')
  const timeText = startTimeText.split(' ')[1]?.slice(0, 5) || ''
  let durationText = '刚刚睡着'
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const restMinutes = minutes % 60
    durationText = `已睡${hours}小时${restMinutes ? `${restMinutes}分钟` : ''}`
  } else if (minutes > 0) {
    durationText = `已睡${minutes}分钟`
  }
  return `${timeText ? `从${timeText}开始 · ` : ''}${durationText}`
}

function buildSleepState(record) {
  const active = Boolean(record && record.startTime && !record.endTime)
  return {
    sleepActive: active,
    sleepStatusText: active ? formatSleepStatusText(record) : '',
  }
}

Page({
  data: {
    // 宝宝信息
    baby: getDefaultBaby(),

    // 今日统计
    stats: getDefaultStats(),

    // 发热相关
    hasFever: false,
    feverInfo: null,
    feverMedTime: '',
    dailyTips: [],
    growthStage: null,
    hasDiarrhea: false,
    diarrheaTypes: '',
    diarrheaTime: '',
    hasOtherAbnormal: false,
    otherAbnormalInfo: null,
    otherAbnormalSummary: '',
    otherAbnormalNote: '',
    otherAbnormalTime: '',
    lastVaccine: null,
    vaccineList: [],
    customVaccineList: [],
    lastActivity: null,
    activityList: [],
    sleepOngoing: null,
    feedOngoing: null,
    babyList: [],
    showBabySwitcher: false,

    // 抽屉
    showDrawer: false,
    drawerTitle: '',
    drawerType: '',
    supplementInitialType: '',

    // 睡眠计时
    sleepActive: false,
    sleepStatusText: '',

    // 状态
    isLogin: false,
    pageVersion: 0,
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    const preserveDrawer = this._preserveDrawerOnNextShow
    if (preserveDrawer) {
      this._preserveDrawerOnNextShow = false
      this._drawerPhotoChoosing = false
      this.clearDrawerPreserveTimer()
    }
    const nextPageVersion = this.data.pageVersion + 1
    const nextData = { pageVersion: nextPageVersion }
    if (!preserveDrawer) {
      nextData.showDrawer = false
      nextData.sleepOngoing = null
      nextData.feedOngoing = null
    }
    if (!isLoggedIn()) {
      this.resetLoggedOutState({ pageVersion: nextPageVersion })
      return
    }
    this.setData({ ...nextData, isLogin: true })
    this.loadData()
  },

  onHide() {
    this.clearHomeSleepTicker()
  },

  onUnload() {
    this.clearHomeSleepTicker()
    this.clearDrawerPreserveTimer()
  },

  resetLoggedOutState(extra = {}) {
    this._preserveDrawerOnNextShow = false
    this._drawerPhotoChoosing = false
    this.clearDrawerPreserveTimer()
    this.clearHomeSleepTicker()
    this.setData({
      baby: getDefaultBaby(),
      stats: getDefaultStats(),
      hasFever: false,
      feverInfo: null,
      feverMedTime: '',
      dailyTips: [],
      growthStage: null,
      hasDiarrhea: false,
      diarrheaTypes: '',
      diarrheaTime: '',
      hasOtherAbnormal: false,
      otherAbnormalInfo: null,
      otherAbnormalSummary: '',
      otherAbnormalNote: '',
      otherAbnormalTime: '',
      lastVaccine: null,
      vaccineList: [],
      customVaccineList: [],
      lastActivity: null,
      activityList: [],
      sleepOngoing: null,
      feedOngoing: null,
      babyList: [],
      showBabySwitcher: false,
      showDrawer: false,
      drawerTitle: '',
      drawerType: '',
      supplementInitialType: '',
      sleepActive: false,
      sleepStatusText: '',
      isLogin: false,
      ...extra,
    })
  },

  resetBabyRecordState(extra = {}) {
    this.clearHomeSleepTicker()
    this.setData({
      baby: getDefaultBaby(),
      stats: getDefaultStats(),
      hasFever: false,
      feverInfo: null,
      feverMedTime: '',
      dailyTips: [],
      growthStage: null,
      hasDiarrhea: false,
      diarrheaTypes: '',
      diarrheaTime: '',
      hasOtherAbnormal: false,
      otherAbnormalInfo: null,
      otherAbnormalSummary: '',
      otherAbnormalNote: '',
      otherAbnormalTime: '',
      lastVaccine: null,
      vaccineList: [],
      customVaccineList: [],
      lastActivity: null,
      activityList: [],
      sleepOngoing: null,
      feedOngoing: null,
      showDrawer: false,
      drawerTitle: '',
      drawerType: '',
      supplementInitialType: '',
      sleepActive: false,
      sleepStatusText: '',
      ...extra,
    })
  },

  // 检查是否登录，未登录弹窗引导
  requireLogin() {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再记录宝宝信息',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/mine/index' })
          }
        },
      })
      return false
    }
    return true
  },

  // 检查是否有宝宝，没有则引导添加
  requireBaby() {
    const baby = app.globalData.currentBaby
    if (!baby || !baby.id) {
      wx.showModal({
        title: '请先添加宝宝',
        content: '还没有添加宝宝信息，先去添加吧',
        confirmText: '去添加',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({ url: '/pages/baby-setup/index?from=record' })
          }
        },
      })
      return false
    }
    return true
  },

  // ==================== 数据加载 ====================
  async loadData() {
    const authToken = getAuthToken()
    if (!authToken) {
      this.resetLoggedOutState()
      return
    }

    try {
      const { currentBaby: baby, babyList } = await babyService.loadBabySession()
      if (getAuthToken() !== authToken) return
      if (!baby || !baby.id) {
        // 还没有宝宝，静默跳过，等用户点击记录按钮时 requireBaby() 会引导
        this.resetBabyRecordState({ isLogin: true, babyList })
        return
      }
      const stats = await recordService.getTodayStats()
      if (getAuthToken() !== authToken) return
      this.setData({
        baby: formatBabyForHome(baby),
        babyList,
        customVaccineList: [],
        stats,
        hasFever: stats.hasFever,
        feverInfo: stats.feverInfo,
        feverMedTime: stats.lastMedicineTime || '',
        dailyTips: stats.dailyTips || [],
        hasDiarrhea: stats.hasDiarrhea || false,
        diarrheaTypes: stats.diarrheaTypes || '',
        diarrheaTime: stats.diarrheaTime || '',
        hasOtherAbnormal: stats.hasOtherAbnormal || false,
        otherAbnormalInfo: stats.otherAbnormalInfo || null,
        otherAbnormalSummary: this.formatOtherAbnormalSummary(stats.otherAbnormalInfo),
        otherAbnormalNote: this.formatOtherAbnormalNote(stats.otherAbnormalInfo),
        otherAbnormalTime: stats.otherAbnormalInfo ? stats.otherAbnormalInfo.time || '' : '',
      })
      this.loadGrowthStage()
      // 加载疫苗和活动数据
      this.loadVaccines(authToken)
      this.loadCustomVaccines(authToken)
      this.loadActivities(authToken)
      this.refreshHomeSleepStatus(authToken)
    } catch (e) {
      console.warn('loadData failed:', e)
      if (e && e.statusCode === 404) {
        app.globalData.currentBaby = null
        this.resetBabyRecordState({ isLogin: true })
      } else if (!isLoggedIn()) {
        this.resetLoggedOutState()
      }
    }
  },

  async openBabySwitcher() {
    if (!this.requireLogin()) return
    try {
      const { currentBaby, babyList } = await babyService.loadBabySession()
      this.setData({
        baby: formatBabyForHome(currentBaby),
        babyList,
        showBabySwitcher: true,
      })
    } catch (e) {
      console.warn('load baby list failed:', e)
      wx.showToast({ title: '加载宝宝失败', icon: 'none' })
    }
  },

  closeBabySwitcher() {
    this.setData({ showBabySwitcher: false })
  },

  onSelectBaby(e) {
    const id = Number(e.currentTarget.dataset.id)
    const baby = this.data.babyList.find(item => Number(item.id) === id)
    if (!baby) return
    babyService.setCurrentBaby(baby)
    this.resetBabyRecordState({
      showBabySwitcher: false,
      baby: formatBabyForHome(baby),
      babyList: this.data.babyList,
      customVaccineList: [],
      isLogin: true,
      pageVersion: this.data.pageVersion + 1,
    })
    this.loadData()
  },

  onAddBabyFromSwitcher() {
    this.setData({ showBabySwitcher: false })
    app.globalData.pendingAddBaby = true
    wx.switchTab({ url: '/pages/mine/index' })
  },

  stopTap() {},

  stopTouchMove() {},

  async loadVaccines(authToken = getAuthToken()) {
    try {
      const vaccines = await recordService.getVaccines()
      if (getAuthToken() !== authToken) return
      const vaccineRecords = Array.isArray(vaccines) ? vaccines : []
      this.setData({
        lastVaccine: findLatestVaccineRecord(vaccineRecords),
        vaccineList: vaccineRecords,
      })
    } catch (e) {
      console.warn('loadVaccines failed:', e)
      if (!isLoggedIn()) {
        this.setData({ lastVaccine: null, vaccineList: [] })
      }
    }
  },

  async loadCustomVaccines(authToken = getAuthToken()) {
    try {
      const customVaccines = await recordService.getCustomVaccines()
      if (getAuthToken() !== authToken) return
      this.setData({
        customVaccineList: normalizeCustomVaccines(customVaccines),
      })
    } catch (e) {
      console.warn('loadCustomVaccines failed:', e)
      if (!isLoggedIn()) {
        this.setData({ customVaccineList: [] })
      }
    }
  },

  async loadActivities(authToken = getAuthToken()) {
    try {
      const activities = await recordService.getActivities()
      if (getAuthToken() !== authToken) return
      this.setData({
        lastActivity: activities.length > 0 ? activities[0] : null,
        activityList: activities,
      })
    } catch (e) {
      console.warn('loadActivities failed:', e)
      if (!isLoggedIn()) {
        this.setData({ lastActivity: null, activityList: [] })
      }
    }
  },

  async loadGrowthStage() {
    try {
      const stage = await babyService.getGrowthStage()
      this.setData({ growthStage: stage })
    } catch (e) {
      console.warn('loadGrowthStage failed:', e)
    }
  },

  async refreshHomeSleepStatus(authToken = getAuthToken()) {
    try {
      const latest = await recordService.getLatestSleep()
      if (getAuthToken() !== authToken) return
      const activeSleep = latest && latest.startTime && !latest.endTime
        ? latest
        : null
      this.setData(buildSleepState(activeSleep))
      this.syncHomeSleepTicker(activeSleep)
    } catch (e) {
      console.warn('refreshHomeSleepStatus failed:', e)
      if (getAuthToken() === authToken) {
        this.clearHomeSleepTicker()
        this.setData(buildSleepState(null))
      }
    }
  },

  syncHomeSleepTicker(record) {
    this.clearHomeSleepTicker()
    if (!record || !record.startTime || record.endTime) return
    this._homeSleepRecord = record
    this._homeSleepTicker = setInterval(() => {
      this.setData({ sleepStatusText: formatSleepStatusText(this._homeSleepRecord) })
    }, 60000)
  },

  clearHomeSleepTicker() {
    if (this._homeSleepTicker) {
      clearInterval(this._homeSleepTicker)
      this._homeSleepTicker = null
    }
    this._homeSleepRecord = null
  },

  onStatsTap() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    wx.navigateTo({ url: '/pages/statistics/index' })
  },

  onSignInEntry() {
    if (!this.requireLogin()) return
    wx.navigateTo({ url: '/pages/points/index' })
  },

  formatOtherAbnormalSummary(info) {
    if (!info) return ''
    if (info.other) return info.other
    if (info.respiratory && info.respiratory.length) return `呼吸道：${info.respiratory.join('、')}`
    if (info.vomit) return `呕吐：${info.vomit}`
    if (info.medicine) return `其他异常：${[info.medicine.name, info.medicine.dose].filter(Boolean).join(' ')}`
    return info.note || '有新的异常记录'
  },

  formatOtherAbnormalNote(info) {
    if (!info || !info.note) return ''
    return info.note === this.formatOtherAbnormalSummary(info) ? '' : info.note
  },

  // ==================== 金刚区点击 ====================
  onQuickRecord(e) {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    const { type } = e.detail
    const titles = {
      feed: '🍼 喂奶',
      diaper: '💩 换尿布',
      sleep: '🌙 睡眠',
      temperature: '🌡️ 体温',
      supplement: '💊 补给用药',
      pump: '🍶 吸奶记录',
      complementary: '🥣 辅食记录',
      maternal_food: '🍽️ 妈妈饮食观察',
      growth: '📏 成长记录',
    }

    if (type === 'sleep') {
      this.openSleepDrawer()
      return
    }

    if (type === 'feed') {
      this.openFeedDrawer()
      return
    }

    this.setData({
      showDrawer: true,
      drawerType: type,
      drawerTitle: titles[type] || '',
      supplementInitialType: '',
    })
  },

  async openFeedDrawer() {
    let ongoing = null
    try {
      const latest = await recordService.getLatestFeed()
      if (latest && latest.type === 'breast' && !latest.duration) {
        ongoing = latest
      }
    } catch (e) {
      console.warn('getLatestFeed failed:', e)
    }
    this.setData({
      showDrawer: true,
      drawerType: 'feed',
      drawerTitle: '🍼 喂奶',
      feedOngoing: ongoing,
    })
  },

  async openSleepDrawer() {
    // 查最新一条睡眠记录（不限今天），判断是否正在睡觉
    let ongoing = null
    try {
      const latest = await recordService.getLatestSleep()
      if (latest && latest.startTime && !latest.endTime) {
        ongoing = latest
      }
    } catch (e) {
      // 接口不存在/失败则降级
      console.warn('getLatestSleep failed:', e)
    }
    this.setData({
      showDrawer: true,
      drawerType: 'sleep',
      drawerTitle: '🌙 睡眠',
      sleepOngoing: ongoing,
    })
  },

  // ==================== 异常入口 ====================
  onAbnormalTap() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'abnormal',
      drawerTitle: '🚨 异常 / 生病记录',
    })
  },

  // 发烧追踪模块按钮
  onFeverRecordTemp() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'temperature',
      drawerTitle: '🌡️ 体温',
    })
  },

  onFeverRecordMed() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'supplement',
      drawerTitle: '💊 补给用药',
      supplementInitialType: 'medicine',
    })
  },

  async onFeverRecovered() {
    try {
      await recordService.markFeverResolved()
      wx.showToast({ title: '宝宝退烧啦~', icon: 'success' })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onDiarrheaRecordDiaper() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'diaper',
      drawerTitle: '💩 换尿布',
    })
  },

  onDiarrheaRecordAbnormal() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'abnormal',
      drawerTitle: '🚨 异常 / 生病记录',
    })
  },

  onDiarrheaRecordMaternalFood() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'maternal_food',
      drawerTitle: '🍽️ 妈妈饮食观察',
    })
  },

  async onDiarrheaRecovered() {
    try {
      await recordService.markDiarrheaResolved()
      wx.showToast({ title: '宝宝好转啦~', icon: 'success' })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onOtherAbnormalRecovered() {
    try {
      await recordService.markAbnormalResolved()
      wx.showToast({ title: '异常已恢复', icon: 'success' })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // ==================== 疫苗 ====================
  onVaccineRecord() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'vaccine',
      drawerTitle: '💉 疫苗记录',
    })
  },

  async onVaccineSave(e) {
    try {
      await recordService.addVaccineRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onVaccineQuickMark(e) {
    try {
      await recordService.addVaccineRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onVaccineSkip(e) {
    try {
      await recordService.addVaccineRecord(e.detail)
      wx.showToast({ title: '已跳过', icon: 'success' })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onVaccineCustomChange(e) {
    const customVaccineList = normalizeCustomVaccines(e.detail && e.detail.customVaccines)
    this.setData({ customVaccineList })
  },

  // ==================== 活动 ====================
  onActivityRecord() {
    if (!this.requireLogin()) return
    if (!this.requireBaby()) return
    this.setData({
      showDrawer: true,
      drawerType: 'activity',
      drawerTitle: '🎯 活动记录',
    })
  },

  async onActivitySave(e) {
    try {
      await recordService.addActivityRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // ==================== 抽屉关闭 ====================
  preserveDrawerOnNextShow(timeout = 120000) {
    this._preserveDrawerOnNextShow = true
    this.clearDrawerPreserveTimer()
    this._drawerPreserveTimer = setTimeout(() => {
      this._preserveDrawerOnNextShow = false
      this._drawerPreserveTimer = null
    }, timeout)
  },

  clearDrawerPreserveTimer() {
    if (this._drawerPreserveTimer) {
      clearTimeout(this._drawerPreserveTimer)
      this._drawerPreserveTimer = null
    }
  },

  onDrawerPhotoChoose() {
    this._drawerPhotoChoosing = true
    this.preserveDrawerOnNextShow()
  },

  onDrawerPhotoChooseEnd() {
    if (!this._drawerPhotoChoosing) return
    this._drawerPhotoChoosing = false
    this.preserveDrawerOnNextShow(3000)
  },

  onDrawerClose() {
    this._preserveDrawerOnNextShow = false
    this._drawerPhotoChoosing = false
    this.clearDrawerPreserveTimer()
    this.setData({ showDrawer: false, supplementInitialType: '' })
  },

  // ==================== 保存记录 ====================
  async onFeedSave(e) {
    const data = e.detail
    try {
      if (data.type === 'breast' && data.startOnly) {
        const record = await recordService.addFeedRecord({
          type: 'breast', side: data.side, time: data.time,
          leftStartTime: data.leftStartTime || undefined,
          rightStartTime: data.rightStartTime || undefined,
        })
        this.clearHomeSleepTicker()
        this.setData({ feedOngoing: record, ...buildSleepState(null) })
        return
      }
      if (data.saveProgress) {
        if (data.id) {
          await recordService.updateRecord(data.id, JSON.stringify(data))
        }
        return
      }
      if (data.id) {
        await recordService.updateRecord(data.id, JSON.stringify(data))
      } else {
        await recordService.addFeedRecord(data)
      }
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false, feedOngoing: null })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onDiaperSave(e) {
    try {
      await recordService.addDiaperRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onSleepSave(e) {
    const data = e.detail
    try {
      const sleepId = data.id || (this.data.sleepOngoing && this.data.sleepOngoing.id)
      if (sleepId) {
        const payload = { ...data }
        delete payload.id
        delete payload.saveProgress
        await recordService.updateRecord(sleepId, JSON.stringify(payload))

        const record = { ...(this.data.sleepOngoing || {}), ...payload, id: sleepId }
        if (record.startTime && !record.endTime) {
          this.setData({ sleepOngoing: record, showDrawer: true, ...buildSleepState(record) })
          this.syncHomeSleepTicker(record)
          return
        }

        wx.showToast({ title: '睡眠已记录', icon: 'success' })
        this.clearHomeSleepTicker()
        this.setData({ showDrawer: false, sleepOngoing: null, ...buildSleepState(null) })
        this.loadData()
        return
      }

      if (data.startTime && !data.endTime) {
        // 刚开始睡，创建一条只有入睡时间的记录，返回ID给计时器
        const record = await recordService.addSleepRecord(data)
        this.setData({ sleepOngoing: record, showDrawer: true, ...buildSleepState(record) })
        this.syncHomeSleepTicker(record)
        return
      }
      // 完整的睡眠记录（手动补记）
      await recordService.addSleepRecord(data)
      wx.showToast({ title: '睡眠已记录', icon: 'success' })
      this.clearHomeSleepTicker()
      this.setData({ showDrawer: false, sleepOngoing: null, ...buildSleepState(null) })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onSleepWake(e) {
    const sleepId = e.detail.id
    if (!sleepId) {
      wx.showToast({ title: '操作失败', icon: 'none' })
      return
    }
    try {
      await recordService.wakeUpSleep(sleepId)
      wx.showToast({ title: '宝宝醒了~', icon: 'success' })
      this.clearHomeSleepTicker()
      this.setData({ showDrawer: false, sleepOngoing: null, ...buildSleepState(null) })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onTemperatureSave(e) {
    try {
      const data = e.detail
      await recordService.addTemperatureRecord(data)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onSupplementSave(e) {
    try {
      await recordService.addSupplementRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onGrowthSave(e) {
    try {
      await recordService.addGrowthRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onPumpSave(e) {
    try {
      await recordService.addPumpRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onComplementarySave(e) {
    try {
      await recordService.addComplementaryRecord(e.detail)
      if (e.detail.abnormal) {
        const food = e.detail.foodName || (e.detail.foodTypes || []).join('、') || '辅食'
        const reaction = e.detail.reaction || '异常反应'
        await recordService.addAbnormalRecord({
          other: `辅食后反应异常：${food} — ${reaction}`,
          note: `${food} — ${reaction}`,
          time: e.detail.time,
        })
      }
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onMaternalFoodSave(e) {
    try {
      await recordService.addMaternalFoodRecord(e.detail)
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onAbnormalSave(e) {
    try {
      await recordService.addAbnormalRecord(e.detail)
      wx.showToast({ title: '异常已记录', icon: 'success' })
      this.setData({ showDrawer: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },
})
