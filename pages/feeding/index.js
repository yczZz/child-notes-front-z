// pages/feeding/index.js
const recordService = require('../../services/record')
const { formatDate } = require('../../utils/util')

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const DELETE_ACTION_WIDTH_RPX = 144
const SWIPE_OPEN_RATIO = 0.38
const SWIPE_FAST_VELOCITY = 0.25
const SWIPE_MOVE_STEP_PX = 2

function clampSwipeOffset(offset, width) {
  return Math.max(-width, Math.min(0, offset))
}

function getSideAccSec(record, side) {
  const rawSec = record[`${side}DurationSec`]
  if (rawSec !== undefined && rawSec !== null && rawSec !== '') {
    const sec = Number(rawSec)
    if (!Number.isNaN(sec) && sec >= 0) return sec
  }
  return (record[`${side}Duration`] || 0) * 60
}

function parseRecordTime(time) {
  if (!time) return null
  const date = new Date(time.replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDuration(sec) {
  const total = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function buildBreastDurationDesc(record, leftSec, rightSec) {
  const parts = []
  if (leftSec > 0) parts.push(`左侧 ${formatDuration(leftSec)}`)
  if (rightSec > 0) parts.push(`右侧 ${formatDuration(rightSec)}`)
  if (parts.length > 0) {
    return `总时长 ${formatDuration(leftSec + rightSec)} · ${parts.join(' · ')}`
  }
  return record.duration ? `${record.duration}分钟` : ''
}

function getBreastTotalSec(record) {
  const activeSide = record.leftStartTime ? 'left' : (record.rightStartTime ? 'right' : '')
  const activeStart = activeSide ? parseRecordTime(activeSide === 'left' ? record.leftStartTime : record.rightStartTime) : null
  const activeElapsedSec = activeStart ? Math.floor((Date.now() - activeStart.getTime()) / 1000) : 0
  const sideTotalSec = getSideAccSec(record, 'left') + getSideAccSec(record, 'right') + Math.max(0, activeElapsedSec)
  if (sideTotalSec > 0) return sideTotalSec
  return record.duration ? (Number(record.duration) || 0) * 60 : 0
}

function formatSummaryDuration(sec) {
  const totalMin = Math.ceil(Math.max(0, sec || 0) / 60)
  if (totalMin <= 0) return ''
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours > 0 && minutes > 0) return `${hours}小时${minutes}分钟`
  if (hours > 0) return `${hours}小时`
  return `${minutes}分钟`
}

function getAuthToken() {
  const app = getApp()
  return app.globalData.token || wx.getStorageSync('token') || ''
}

function isLoggedIn() {
  return !!getAuthToken()
}

Page({
  data: {
    displayDate: '',
    displayWeekday: '',
    pickerValue: '',
    todayStr: '',
    isToday: true,

    dayStats: {},
    records: [],
    previewVisible: false,
    previewSrc: '',

    // 编辑抽屉
    showDrawer: false,
    drawerTitle: '',
    drawerType: '',
    editingRecord: null,
    _dailyData: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    if (!isLoggedIn()) {
      this.resetLoggedOutState()
      return
    }
    if (!this._initialized) {
      this._initialized = true
      this.setToday()
    } else {
      this.loadRecords(this.data.pickerValue || this.buildDateStr(new Date()))
    }
  },

  onHide() {
    this.clearOngoingFeedTicker()
    if (this._drawerPhotoChoosing) return
    this.closeRecordDrawer()
  },

  onUnload() {
    this.clearOngoingFeedTicker()
    this.closeRecordDrawer()
  },

  resetLoggedOutState() {
    this.clearOngoingFeedTicker()
    this.setData({
      records: [],
      dayStats: {},
      _dailyData: null,
      showDrawer: false,
      drawerTitle: '',
      drawerType: '',
      editingRecord: null,
      previewVisible: false,
      previewSrc: '',
    })
  },

  onDrawerPhotoChoose() {
    this._drawerPhotoChoosing = true
  },

  onDrawerPhotoChooseEnd() {
    this._drawerPhotoChoosing = false
  },

  setToday() {
    const now = new Date()
    const dateStr = this.buildDateStr(now)
    this.setData({ pickerValue: dateStr, todayStr: dateStr, isToday: true })
    this.updateDisplay(now)
    this.loadRecords(dateStr)
  },

  onPrevDay() {
    if (this.consumeOpenSwipeRow()) return
    const d = this.getCurrentDate()
    d.setDate(d.getDate() - 1)
    this.navigateToDate(d)
  },

  onNextDay() {
    if (this.consumeOpenSwipeRow()) return
    const d = this.getCurrentDate()
    const today = new Date(); today.setHours(0,0,0,0)
    if (d >= today) return
    d.setDate(d.getDate() + 1)
    this.navigateToDate(d)
  },

  onGoToday() {
    if (this.consumeOpenSwipeRow()) return
    this.setToday()
  },

  navigateToDate(d) {
    const dateStr = this.buildDateStr(d)
    const today = new Date()
    this.setData({
      pickerValue: dateStr,
      todayStr: this.buildDateStr(today),
      isToday: dateStr === this.buildDateStr(today),
    })
    this.updateDisplay(d)
    this.loadRecords(dateStr)
  },

  onDateChange(e) {
    const d = new Date(e.detail.value.replace(/-/g, '/'))
    this.navigateToDate(d)
  },

  // ==================== 数据加载 ====================
  async loadRecords(dateStr) {
    const authToken = getAuthToken()
    if (!authToken) {
      this.resetLoggedOutState()
      return
    }

    try {
      const babyService = require('../../services/baby')
      const baby = getApp().globalData.currentBaby || await babyService.getBabyInfo()
      if (getAuthToken() !== authToken) return
      if (!baby || !baby.id) {
        getApp().globalData.currentBaby = null
        this.setData({ records: [], dayStats: {}, _dailyData: null })
        this.clearOngoingFeedTicker()
        return
      }
      const app = getApp()
      if (typeof app.setCurrentBaby === 'function') {
        app.setCurrentBaby(baby)
      } else {
        app.globalData.currentBaby = baby
      }

      const data = await recordService.getRecordsByDate(dateStr)
      if (getAuthToken() !== authToken) return
      const records = this.buildRecordList(data)
      const dayStats = this.buildDayStats(data)
      this.setData({ records, dayStats, _dailyData: data })
      this.syncOngoingFeedTicker(data)
    } catch (e) {
      console.warn('loadRecords failed:', e)
      if (e && e.statusCode === 404) {
        getApp().globalData.currentBaby = null
      }
      this.setData({ records: [], dayStats: {}, _dailyData: null })
      this.clearOngoingFeedTicker()
    }
  },

  hasOngoingFeed(data) {
    return (data.feeds || []).some(r => r.type === 'breast' && !r.duration && (r.leftStartTime || r.rightStartTime))
  },

  syncOngoingFeedTicker(data) {
    if (!this.hasOngoingFeed(data)) {
      this.clearOngoingFeedTicker()
      return
    }
    if (this._ongoingFeedTicker) return
    this._ongoingFeedTicker = setInterval(() => {
      const dailyData = this.data._dailyData
      if (!dailyData || !this.hasOngoingFeed(dailyData)) {
        this.clearOngoingFeedTicker()
        return
      }
      this.setData({
        records: this.buildRecordList(dailyData),
        dayStats: this.buildDayStats(dailyData),
      })
    }, 1000)
  },

  clearOngoingFeedTicker() {
    if (this._ongoingFeedTicker) {
      clearInterval(this._ongoingFeedTicker)
      this._ongoingFeedTicker = null
    }
  },

  getDeleteActionWidthPx() {
    if (this._deleteActionWidthPx) return this._deleteActionWidthPx
    let windowWidth = 375
    try {
      if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
        const info = wx.getSystemInfoSync()
        windowWidth = info.windowWidth || windowWidth
      }
    } catch (e) {}
    this._deleteActionWidthPx = Math.round(DELETE_ACTION_WIDTH_RPX * windowWidth / 750)
    return this._deleteActionWidthPx
  },

  closeSwipeRows(exceptKey = '') {
    const updates = {}
    let changed = false
    ;(this.data.records || []).forEach((item, index) => {
      if (item.key !== exceptKey && (item.swipeOffset || item.swiping || item.swipeOpen)) {
        updates[`records[${index}].swipeOffset`] = 0
        updates[`records[${index}].swiping`] = false
        updates[`records[${index}].swipeOpen`] = false
        changed = true
      }
    })
    if (changed) this.setData(updates)
    return changed
  },

  hasOpenSwipeRow() {
    return (this.data.records || []).some(item => item.swipeOpen || (item.swipeOffset || 0) < 0)
  },

  consumeOpenSwipeRow() {
    if (!this.hasOpenSwipeRow()) return false
    this.closeSwipeRows()
    return true
  },

  onPageTap() {
    this.consumeOpenSwipeRow()
  },

  onRecordTouchStart(e) {
    const key = e.currentTarget.dataset.key
    const touch = e.touches && e.touches[0]
    if (!key || !touch) return
    const index = (this.data.records || []).findIndex(item => item.key === key)
    if (index < 0) return
    const closedOtherRow = this.closeSwipeRows(key)
    if (closedOtherRow) {
      this._swipeJustMoved = true
      clearTimeout(this._swipeJustMovedTimer)
      this._swipeJustMovedTimer = setTimeout(() => { this._swipeJustMoved = false }, 250)
    }
    const startOffset = Number(this.data.records[index].swipeOffset) || 0
    this._recordSwipe = {
      key,
      index,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset,
      lastOffset: startOffset,
      lastX: touch.clientX,
      lastMoveAt: Date.now(),
      velocityX: 0,
      horizontal: false,
      moved: false,
    }
    this.setData({ [`records[${index}].swiping`]: true })
  },

  onRecordTouchMove(e) {
    const swipe = this._recordSwipe
    const touch = e.touches && e.touches[0]
    if (!swipe || !touch) return
    const dx = touch.clientX - swipe.startX
    const dy = touch.clientY - swipe.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    if (!swipe.horizontal) {
      if (absX < 6 && absY < 6) return
      if (absY > absX) return
      swipe.horizontal = true
    }
    const width = this.getDeleteActionWidthPx()
    const now = Date.now()
    const elapsed = Math.max(1, now - swipe.lastMoveAt)
    swipe.velocityX = (touch.clientX - swipe.lastX) / elapsed
    swipe.lastX = touch.clientX
    swipe.lastMoveAt = now
    const offset = Math.round(clampSwipeOffset(swipe.startOffset + dx, width))
    if (Math.abs(offset - swipe.lastOffset) < SWIPE_MOVE_STEP_PX) return
    swipe.lastOffset = offset
    swipe.moved = true
    this.setData({
      [`records[${swipe.index}].swipeOffset`]: offset,
      [`records[${swipe.index}].swipeOpen`]: offset < -4,
    })
  },

  onRecordTouchEnd() {
    const swipe = this._recordSwipe
    if (!swipe) return
    const width = this.getDeleteActionWidthPx()
    const item = this.data.records[swipe.index]
    if (!item) {
      this._recordSwipe = null
      return
    }
    const current = Number(swipe.lastOffset) || Number(item.swipeOffset) || 0
    const fastLeft = swipe.velocityX < -SWIPE_FAST_VELOCITY
    const fastRight = swipe.velocityX > SWIPE_FAST_VELOCITY
    const shouldOpen = fastRight ? false : (fastLeft || current <= -width * SWIPE_OPEN_RATIO)
    const finalOffset = shouldOpen ? -width : 0
    this.setData({
      [`records[${swipe.index}].swipeOffset`]: finalOffset,
      [`records[${swipe.index}].swiping`]: false,
      [`records[${swipe.index}].swipeOpen`]: finalOffset < 0,
    })
    if (swipe.moved) {
      this._swipeJustMoved = true
      clearTimeout(this._swipeJustMovedTimer)
      this._swipeJustMovedTimer = setTimeout(() => { this._swipeJustMoved = false }, 250)
    }
    this._recordSwipe = null
  },

  onRecordTouchCancel() {
    this.onRecordTouchEnd()
  },

  buildRecordList(data) {
    const list = []
    const swipeStateMap = new Map((this.data.records || []).map(item => [item.key, {
      swipeOffset: item.swipeOffset || 0,
      swiping: !!item.swiping,
      swipeOpen: !!item.swipeOpen,
    }]))
    const addItem = (prefix, r, item) => {
      item.key = `${prefix}-${r.id}`
      item._recordType = prefix
      item._recordId = r.id
      item._sort = item._sort || ''
      const swipeState = swipeStateMap.get(item.key)
      item.swipeOffset = swipeState ? swipeState.swipeOffset : 0
      item.swiping = swipeState ? swipeState.swiping : false
      item.swipeOpen = swipeState ? swipeState.swipeOpen : false
      if (r.note && !item.note) item.note = r.note
      list.push(item)
    }

    // 喂奶
    ;(data.feeds || []).forEach(r => {
      const timeStr = r.time ? r.time.split(' ')[1]?.slice(0,5) : ''
      if (r.type === 'breast') {
        const leftAccSec = getSideAccSec(r, 'left')
        const rightAccSec = getSideAccSec(r, 'right')
        const activeSide = r.leftStartTime ? 'left' : (r.rightStartTime ? 'right' : '')
        const activeStart = parseRecordTime(activeSide === 'left' ? r.leftStartTime : r.rightStartTime)
        const activeElapsedSec = activeStart ? Math.floor((Date.now() - activeStart.getTime()) / 1000) : 0
        const totalSec = leftAccSec + rightAccSec + Math.max(0, activeElapsedSec)
        const activeSideLabel = activeSide === 'left' ? '左侧' : (activeSide === 'right' ? '右侧' : '')
        const isUnfinished = !r.duration && (totalSec > 0 || !!activeSide)
        const isOngoing = isUnfinished && !!activeSide
        const title = isOngoing ? `母乳亲喂 · ${activeSideLabel}亲喂中` : (isUnfinished ? '母乳亲喂 · 已暂停' : '母乳亲喂')
        const desc = isUnfinished ? `总时长 ${formatDuration(totalSec)}` : buildBreastDurationDesc(r, leftAccSec, rightAccSec)
        addItem('feed', r, {
          timeStr, icon:'🤱', title, desc,
          extra: isOngoing ? '亲喂中' : (isUnfinished ? '未结束' : ''),
          cssClass: isOngoing ? 'feed feeding-ongoing' : (isUnfinished ? 'feed feeding-paused' : 'feed'),
          isFeedingOngoing: isOngoing,
          _sort:r.time,
        })
      } else if (r.type === 'expressed') {
        addItem('feed', r, { timeStr, icon:'🍶', title:'母乳瓶喂', desc:`${r.amount}ml`, extra:'', cssClass:'feed', _sort:r.time })
      } else {
        addItem('feed', r, { timeStr, icon:'🍼', title:'配方奶', desc:`${r.amount}ml`, extra:'', cssClass:'feed', _sort:r.time })
      }
    })

    // 尿布
    const diaperLabel = { wet:'嘘嘘', dirty:'便便', both:'都有', dry:'干爽' }
    const urineLabel = { normal:'正常', yellow:'黄色', deepYellow:'深黄色', red:'红色' }
    const poopLabel = { yellow:'黄色', brown:'棕色', green:'绿色', red:'红色', black:'黑色', gray:'灰白色' }
    const consistencyLabel = { normal:'正常', loose:'偏稀', dry:'干硬' }
    const amountLabel = { small:'量少', medium:'量中等', large:'量多' }
    ;(data.diapers || []).forEach(r => {
      const timeStr = r.time ? r.time.split(' ')[1]?.slice(0,5) : ''
      let desc = diaperLabel[r.type] || r.type
      if (r.urineColor) desc += ` · 嘘嘘${urineLabel[r.urineColor]||r.urineColor}`
      if (r.urineAmount) desc += ` · 尿量${amountLabel[r.urineAmount]||r.urineAmount}`
      if (r.color) desc += ` · 便便${poopLabel[r.color]||r.color}`
      if (r.stoolAmount) desc += ` · 便量${amountLabel[r.stoolAmount]||r.stoolAmount}`
      if (r.consistency) desc += ` · ${consistencyLabel[r.consistency] || r.consistency}`
      if (r.diarrhea && r.diarrhea.length) desc += ` · ${r.diarrhea.join('、')}`
      addItem('diaper', r, { timeStr, icon:r.abnormal?'🚨':'💩', title:r.abnormal?'换尿布 ⚠异常':'换尿布', desc, extra:r.resolved?'已恢复':(r.abnormal?'异常':''), cssClass:r.abnormal?'diaper abnormal':'diaper', photos:r.photos||[], isResolved:!!r.resolved, _sort:r.time })
    })

    // 睡眠
    ;(data.sleeps || []).forEach(r => {
      const displayStartTime = r.displayStartTime || r.startTime
      const displayEndTime = r.displayEndTime || r.endTime
      const timeStr = displayStartTime ? displayStartTime.split(' ')[1]?.slice(0,5) : ''
      const isSleeping = !r.endTime
      let durStr = ''
      if (isSleeping && r.startTime) {
        const start = new Date(r.startTime.replace(/-/g, '/'))
        const elapsedMin = Math.floor((Date.now() - start.getTime()) / 60000)
        durStr = elapsedMin >= 60 ? `${Math.floor(elapsedMin/60)}小时${elapsedMin%60}分钟` : `${elapsedMin}分钟`
      } else {
        durStr = r.duration ? (r.duration >= 60 ? `${Math.floor(r.duration / 60)}小时${r.duration % 60}分钟` : `${r.duration}分钟`) : ''
      }
      let endStr = displayEndTime ? displayEndTime.split(' ')[1]?.slice(0,5) : ''
      addItem('sleep', r, { timeStr, icon:'😴', title:isSleeping?'正在睡觉...':'睡眠', desc:isSleeping?`${timeStr} 开始`:(endStr?`${timeStr} → ${endStr}`:''), extra:durStr, cssClass:isSleeping?'sleep sleeping':'sleep', _sort:r.startTime||r.time, sleepId:r.id, isSleeping })
    })

    // 体温
    ;(data.temperatures || []).forEach(r => {
      const timeStr = r.time ? r.time.split(' ')[1]?.slice(0,5) : ''
      const abnormal = r.temperature >= 37.3
      addItem('temperature', r, { timeStr, icon:'🌡️', title:`${r.temperature}℃ ${abnormal?'⚠️发热':'体温正常'}`, desc:r.isAbnormal?'已标记异常':'', extra:r.resolved?'已恢复':'', cssClass:abnormal?'abnormal':'temp', isResolved:!!r.resolved, _sort:r.time })
    })

    // 补给用药
    ;(data.supplements || []).forEach(r => {
      const isMedicine = r.type === 'medicine'
      addItem('supplement', r, {
        timeStr: r.time?r.time.split(' ')[1]?.slice(0,5):'',
        icon: isMedicine ? '💊' : '💚',
        title: r.name || (isMedicine ? '用药记录' : '补充剂记录'),
        desc: r.dose||'',
        extra: isMedicine ? '用药' : '补充剂',
        cssClass:'supplement',
        _sort:r.time,
      })
    })

    // 成长
    ;(data.growths || []).forEach(r => {
      const parts = []; if(r.height) parts.push(`${r.height}cm`); if(r.weight) parts.push(`${r.weight}kg`)
      addItem('growth', r, { timeStr: r.time?r.time.split(' ')[1]?.slice(0,5):'', icon:'📏', title:'成长记录', desc:parts.join(' · ')||'', extra:'', cssClass:'growth', _sort:r.time })
    })

    // 辅食
    ;(data.complementaries || []).forEach(r => {
      const parts = []
      if(r.foodTypes && r.foodTypes.length) parts.push(r.foodTypes.join('、'))
      if(r.texture) parts.push(r.texture)
      if(r.amount) parts.push(`${r.amount}${r.amountUnit||''}`)
      if(r.reaction) parts.push(r.reaction)
      const isBad = r.reaction==='过敏'||r.reaction==='拉肚子'||r.reaction==='呕吐'
      const complementaryName = r.foodName || (r.foodTypes && r.foodTypes.length ? r.foodTypes.join('、') : '')
      addItem('complementary', r, { timeStr: r.time?r.time.split(' ')[1]?.slice(0,5):'', icon:'🥣', title: complementaryName ? `辅食：${complementaryName}` : '辅食记录', desc:parts.join(' · ')||'', extra:isBad?r.reaction:'', cssClass:isBad?'abnormal':'comp', photos:r.photos||[], _sort:r.time })
    })

    // 吸奶
    const mealLabel = { breakfast:'早餐', lunch:'午餐', dinner:'晚餐', snack:'加餐' }
    const suspicionLabel = { none:'', watch:'观察中', suspect:'疑似相关', avoid:'已忌口' }
    ;(data.maternalFoods || []).forEach(r => {
      const foods = r.foods && r.foods.length ? r.foods.join('、') : ''
      const meal = mealLabel[r.mealType] || '饮食'
      const suspicion = suspicionLabel[r.suspicionLevel] || ''
      addItem('maternal_food', r, {
        timeStr: r.time?r.time.split(' ')[1]?.slice(0,5):'',
        icon:'🍽️',
        title:`妈妈饮食 · ${meal}`,
        desc: foods,
        extra: suspicion,
        cssClass: r.suspicionLevel === 'suspect' || r.suspicionLevel === 'avoid' ? 'maternal-food suspect' : 'maternal-food',
        photos:r.photos||[],
        _sort:r.time,
      })
    })

    ;(data.pumps || []).forEach(r => {
      const parts = []
      if(r.leftDuration) parts.push(`左${r.leftDuration}min`)
      if(r.rightDuration) parts.push(`右${r.rightDuration}min`)
      if(r.totalAmount) parts.push(`${r.totalAmount}ml`)
      addItem('pump', r, { timeStr: r.time?r.time.split(' ')[1]?.slice(0,5):'', icon:'🍶', title:'吸奶记录', desc:parts.join(' · ')||'', extra:'', cssClass:'pump', _sort:r.time })
    })

    // 异常
    ;(data.abnormals || []).forEach(r => {
      const parts = []
      if(r.temperature) parts.push(`${r.temperature}℃`)
      if(r.respiratory && r.respiratory.length) parts.push(r.respiratory.join('、'))
      if(r.diarrhea && r.diarrhea.length) parts.push(r.diarrhea.join('、'))
      if(r.vomit) parts.push(r.vomit)
      if(r.other) parts.push(r.other)
      if(r.medicine) parts.push(`${r.medicine.name} ${r.medicine.dose}`)
      addItem('abnormal', r, { timeStr: r.time?r.time.split(' ')[1]?.slice(0,5):'', icon:'🚨', title:'异常记录', desc:parts.join(' · '), extra:r.resolved?'已恢复':'', cssClass:'abnormal', isResolved:!!r.resolved, _sort:r.time })
    })

    list.sort((a,b) => (b._sort||'').localeCompare(a._sort||''))
    return list
  },

  // ==================== 点击卡片 → 编辑 ====================
  onCardTap(e) {
    if (this._swipeJustMoved) return
    if (this.hasOpenSwipeRow()) {
      this.closeSwipeRows()
      return
    }
    const { recordType, recordId } = e.currentTarget.dataset
    const dailyData = this.data._dailyData
    if (!dailyData || !recordType || !recordId) return

    // 从 dailyData 中找到原始记录
    let record = null
    const map = { feed:'feeds', diaper:'diapers', sleep:'sleeps', temperature:'temperatures', supplement:'supplements', growth:'growths', complementary:'complementaries', maternal_food:'maternalFoods', pump:'pumps', abnormal:'abnormals' }
    const list = dailyData[map[recordType]]
    if (list) record = list.find(r => r.id == recordId)
    if (!record) return
    if (recordType === 'sleep') {
      record = {
        ...record,
        startTime: record.displayStartTime || record.startTime,
        endTime: record.displayEndTime || record.endTime,
      }
    }

    const titles = { feed:'🍼 喂奶', diaper:'💩 换尿布', sleep:'🌙 睡眠', temperature:'🌡️ 体温', supplement: record.type === 'medicine' ? '💊 用药' : '💚 补充剂', growth:'📏 成长', complementary:'🥣 辅食', maternal_food:'🍽️ 妈妈饮食观察', pump:'🍶 吸奶', abnormal:'🚨 异常' }

    this.setData({
      showDrawer: true,
      drawerType: recordType,
      drawerTitle: titles[recordType] || '编辑',
      editingRecord: record,
    })
  },

  onDeleteRecord(e) {
    const recordId = e.currentTarget.dataset.recordId
    if (!recordId) return
    const record = (this.data.records || []).find(item => String(item._recordId) === String(recordId))
    wx.showModal({
      title: '删除记录',
      content: `确定删除「${record && record.title ? record.title : '这条记录'}」吗？`,
      confirmText: '删除',
      confirmColor: '#fa5151',
      success: (res) => {
        if (!res.confirm) return
        this.deleteRecord(recordId)
      },
    })
  },

  async deleteRecord(recordId) {
    try {
      await recordService.deleteRecord(recordId)
      wx.showToast({ title: '已删除', icon: 'success' })
      this.closeSwipeRows()
      this.loadRecords(this.data.pickerValue || this.buildDateStr(new Date()))
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  onDrawerClose() {
    this.closeRecordDrawer()
  },

  closeRecordDrawer() {
    this._drawerPhotoChoosing = false
    this.setData({
      showDrawer: false,
      drawerTitle: '',
      drawerType: '',
      editingRecord: null,
    })
  },

  // ==================== 编辑保存 ====================
  async onEditSave(e) {
    const data = e.detail
    const record = this.data.editingRecord
    if (!record || !record.id) return
    try {
      await recordService.updateRecord(record.id, JSON.stringify(data))
      if (data.saveProgress) {
        this.setData({ editingRecord: { ...record, ...data, id: record.id } })
        this.loadRecords(this.data.pickerValue)
        return
      }
      wx.showToast({ title: '已更新', icon: 'success' })
      this.setData({ showDrawer: false, editingRecord: null })
      this.loadRecords(this.data.pickerValue)
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // ==================== 唤醒睡眠 ====================
  async onWakeUp(e) {
    if (this.consumeOpenSwipeRow()) return
    const sleepId = e.currentTarget.dataset.id
    try {
      await recordService.wakeUpSleep(sleepId)
      wx.showToast({ title: '宝宝醒了~', icon: 'success' })
      this.loadRecords(this.data.pickerValue)
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  buildDayStats(data) {
    const totalSleepMin = (data.sleeps||[]).reduce((s,r)=>s+(r.duration||0),0)
    const feeds = data.feeds || []
    const diapers = data.diapers || []
    const supplements = data.supplements || []
    const maternalFoods = data.maternalFoods || []
    const milkFeeds = feeds.filter(r => r.type !== 'breast')
    const totalMilk = milkFeeds
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    const breastFeeds = feeds.filter(r => r.type === 'breast')
    const breastTotalSec = breastFeeds.reduce((sum, r) => sum + getBreastTotalSec(r), 0)
    const medicineCount = supplements.filter(r => r.type === 'medicine').length
    const nutritionCount = supplements.length - medicineCount
    const supplementParts = []
    if (nutritionCount > 0) supplementParts.push(`补剂${nutritionCount}次`)
    if (medicineCount > 0) supplementParts.push(`用药${medicineCount}次`)
    return {
      feedCount: milkFeeds.length,
      totalMilk,
      breastCount: breastFeeds.length,
      breastDuration: breastFeeds.length > 0 ? (formatSummaryDuration(breastTotalSec) || '0分钟') : '',
      diaperCount: diapers.length,
      wetDiaperCount: diapers.filter(r => r.type === 'wet' || r.type === 'both').length,
      dirtyDiaperCount: diapers.filter(r => r.type === 'dirty' || r.type === 'both').length,
      supplementCount: supplements.length,
      supplementSummary: supplementParts.join(' · '),
      maternalFoodCount: maternalFoods.length,
      sleepTotal: totalSleepMin>0?`${Math.floor(totalSleepMin/60)}小时${totalSleepMin%60}分钟`:'',
    }
  },

  onPreviewPhoto(e) {
    if (this.consumeOpenSwipeRow()) return
    this.setData({ previewVisible: true, previewSrc: e.currentTarget.dataset.url })
  },
  onClosePreview() {
    this.setData({ previewVisible: false, previewSrc: '' })
  },

  getCurrentDate() {
    const pv = this.data.pickerValue
    return pv ? new Date(pv.replace(/-/g,'/')) : new Date()
  },
  buildDateStr(d) {
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  },
  updateDisplay(d) {
    this.setData({ displayDate:`${d.getMonth()+1}月${d.getDate()}日`, displayWeekday:WEEKDAYS[d.getDay()] })
  },
})
