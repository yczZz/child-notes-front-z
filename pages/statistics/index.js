const recordService = require('../../services/record')
const { formatDate } = require('../../utils/util')

const TYPE_OPTIONS = [
  { key: 'feed', label: '喂养', unit: '次', color: '#07c160' },
  { key: 'milk', label: '奶量', unit: 'ml', color: '#10aeff' },
  { key: 'breast', label: '亲喂', unit: '时长', color: '#35c2a1' },
  { key: 'sleep', label: '睡眠', unit: '时长', color: '#5b8def' },
  { key: 'diaper', label: '尿布', unit: '次', color: '#f59f00' },
  { key: 'temperature', label: '体温', unit: '次', color: '#fa5151' },
  { key: 'supplement', label: '补给', unit: '次', color: '#8b5cf6' },
  { key: 'growth', label: '成长', unit: '次', color: '#00a0a0' },
  { key: 'pump', label: '吸奶', unit: 'ml', color: '#2f80ed' },
  { key: 'complementary', label: '辅食', unit: '次', color: '#e58a00' },
  { key: 'abnormal', label: '异常', unit: '次', color: '#d93025' },
  { key: 'activity', label: '活动', unit: '时长', color: '#0f9d58' },
  { key: 'vaccine', label: '疫苗', unit: '次', color: '#6a7cff' },
]

const RANGE_OPTIONS = [
  { key: 'day', label: '日' },
  { key: 'threeDays', label: '3天', days: 3 },
  { key: 'week', label: '一周', days: 7 },
  { key: 'month', label: '月' },
  { key: 'range', label: '时间范围' },
]

