/**
 * 工具函数
 */

/**
 * 格式化日期
 * @param {Date|number} date - 日期对象或时间戳
 * @param {string} fmt - 格式，如 'YYYY-MM-DD HH:mm:ss'
 */
const formatDate = (date, fmt = 'YYYY-MM-DD') => {
  date = date instanceof Date ? date : new Date(date)
  const o = {
    'M+': date.getMonth() + 1,
    'D+': date.getDate(),
    'H+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
  }
  if (/(Y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, String(date.getFullYear()).slice(-RegExp.$1.length))
  }
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : `00${o[k]}`.slice(String(o[k]).length))
    }
  }
  return fmt
}

const parseDateTime = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (value === undefined || value === null || value === '') return null
  const date = new Date(String(value).replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeRecordTime = (value, fallback = new Date()) => (
  formatDate(parseDateTime(value) || fallback, 'YYYY-MM-DD HH:mm')
)

const buildTimeRange = (references = []) => {
  const refs = Array.isArray(references) ? references : [references]
  const years = refs
    .map(parseDateTime)
    .filter(Boolean)
    .map(date => date.getFullYear())
  years.push(new Date().getFullYear())
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  return [
    Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i)),
    Array.from({ length: 12 }, (_, i) => String(i + 1)),
    Array.from({ length: 31 }, (_, i) => String(i + 1)),
    Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
  ]
}

const getTimeIndex = (value, timeRange) => {
  const date = parseDateTime(value) || new Date()
  const yearIndex = Math.max(0, (timeRange[0] || []).indexOf(String(date.getFullYear())))
  return [
    yearIndex,
    date.getMonth(),
    date.getDate() - 1,
    date.getHours(),
    date.getMinutes(),
  ]
}

const buildTimeSelector = (value, references = []) => {
  const refList = Array.isArray(references) ? references : [references]
  const timeRange = buildTimeRange([value, ...refList])
  return {
    timeRange,
    timeIndex: getTimeIndex(value, timeRange),
  }
}

/**
 * 计算宝宝年龄（精确到天）
 * @param {string|Date} birthDate - 出生日期
 * @returns {string} 如 "1岁2个月3天"
 */
const calcBabyAge = (birthDate) => {
  const birth = new Date(birthDate)
  const now = new Date()

  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years > 0) {
    return `${years}岁${months}个月${days}天`
  }
  if (months > 0) {
    return `${months}个月${days}天`
  }
  return `${days}天`
}

/**
 * Toast 提示
 */
const showToast = (title, icon = 'none') => {
  wx.showToast({ title, icon, duration: 2000 })
}

/**
 * Loading 显示/隐藏
 */
const showLoading = (title = '加载中') => {
  wx.showLoading({ title, mask: true })
}

const hideLoading = () => {
  wx.hideLoading()
}

module.exports = {
  formatDate,
  buildTimeRange,
  buildTimeSelector,
  calcBabyAge,
  getTimeIndex,
  normalizeRecordTime,
  parseDateTime,
  showToast,
  showLoading,
  hideLoading,
}