Page({
  data: {
    typeOptions: TYPE_OPTIONS,
    rangeOptions: RANGE_OPTIONS,
    selectedType: 'feed',
    selectedRange: 'day',
    selectedMonth: '',
    selectedYear: '',
    startDate: '',
    endDate: '',
    today: '',
    todayMonth: '',
    todayYear: '',
    loading: false,
    statsList: [],
    calendarVisible: false,
    calendarModeClass: 'calendar-day',
    calendarTitle: '',
    calendarSubtitle: '',
    calendarWeekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarCells: [],
    chartBars: [],
    chartModeClass: 'chart-day',
    chartScrollLeft: 0,
    yAxisLabels: ['', '0', ''],
    summaryItems: [],
    currentType: TYPE_OPTIONS[0],
    totalValueText: '0次',
    averageValueText: '0次',
    averageLabel: '日均',
    maxValueText: '0次',
  },

  onLoad() {
    const today = formatDate(new Date(), 'YYYY-MM-DD')
    const todayMonth = today.slice(0, 7)
    const todayYear = today.slice(0, 4)
    this.setData({ today, todayMonth, todayYear, selectedMonth: todayMonth, selectedYear: todayYear })
    this.applyRange('day')
  },

  selectType(e) {
    const selectedType = e.currentTarget.dataset.type
    const currentType = TYPE_OPTIONS.find(item => item.key === selectedType) || TYPE_OPTIONS[0]
    this.setData({ selectedType, currentType })
    this.rebuildView()
  },

  selectRange(e) {
    const key = e.currentTarget.dataset.range
    this.setData({ selectedRange: key })
    this.applyRange(key)
  },

  onDayMonthChange(e) {
    this.setData({ selectedRange: 'day', selectedMonth: e.detail.value })
    this.applyDayMonth(e.detail.value)
  },

  onMonthChange(e) {
    this.setData({ selectedRange: 'month', selectedYear: e.detail.value })
    this.applyYear(e.detail.value)
  },

  onStartDateChange(e) {
    this.setData({ selectedRange: 'range', startDate: e.detail.value })
    this.loadStats()
  },

  onEndDateChange(e) {
    this.setData({ selectedRange: 'range', endDate: e.detail.value })
    this.loadStats()
  },

  applyRange(key) {
    if (key === 'day') {
      this.applyDayMonth(this.data.selectedMonth || this.data.todayMonth)
      return
    }
    const preset = RANGE_OPTIONS.find(item => item.key === key && item.days)
    if (preset) {
      this.applyRecentDays(preset.days)
      return
    }
    if (key === 'month') {
      this.applyYear(this.data.selectedYear || this.data.todayYear)
      return
    }
    this.loadStats()
  },

  applyRecentDays(days) {
    const endDate = this.data.today
    const end = this.parseDate(endDate)
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days + 1)
    this.setData({
      startDate: formatDate(start, 'YYYY-MM-DD'),
      endDate,
    })
    this.loadStats()
  },

  applyDayMonth(month) {
    const startDate = `${month}-01`
    const endDate = month === this.data.todayMonth ? this.data.today : this.getMonthEnd(month)
    this.setData({
      selectedMonth: month,
      startDate,
      endDate,
    })
    this.loadStats()
  },

  applyYear(year) {
    const startDate = `${year}-01-01`
    const endDate = year === this.data.todayYear ? this.data.today : `${year}-12-31`
    this.setData({
      selectedYear: year,
      startDate,
      endDate,
    })
    this.loadStats()
  },

  async loadStats() {
    let { startDate, endDate } = this.data
    if (!startDate || !endDate) return
    if (startDate > endDate) {
      const nextStart = endDate
      const nextEnd = startDate
      startDate = nextStart
      endDate = nextEnd
      this.setData({ startDate, endDate })
    }
    this.setData({ loading: true })
    try {
      const statsList = await recordService.getStatsRange(startDate, endDate)
      this.setData({ statsList: statsList || [] })
      this.rebuildView()
    } catch (e) {
      console.warn('load stats range failed:', e)
      wx.showToast({ title: '统计加载失败', icon: 'none' })
      this.setData({ statsList: [] })
      this.rebuildView()
    } finally {
      this.setData({ loading: false })
    }
  },

  rebuildView() {
    const currentType = TYPE_OPTIONS.find(item => item.key === this.data.selectedType) || TYPE_OPTIONS[0]
    const values = this.buildChartValues(this.data.statsList || [], currentType)
    const max = values.reduce((m, item) => Math.max(m, item.value), 0)
    const chartBars = values.map(item => ({
      ...item,
      height: max > 0 && item.value > 0 ? Math.max(4, Math.round((item.value / max) * 100)) : 0,
      valueText: this.formatMetric(item.value, currentType),
    }))
    const total = values.reduce((sum, item) => sum + item.value, 0)
    const averageBase = this.getAverageBase(values)
    const avg = averageBase ? total / averageBase : 0
    const maxValue = max
    const yAxisLabels = maxValue > 0
      ? [this.formatAxisLabel(maxValue, currentType), this.formatAxisLabel(maxValue / 2, currentType), '0']
      : ['', '0', '']
    const calendarData = this.buildCalendarData(values, currentType)
    this.setData({
      currentType,
      ...calendarData,
      chartBars,
      chartModeClass: this.getChartModeClass(chartBars),
      chartScrollLeft: this.getChartScrollLeft(chartBars),
      yAxisLabels,
      summaryItems: this.buildSummaryItems(currentType.key, this.data.statsList || []),
      totalValueText: this.formatMetric(total, currentType),
      averageValueText: this.formatMetric(avg, currentType),
      averageLabel: this.data.selectedRange === 'month' ? '月均' : '日均',
      maxValueText: this.formatMetric(maxValue, currentType),
    })
  },

  buildChartValues(list, currentType) {
    if (this.data.selectedRange === 'month') {
      const year = this.data.selectedYear || this.data.todayYear
      const months = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1
        return {
          date: `${year}-${String(month).padStart(2, '0')}`,
          label: `${month}月`,
          value: 0,
        }
      })
      list.forEach(day => {
        const month = Number((day.date || '').slice(5, 7))
        if (month >= 1 && month <= 12) {
          months[month - 1].value += this.extractValue(day, currentType.key)
        }
      })
      return months
    }
    if (this.data.selectedRange === 'day') {
      const month = this.data.selectedMonth || this.data.todayMonth
      const daysInMonth = Number(this.getMonthEnd(month).slice(8))
      const byDate = list.reduce((map, day) => {
        map[day.date] = day
        return map
      }, {})
      return Array.from({ length: daysInMonth }, (_, index) => {
        const dayNum = index + 1
        const date = `${month}-${String(dayNum).padStart(2, '0')}`
        const raw = byDate[date] || { date }
        return {
          date,
          label: String(dayNum),
          value: this.extractValue(raw, currentType.key),
          isToday: date === this.data.today,
          raw,
        }
      })
    }
    return list.map(day => ({
      date: day.date,
      label: this.formatChartDateLabel(day.date),
      value: this.extractValue(day, currentType.key),
      isToday: day.date === this.data.today,
      raw: day,
    }))
  },

  extractValue(day, type) {
    const feed = day.feed || {}
    const sleep = day.sleep || {}
    const diaper = day.diaper || {}
    const temperature = day.temperature || {}
    const supplement = day.supplement || {}
    const growth = day.growth || {}
    const pump = day.pump || {}
    const complementary = day.complementary || {}
    const abnormal = day.abnormal || {}
    const activity = day.activity || {}
    const vaccine = day.vaccine || {}
    const map = {
      feed: feed.count || 0,
      milk: feed.totalMilk || 0,
      breast: feed.breastDurationSec || 0,
      sleep: sleep.totalDurationSec || 0,
      diaper: diaper.count || 0,
      temperature: temperature.count || 0,
      supplement: supplement.count || 0,
      growth: growth.count || 0,
      pump: pump.totalAmount || 0,
      complementary: complementary.count || 0,
      abnormal: abnormal.count || 0,
      activity: this.getDurationSec(activity),
      vaccine: vaccine.count || 0,
    }
    return map[type] || 0
  },

  buildCalendarData(values, currentType) {
    if (this.data.selectedRange === 'day') {
      return this.buildDayCalendar(values, currentType)
    }
    if (this.data.selectedRange === 'month') {
      return this.buildMonthCalendar(values, currentType)
    }
    return {
      calendarVisible: false,
      calendarModeClass: 'calendar-day',
      calendarTitle: '',
      calendarSubtitle: '',
      calendarCells: [],
    }
  },

  buildDayCalendar(values, currentType) {
    const month = this.data.selectedMonth || this.data.todayMonth
    const firstDay = this.parseDate(`${month}-01`)
    const max = values.reduce((m, item) => Math.max(m, item.value), 0)
    const cells = Array.from({ length: firstDay.getDay() }, (_, index) => ({
      key: `empty-leading-${index}`,
      empty: true,
    }))
    values.forEach(item => {
      cells.push(this.buildCalendarCell({
        key: `day-${item.date}`,
        label: String(Number(item.date.slice(8))),
        date: item.date,
        value: item.value,
        isToday: item.date === this.data.today,
        isFuture: item.date > this.data.today,
      }, max, currentType))
    })
    while (cells.length % 7 !== 0) {
      cells.push({ key: `empty-trailing-${cells.length}`, empty: true })
    }
    return {
      calendarVisible: true,
      calendarModeClass: 'calendar-day',
      calendarTitle: `${month} 日历统计`,
      calendarSubtitle: max > 0 ? `峰值 ${this.formatMetric(max, currentType)}` : '暂无数据',
      calendarCells: cells,
    }
  },

  buildMonthCalendar(values, currentType) {
    const year = this.data.selectedYear || this.data.todayYear
    const max = values.reduce((m, item) => Math.max(m, item.value), 0)
    const cells = values.map(item => this.buildCalendarCell({
      key: `month-${item.date}`,
      label: item.label,
      date: item.date,
      value: item.value,
      isToday: item.date === this.data.todayMonth,
      isFuture: item.date > this.data.todayMonth,
    }, max, currentType))
    return {
      calendarVisible: true,
      calendarModeClass: 'calendar-month',
      calendarTitle: `${year} 月历统计`,
      calendarSubtitle: max > 0 ? `峰值 ${this.formatMetric(max, currentType)}` : '暂无数据',
      calendarCells: cells,
    }
  },

  buildCalendarCell(item, max, currentType) {
    const value = Number(item.value) || 0
    return {
      ...item,
      value,
      valueText: value > 0 ? this.formatMetric(value, currentType) : '',
      style: this.getCalendarCellStyle(value, max, currentType.color),
    }
  },

  getCalendarCellStyle(value, max, color) {
    if (!value || !max) {
      return ''
    }
    const level = Math.max(1, Math.ceil((value / max) * 4))
    const alpha = [0, 0.12, 0.24, 0.42, 0.72][level]
    const borderAlpha = Math.min(alpha + 0.18, 0.9)
    const textColor = level >= 4 ? '#ffffff' : '#202124'
    return `background: ${this.hexToRgba(color, alpha)}; border-color: ${this.hexToRgba(color, borderAlpha)}; color: ${textColor};`
  },

  buildSummaryItems(type, list) {
    const sum = (getter) => list.reduce((total, day) => total + (getter(day) || 0), 0)
    const latestGrowth = [...list].reverse().map(day => day.growth || {}).find(item => item.latestHeight || item.latestWeight) || {}
    const maxTemperature = list.reduce((max, day) => {
      const value = Number(day.temperature && day.temperature.maxTemperature)
      return Number.isNaN(value) ? max : Math.max(max, value)
    }, 0)
    const config = {
      feed: [
        ['喂奶次数', `${sum(day => day.feed && day.feed.count)}次`],
        ['总奶量', `${sum(day => day.feed && day.feed.totalMilk)}ml`],
        ['亲喂次数', `${sum(day => day.feed && day.feed.breastCount)}次`],
        ['亲喂时长', this.formatSeconds(sum(day => day.feed && day.feed.breastDurationSec))],
      ],
      milk: [
        ['总奶量', `${sum(day => day.feed && day.feed.totalMilk)}ml`],
        ['配方奶', `${sum(day => day.feed && day.feed.bottleMilk)}ml`],
        ['母乳瓶喂', `${sum(day => day.feed && day.feed.expressedMilk)}ml`],
        ['瓶喂次数', `${sum(day => day.feed && ((day.feed.bottleCount || 0) + (day.feed.expressedCount || 0)))}次`],
      ],
      breast: [
        ['亲喂次数', `${sum(day => day.feed && day.feed.breastCount)}次`],
        ['总时长', this.formatSeconds(sum(day => day.feed && day.feed.breastDurationSec))],
        ['左侧', this.formatSeconds(sum(day => day.feed && day.feed.breastLeftDurationSec))],
        ['右侧', this.formatSeconds(sum(day => day.feed && day.feed.breastRightDurationSec))],
      ],
      sleep: [
        ['睡眠次数', `${sum(day => day.sleep && day.sleep.count)}次`],
        ['总时长', this.formatSeconds(sum(day => day.sleep && day.sleep.totalDurationSec))],
        ['进行中', `${sum(day => day.sleep && day.sleep.ongoingCount)}次`],
        ['日均', this.formatSeconds(list.length ? sum(day => day.sleep && day.sleep.totalDurationSec) / list.length : 0)],
      ],
      diaper: [
        ['尿布次数', `${sum(day => day.diaper && day.diaper.count)}次`],
        ['小便', `${sum(day => day.diaper && day.diaper.wetCount)}次`],
        ['大便', `${sum(day => day.diaper && day.diaper.dirtyCount)}次`],
        ['异常', `${sum(day => day.diaper && day.diaper.abnormalCount)}次`],
      ],
      temperature: [
        ['体温记录', `${sum(day => day.temperature && day.temperature.count)}次`],
        ['异常体温', `${sum(day => day.temperature && day.temperature.abnormalCount)}次`],
        ['最高体温', maxTemperature ? `${maxTemperature}℃` : '--'],
        ['发热记录', `${sum(day => day.abnormal && day.abnormal.feverCount)}次`],
      ],
      supplement: [
        ['补给次数', `${sum(day => day.supplement && day.supplement.count)}次`],
        ['用药', `${sum(day => day.supplement && day.supplement.medicineCount)}次`],
        ['营养补充', `${sum(day => day.supplement && day.supplement.nutritionCount)}次`],
        ['其他异常', `${sum(day => day.abnormal && (day.abnormal.otherCount || day.abnormal.medicineCount))}次`],
      ],
      growth: [
        ['成长记录', `${sum(day => day.growth && day.growth.count)}次`],
        ['最新身高', latestGrowth.latestHeight ? `${latestGrowth.latestHeight}cm` : '--'],
        ['最新体重', latestGrowth.latestWeight ? `${latestGrowth.latestWeight}kg` : '--'],
        ['记录日期', latestGrowth.latestTime ? latestGrowth.latestTime.slice(5, 10) : '--'],
      ],
      pump: [
        ['吸奶次数', `${sum(day => day.pump && day.pump.count)}次`],
        ['吸奶总量', `${sum(day => day.pump && day.pump.totalAmount)}ml`],
        ['吸奶时长', this.formatSeconds(sum(day => day.pump && (day.pump.totalDurationSec || (day.pump.totalDurationMin || 0) * 60)))],
        ['日均奶量', `${Math.round(list.length ? sum(day => day.pump && day.pump.totalAmount) / list.length : 0)}ml`],
      ],
      complementary: [
        ['辅食次数', `${sum(day => day.complementary && day.complementary.count)}次`],
        ['异常反应', `${sum(day => day.complementary && day.complementary.abnormalCount)}次`],
        ['日均次数', `${(list.length ? sum(day => day.complementary && day.complementary.count) / list.length : 0).toFixed(1)}次`],
        ['记录天数', `${list.filter(day => day.complementary && day.complementary.count > 0).length}天`],
      ],
      abnormal: [
        ['异常次数', `${sum(day => day.abnormal && day.abnormal.count)}次`],
        ['发热', `${sum(day => day.abnormal && day.abnormal.feverCount)}次`],
        ['腹泻', `${sum(day => day.abnormal && day.abnormal.diarrheaCount)}次`],
        ['其他异常', `${sum(day => day.abnormal && (day.abnormal.otherCount || day.abnormal.vomitCount || day.abnormal.medicineCount))}次`],
      ],
      activity: [
        ['活动次数', `${sum(day => day.activity && day.activity.count)}次`],
        ['活动时长', this.formatSeconds(sum(day => day.activity && this.getDurationSec(day.activity)))],
        ['日均时长', this.formatSeconds(list.length ? sum(day => day.activity && this.getDurationSec(day.activity)) / list.length : 0)],
        ['活动天数', `${list.filter(day => day.activity && day.activity.count > 0).length}天`],
      ],
      vaccine: [
        ['疫苗记录', `${sum(day => day.vaccine && day.vaccine.count)}次`],
        ['记录天数', `${list.filter(day => day.vaccine && day.vaccine.count > 0).length}天`],
        ['统计范围', `${list.length}天`],
        ['全部记录', `${sum(day => day.recordCount)}条`],
      ],
    }
    return (config[type] || config.feed).map(item => ({ label: item[0], value: item[1] }))
  },

  formatMetric(value, type) {
    const n = Number(value) || 0
    if (type.key === 'sleep' || type.key === 'activity' || type.key === 'breast') {
      return this.formatSeconds(n, true)
    }
    return `${Math.round(n)}${type.unit}`
  },

  formatAxisLabel(value, type) {
    const n = Number(value) || 0
    if (type.key === 'sleep' || type.key === 'activity' || type.key === 'breast') {
      return this.formatSeconds(n, true)
    }
    if (n >= 1000) {
      return `${Number((n / 1000).toFixed(1))}k${type.unit}`
    }
    return `${Math.round(n)}${type.unit}`
  },

  getChartModeClass(chartBars) {
    if (this.data.selectedRange === 'month') {
      return 'chart-month'
    }
    if (this.data.selectedRange === 'day') {
      return 'chart-day'
    }
    return chartBars.length <= 7 ? 'chart-range chart-range-short' : 'chart-range'
  },

  getAverageBase(values) {
    if (this.data.selectedRange === 'month') {
      return this.data.selectedYear === this.data.todayYear ? Number(this.data.today.slice(5, 7)) : values.length
    }
    if (this.data.selectedRange === 'day') {
      return this.data.selectedMonth === this.data.todayMonth ? Number(this.data.today.slice(8)) : values.length
    }
    return values.length
  },

  getChartScrollLeft(chartBars) {
    if (this.data.selectedRange !== 'day' || this.data.selectedMonth !== this.data.todayMonth) {
      return 0
    }
    const todayIndex = chartBars.findIndex(item => item.date === this.data.today)
    if (todayIndex < 0) return 0
    const windowWidth = this.getWindowWidth()
    const rpxToPx = windowWidth / 750
    const viewportPx = Math.max(160, windowWidth - (24 * 2 + 22 * 2 + 82) * rpxToPx)
    const barPitchPx = 34 * rpxToPx
    const todayCenterPx = (todayIndex + 0.5) * barPitchPx
    return Math.max(0, Math.round(todayCenterPx - viewportPx / 2))
  },

  getWindowWidth() {
    if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
      try {
        return wx.getSystemInfoSync().windowWidth || 375
      } catch (e) {
        return 375
      }
    }
    return 375
  },

  getDurationSec(item) {
    if (!item) return 0
    return item.totalDurationSec || ((item.totalDurationMin || 0) * 60)
  },

  formatSeconds(sec, compact = false) {
    const total = Math.max(0, Math.round(Number(sec) || 0))
    if (total < 60) return `${total}秒`
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) {
      if (compact) return m ? `${h}时${m}分` : `${h}时`
      return `${h}小时${m ? `${m}分钟` : ''}${s ? `${s}秒` : ''}`
    }
    if (compact && s > 0) return `${m}分${s}秒`
    return s ? `${m}分${s}秒` : `${m}分钟`
  },

  formatChartDateLabel(date) {
    if (!date) return ''
    if (this.data.selectedRange === 'day') {
      return String(Number(date.slice(8)))
    }
    return date.slice(5).replace('-', '/')
  },

  getMonthEnd(month) {
    const [year, monthNum] = month.split('-').map(Number)
    return formatDate(new Date(year, monthNum, 0), 'YYYY-MM-DD')
  },

  parseDate(date) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  },

  hexToRgba(hex, alpha) {
    const raw = String(hex || '#07c160').replace('#', '')
    const full = raw.length === 3 ? raw.split('').map(item => item + item).join('') : raw
    const value = Number.parseInt(full, 16)
    if (Number.isNaN(value)) {
      return `rgba(7, 193, 96, ${alpha})`
    }
    const r = (value >> 16) & 255
    const g = (value >> 8) & 255
    const b = value & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  },
})
