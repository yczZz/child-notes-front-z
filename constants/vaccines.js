const { formatDate, parseDateTime } = require('../utils/util')

const VACCINE_CATEGORIES = [
  { key: 'free', name: '免费疫苗', desc: '国家免疫规划' },
  { key: 'paid', name: '自费疫苗', desc: '补充或升级可选' },
]

const VACCINE_CATALOG = [
  {
    id: 'hepb',
    category: 'free',
    name: '乙肝疫苗',
    disease: '乙型病毒性肝炎',
    remark: '出生后24小时内接种第1剂。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '出生时', due: { days: 0 } },
      { id: 'dose2', label: '第2剂', ageLabel: '1月龄', due: { months: 1 } },
      { id: 'dose3', label: '第3剂', ageLabel: '6月龄', due: { months: 6 } },
    ],
  },
  {
    id: 'bcg',
    category: 'free',
    name: '卡介苗',
    disease: '结核病',
    remark: '可与乙肝疫苗同时在不同部位接种。',
    doses: [
      { id: 'dose1', label: '1剂', ageLabel: '出生时', due: { days: 0 } },
    ],
  },
  {
    id: 'ipv',
    category: 'free',
    name: '脊灰灭活疫苗(IPV)',
    disease: '脊髓灰质炎',
    remark: '注射剂型。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '2月龄', due: { months: 2 } },
      { id: 'dose2', label: '第2剂', ageLabel: '3月龄', due: { months: 3 } },
    ],
  },
  {
    id: 'bopv',
    category: 'free',
    name: '脊灰减毒活疫苗(bOPV)',
    disease: '脊髓灰质炎',
    remark: '口服剂型。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '4月龄', due: { months: 4 } },
      { id: 'dose2', label: '第2剂', ageLabel: '4周岁', due: { months: 48 } },
    ],
  },
  {
    id: 'dtap',
    category: 'free',
    name: '百白破疫苗',
    disease: '百日咳、白喉、破伤风',
    remark: '6周岁的百白破疫苗已替代过去的白破疫苗。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '3月龄', due: { months: 3 } },
      { id: 'dose2', label: '第2剂', ageLabel: '4月龄', due: { months: 4 } },
      { id: 'dose3', label: '第3剂', ageLabel: '5月龄', due: { months: 5 } },
      { id: 'dose4', label: '加强1剂', ageLabel: '18月龄', due: { months: 18 } },
      { id: 'dose5', label: '第5剂加强', ageLabel: '6周岁', due: { months: 72 } },
    ],
  },
  {
    id: 'men_a',
    category: 'free',
    name: 'A群流脑多糖疫苗',
    disease: 'A群流行性脑脊髓膜炎',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '6月龄', due: { months: 6 } },
      { id: 'dose2', label: '第2剂', ageLabel: '9月龄', due: { months: 9 } },
    ],
  },
  {
    id: 'mmr',
    category: 'free',
    name: '麻腮风疫苗',
    disease: '麻疹、流行性腮腺炎、风疹',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '8月龄', due: { months: 8 } },
      { id: 'dose2', label: '第2剂', ageLabel: '18月龄', due: { months: 18 } },
    ],
  },
  {
    id: 'je_live',
    category: 'free',
    name: '乙脑减毒活疫苗',
    disease: '流行性乙型脑炎',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '8月龄', due: { months: 8 } },
      { id: 'dose2', label: '第2剂', ageLabel: '2周岁', due: { months: 24 } },
    ],
  },
  {
    id: 'hepa_live',
    category: 'free',
    name: '甲肝减毒活疫苗',
    disease: '甲型病毒性肝炎',
    doses: [
      { id: 'dose1', label: '1剂', ageLabel: '18月龄', due: { months: 18 } },
    ],
  },
  {
    id: 'men_ac',
    category: 'free',
    name: 'A群C群流脑多糖疫苗',
    disease: 'A群及C群流行性脑脊髓膜炎',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '3周岁', due: { months: 36 } },
      { id: 'dose2', label: '第2剂', ageLabel: '6周岁', due: { months: 72 } },
    ],
  },
  {
    id: 'pcv13',
    category: 'paid',
    name: '13价肺炎球菌结合疫苗',
    disease: '肺炎链球菌感染',
    remark: '也可按3、4、5月龄基础免疫方案，具体以门诊和品牌为准。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '2月龄', due: { months: 2 } },
      { id: 'dose2', label: '第2剂', ageLabel: '4月龄', due: { months: 4 } },
      { id: 'dose3', label: '第3剂', ageLabel: '6月龄', due: { months: 6 } },
      { id: 'dose4', label: '加强1剂', ageLabel: '12-15月龄', due: { months: 12 } },
    ],
  },
  {
    id: 'rota5',
    category: 'paid',
    name: '五价轮状病毒疫苗',
    disease: '轮状病毒腹泻',
    remark: '首剂不晚于12周龄，末剂不晚于32周龄。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '6-12周龄', due: { weeks: 6 } },
      { id: 'dose2', label: '第2剂', ageLabel: '10-22周龄', due: { weeks: 10 } },
      { id: 'dose3', label: '第3剂', ageLabel: '14-32周龄', due: { weeks: 14 } },
    ],
  },
  {
    id: 'hib',
    category: 'paid',
    name: 'b型流感嗜血杆菌(Hib)疫苗',
    disease: 'Hib感染',
    remark: '可与百白破、脊灰等制成四联/五联疫苗。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '2月龄', due: { months: 2 } },
      { id: 'dose2', label: '第2剂', ageLabel: '3月龄', due: { months: 3 } },
      { id: 'dose3', label: '第3剂', ageLabel: '4月龄', due: { months: 4 } },
      { id: 'dose4', label: '加强1剂', ageLabel: '18月龄', due: { months: 18 } },
    ],
  },
  {
    id: 'varicella',
    category: 'paid',
    name: '水痘疫苗',
    disease: '水痘',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '12月龄', due: { months: 12 } },
      { id: 'dose2', label: '第2剂', ageLabel: '4-6岁', due: { months: 48 } },
    ],
  },
  {
    id: 'flu',
    category: 'paid',
    name: '流感疫苗',
    disease: '流行性感冒',
    remark: '满6月龄后每年流感季前接种；首次接种通常需2剂，间隔4周。',
    doses: [
      { id: 'dose1', label: '首次第1剂', ageLabel: '满6月龄', due: { months: 6 } },
      { id: 'dose2', label: '首次第2剂', ageLabel: '间隔4周', due: { months: 7 } },
    ],
  },
  {
    id: 'ev71',
    category: 'paid',
    name: '肠道病毒71型(EV71)疫苗',
    disease: 'EV71相关手足口病',
    remark: '6月龄至5岁接种2剂，间隔1个月。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '6月龄', due: { months: 6 } },
      { id: 'dose2', label: '第2剂', ageLabel: '7月龄', due: { months: 7 } },
    ],
  },
  {
    id: 'men_ac_conj',
    category: 'paid',
    name: 'A+C群流脑结合疫苗',
    disease: 'A群、C群流行性脑脊髓膜炎',
    remark: '可替代部分免费流脑疫苗，2岁以下保护效果更优。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '6月龄', due: { months: 6 } },
      { id: 'dose2', label: '第2剂', ageLabel: '9月龄', due: { months: 9 } },
      { id: 'dose3', label: '加强1剂', ageLabel: '3周岁', due: { months: 36 } },
      { id: 'dose4', label: '加强2剂', ageLabel: '6周岁', due: { months: 72 } },
    ],
  },
  {
    id: 'men_acyw135',
    category: 'paid',
    name: 'ACYW135群流脑多糖疫苗',
    disease: 'A、C、Y、W135群流脑',
    remark: '2岁以上可接种，可替代A+C群流脑多糖疫苗。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '2岁以上', due: { months: 24 } },
    ],
  },
  {
    id: 'hepa_inact',
    category: 'paid',
    name: '甲肝灭活疫苗',
    disease: '甲型病毒性肝炎',
    remark: '可替代免费的甲肝减毒活疫苗。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '18月龄', due: { months: 18 } },
      { id: 'dose2', label: '第2剂', ageLabel: '24月龄', due: { months: 24 } },
    ],
  },
  {
    id: 'je_inact',
    category: 'paid',
    name: '乙脑灭活疫苗',
    disease: '流行性乙型脑炎',
    remark: '可替代免费的乙脑减毒活疫苗，特殊儿童请遵医嘱。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '8月龄', due: { months: 8 } },
      { id: 'dose2', label: '第2剂', ageLabel: '间隔7-10天', due: { months: 8, days: 10 } },
      { id: 'dose3', label: '第3剂', ageLabel: '2周岁', due: { months: 24 } },
      { id: 'dose4', label: '第4剂', ageLabel: '6周岁', due: { months: 72 } },
    ],
  },
  {
    id: 'pentavalent',
    category: 'paid',
    name: '五联疫苗',
    disease: '百日咳、白喉、破伤风、脊髓灰质炎、Hib感染',
    remark: '可显著减少接种针次，具体替代关系请以门诊为准。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '2月龄', due: { months: 2 } },
      { id: 'dose2', label: '第2剂', ageLabel: '3月龄', due: { months: 3 } },
      { id: 'dose3', label: '第3剂', ageLabel: '4月龄', due: { months: 4 } },
      { id: 'dose4', label: '加强1剂', ageLabel: '18月龄', due: { months: 18 } },
    ],
  },
  {
    id: 'cholera',
    category: 'paid',
    name: '霍乱疫苗',
    disease: '霍乱及ETEC腹泻',
    remark: '2岁以上儿童口服3剂，适用于沿海或霍乱流行区儿童。',
    doses: [
      { id: 'dose1', label: '第1剂', ageLabel: '2岁以上', due: { months: 24 } },
      { id: 'dose2', label: '第2剂', ageLabel: '间隔7天', due: { months: 24, days: 7 } },
      { id: 'dose3', label: '第3剂', ageLabel: '间隔28天', due: { months: 24, days: 28 } },
    ],
  },
]

const VACCINE_ALIASES = {
  hepb: ['乙肝'],
  bcg: ['卡介'],
  ipv: ['IPV', '脊灰灭活'],
  bopv: ['bOPV', '脊灰减毒'],
  dtap: ['百白破'],
  men_a: ['A群流脑'],
  mmr: ['麻腮风'],
  je_live: ['乙脑减毒'],
  hepa_live: ['甲肝减毒'],
  men_ac: ['A群C群流脑', 'A+C流脑'],
  pcv13: ['13价肺炎', '肺炎13价'],
  rota5: ['五价轮状', '轮状病毒'],
  hib: ['Hib'],
  varicella: ['水痘'],
  flu: ['流感'],
  ev71: ['EV71', '手足口'],
  men_ac_conj: ['A+C流脑结合', 'A+C群流脑结合'],
  men_acyw135: ['ACYW135流脑', '四价流脑'],
  hepa_inact: ['甲肝灭活'],
  je_inact: ['乙脑灭活'],
  pentavalent: ['五联'],
  cholera: ['霍乱'],
}

const REPLACEMENT_TARGETS = {
  'men_ac_conj:dose1': ['men_a:dose1'],
  'men_ac_conj:dose2': ['men_a:dose2'],
  'men_ac_conj:dose3': ['men_ac:dose1'],
  'men_ac_conj:dose4': ['men_ac:dose2'],
  'men_acyw135:dose1': ['men_ac:dose1'],
  'hepa_inact:dose1': ['hepa_live:dose1'],
  'je_inact:dose2': ['je_live:dose1'],
  'je_inact:dose3': ['je_live:dose2'],
  'pentavalent:dose1': ['ipv:dose1', 'dtap:dose1', 'hib:dose1'],
  'pentavalent:dose2': ['ipv:dose2', 'dtap:dose2', 'hib:dose2'],
  'pentavalent:dose3': ['bopv:dose1', 'dtap:dose3', 'hib:dose3'],
  'pentavalent:dose4': ['dtap:dose4', 'hib:dose4'],
}

function uniqueCustomVaccines(customVaccines = []) {
  const result = []
  const seen = {}
  ;(customVaccines || []).forEach((item) => {
    const name = String(item && item.name || '').trim()
    if (!name) return
    const id = String(item.id || `custom_${name}`).trim()
    if (seen[id]) return
    seen[id] = true
    result.push({
      ...item,
      id,
      name,
      category: item.category === 'free' ? 'free' : 'paid',
      disease: String(item.disease || '自定义疫苗').trim(),
      doseLabel: item.doseLabel || '1剂',
      ageLabel: item.ageLabel || '按门诊安排',
      due: item.due || null,
      remark: item.remark || '',
      custom: true,
    })
  })
  return result
}

function getVaccineCatalog(customVaccines = []) {
  const customCatalog = uniqueCustomVaccines(customVaccines).map(item => ({
    id: item.id,
    category: item.category,
    name: item.name,
    disease: item.disease,
    remark: item.remark,
    custom: true,
    doses: [
      {
        id: 'dose1',
        label: item.doseLabel,
        ageLabel: item.ageLabel,
        due: item.due,
      },
    ],
  }))
  return [...VACCINE_CATALOG, ...customCatalog]
}

function getCategoryName(category) {
  const found = VACCINE_CATEGORIES.find(item => item.key === category)
  return found ? found.name : ''
}

function toDateOnly(value) {
  const date = parseDateTime(value)
  if (!date) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDateOffset(baseDate, offset = {}) {
  const date = toDateOnly(baseDate)
  if (!date) return null
  if (offset.months) date.setMonth(date.getMonth() + offset.months)
  if (offset.weeks) date.setDate(date.getDate() + offset.weeks * 7)
  if (offset.days) date.setDate(date.getDate() + offset.days)
  return date
}

function formatDateOnly(date) {
  return date ? formatDate(date, 'YYYY-MM-DD') : ''
}

function formatDoseName(vaccine, dose) {
  return dose.label ? `${vaccine.name} ${dose.label}` : vaccine.name
}

function hasDueOffset(offset = {}) {
  return ['months', 'weeks', 'days'].some(key => Object.prototype.hasOwnProperty.call(offset, key))
}

function getDueSortValue(offset = {}) {
  if (!hasDueOffset(offset)) return Number.MAX_SAFE_INTEGER
  return (offset.months || 0) * 31 + (offset.weeks || 0) * 7 + (offset.days || 0)
}

function formatDuePeriodLabel(offset = {}, fallback = '') {
  if (!hasDueOffset(offset)) return fallback || '按门诊安排'

  const months = offset.months || 0
  const weeks = offset.weeks || 0
  const days = offset.days || 0
  const extraDays = weeks * 7 + days

  if (months > 0) {
    if (months % 12 === 0 && extraDays === 0) {
      return `${months / 12}周岁`
    }
    return `${months}月龄${extraDays ? `+${extraDays}天` : ''}`
  }

  if (weeks > 0) {
    return `${weeks}周龄${days ? `+${days}天` : ''}`
  }

  if (days === 0) return '出生时'
  return `${days}天`
}

function normalizeName(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/针/g, '剂')
    .toLowerCase()
}

function getVaccineAliases(vaccine) {
  const withoutSuffix = vaccine.name.replace(/疫苗/g, '')
  return [vaccine.name, withoutSuffix, ...(VACCINE_ALIASES[vaccine.id] || [])]
    .map(normalizeName)
    .filter(Boolean)
}

function getDoseNumber(label) {
  const match = String(label || '').match(/第(\d+)/)
  return match ? match[1] : ''
}

function flattenVaccineDoses(birthDate, customVaccines = []) {
  return getVaccineCatalog(customVaccines).reduce((list, vaccine) => {
    vaccine.doses.forEach((dose) => {
      const due = dose.due || null
      const recommendedDate = due ? addDateOffset(birthDate, due) : null
      list.push({
        key: `${vaccine.id}:${dose.id}`,
        vaccineId: vaccine.id,
        doseId: dose.id,
        category: vaccine.category,
        categoryName: getCategoryName(vaccine.category),
        vaccineName: vaccine.name,
        vaccineAliases: getVaccineAliases(vaccine),
        disease: vaccine.disease,
        custom: Boolean(vaccine.custom),
        remark: vaccine.remark || '',
        doseLabel: dose.label,
        doseCount: vaccine.doses.length,
        ageLabel: dose.ageLabel,
        dueSortValue: due ? getDueSortValue(due) : Number.MAX_SAFE_INTEGER,
        duePeriodLabel: due ? formatDuePeriodLabel(due, dose.ageLabel) : (dose.ageLabel || '按门诊安排'),
        name: formatDoseName(vaccine, dose),
        recommendedDate,
        recommendedDateText: formatDateOnly(recommendedDate),
      })
    })
    return list
  }, [])
}

function isSameDose(record, plan) {
  if (!record || !plan) return false
  if (record.vaccineId && record.doseId) {
    return record.vaccineId === plan.vaccineId && record.doseId === plan.doseId
  }

  const recordName = normalizeName(record.name)
  const planName = normalizeName(plan.name)
  if (!recordName) return false
  if (recordName === planName) return true
  const matchVaccine = (plan.vaccineAliases || [plan.vaccineName])
    .some(name => recordName.includes(name))
  if (!matchVaccine) return false

  if (plan.doseCount === 1) return true

  const doseNumber = getDoseNumber(plan.doseLabel)
  if (doseNumber) {
    return recordName.includes(`第${doseNumber}`) || recordName.includes(`${doseNumber}剂`)
  }
  return recordName.includes(normalizeName(plan.doseLabel))
}

function isSkippedRecord(record) {
  return Boolean(record && (record.skipped === true || record.status === 'skipped'))
}

function findRecordForPlan(records, plan, predicate) {
  return (records || []).find((record) => {
    if (!isSameDose(record, plan)) return false
    return predicate ? predicate(record) : true
  })
}

function findDoneRecordForPlan(records, plan) {
  return findRecordForPlan(records, plan, record => !isSkippedRecord(record))
}

function findSkippedRecordForPlan(records, plan) {
  return findRecordForPlan(records, plan, isSkippedRecord)
}

function getReplacementSources(targetKey) {
  return Object.keys(REPLACEMENT_TARGETS)
    .filter(sourceKey => (REPLACEMENT_TARGETS[sourceKey] || []).includes(targetKey))
}

function findReplacementForPlan(records, plan, plans) {
  const sourceKeys = getReplacementSources(plan.key)
  for (let i = 0; i < sourceKeys.length; i += 1) {
    const sourcePlan = plans.find(item => item.key === sourceKeys[i])
    if (!sourcePlan) continue
    const sourceRecord = findDoneRecordForPlan(records, sourcePlan)
    if (sourceRecord) {
      return { sourcePlan, sourceRecord }
    }
  }
  return null
}

function getPlanStatus(plan, doneRecord, skippedRecord, replacement) {
  if (doneRecord) {
    return { status: 'done', statusClass: 'done', statusText: '已打' }
  }
  if (skippedRecord) {
    return { status: 'skipped', statusClass: 'skipped', statusText: '已跳过' }
  }
  if (replacement) {
    return { status: 'replaced', statusClass: 'replaced', statusText: '已替代' }
  }
  if (!plan.recommendedDate) {
    return { status: 'pending', statusClass: 'pending', statusText: '待安排' }
  }

  const today = toDateOnly(new Date())
  const diffDays = Math.ceil((plan.recommendedDate.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) {
    return { status: 'overdue', statusClass: 'overdue', statusText: '已到期' }
  }
  if (diffDays === 0) {
    return { status: 'due', statusClass: 'due', statusText: '今天可打' }
  }
  if (diffDays <= 30) {
    return { status: 'soon', statusClass: 'soon', statusText: `${diffDays}天后` }
  }
  return { status: 'pending', statusClass: 'pending', statusText: plan.recommendedDateText }
}

function getPlanSortValue(plan) {
  if (plan && plan.recommendedDate) return plan.recommendedDate.getTime()
  if (plan && Number.isFinite(plan.dueSortValue)) return plan.dueSortValue
  return Number.MAX_SAFE_INTEGER
}

function sortPlans(a, b) {
  const diff = getPlanSortValue(a) - getPlanSortValue(b)
  if (diff !== 0) return diff
  return String(a.key || '').localeCompare(String(b.key || ''))
}

function buildDosePlans(records = [], birthDate = '', customVaccines = []) {
  const plans = flattenVaccineDoses(birthDate, customVaccines)
  return plans.map((plan) => {
    const doneRecord = findDoneRecordForPlan(records, plan)
    const skippedRecord = findSkippedRecordForPlan(records, plan)
    const replacement = findReplacementForPlan(records, plan, plans)
    const status = getPlanStatus(plan, doneRecord, skippedRecord, replacement)
    const handled = Boolean(doneRecord || skippedRecord || replacement)
    return {
      ...plan,
      ...status,
      done: Boolean(doneRecord),
      skipped: Boolean(skippedRecord),
      replaced: Boolean(replacement),
      handled,
      doneTime: doneRecord ? doneRecord.time : '',
      skippedTime: skippedRecord ? skippedRecord.time : '',
      replacedByName: replacement ? replacement.sourcePlan.name : '',
      replacedTime: replacement ? replacement.sourceRecord.time : '',
      recordId: doneRecord ? doneRecord.id : (skippedRecord ? skippedRecord.id : null),
    }
  })
}

function findNextDosePlan(records = [], birthDate = '', category = '', customVaccines = []) {
  const undone = buildDosePlans(records, birthDate, customVaccines)
    .filter(plan => !plan.handled)
    .filter(plan => !category || plan.category === category)
  return undone.sort(sortPlans)[0] || null
}

function isUpcomingPlan(plan) {
  if (!plan || !plan.recommendedDate) return true
  const today = toDateOnly(new Date())
  return !today || plan.recommendedDate.getTime() >= today.getTime()
}

function findUpcomingDosePlan(records = [], birthDate = '', category = '', customVaccines = []) {
  const upcoming = buildDosePlans(records, birthDate, customVaccines)
    .filter(plan => !plan.handled)
    .filter(plan => !category || plan.category === category)
    .filter(isUpcomingPlan)
  return upcoming.sort(sortPlans)[0] || null
}

function findNextDosePlans(records = [], birthDate = '', customVaccines = []) {
  return VACCINE_CATEGORIES.map(category => ({
    ...category,
    plan: findUpcomingDosePlan(records, birthDate, category.key, customVaccines),
  }))
}

function buildCatalogGroups(records = [], birthDate = '', customVaccines = []) {
  const plans = buildDosePlans(records, birthDate, customVaccines)
  return VACCINE_CATEGORIES.map((category) => {
    const vaccines = getVaccineCatalog(customVaccines)
      .filter(vaccine => vaccine.category === category.key)
      .map((vaccine) => {
        const doses = plans.filter(plan => plan.vaccineId === vaccine.id)
        return {
          ...vaccine,
          categoryName: category.name,
          doneCount: doses.filter(dose => dose.done).length,
          skippedCount: doses.filter(dose => dose.skipped).length,
          replacedCount: doses.filter(dose => dose.replaced).length,
          handledCount: doses.filter(dose => dose.handled).length,
          totalCount: doses.length,
          doses,
        }
      })
    return {
      ...category,
      vaccines,
      doneCount: vaccines.reduce((sum, vaccine) => sum + vaccine.doneCount, 0),
      skippedCount: vaccines.reduce((sum, vaccine) => sum + vaccine.skippedCount, 0),
      replacedCount: vaccines.reduce((sum, vaccine) => sum + vaccine.replacedCount, 0),
      handledCount: vaccines.reduce((sum, vaccine) => sum + vaccine.handledCount, 0),
      totalCount: vaccines.reduce((sum, vaccine) => sum + vaccine.totalCount, 0),
    }
  })
}

function buildTimelineGroups(records = [], birthDate = '', customVaccines = []) {
  const groups = []
  const groupMap = {}

  buildDosePlans(records, birthDate, customVaccines)
    .slice()
    .sort(sortPlans)
    .forEach((plan) => {
      const groupKey = Number.isFinite(plan.dueSortValue) && plan.dueSortValue !== Number.MAX_SAFE_INTEGER
        ? `due-${plan.dueSortValue}`
        : `manual-${plan.ageLabel || plan.key}`
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = {
          key: groupKey,
          name: plan.duePeriodLabel || plan.ageLabel || '按门诊安排',
          dateText: plan.recommendedDateText || '',
          doses: [],
        }
        groups.push(groupMap[groupKey])
      }
      if (!groupMap[groupKey].dateText && plan.recommendedDateText) {
        groupMap[groupKey].dateText = plan.recommendedDateText
      }
      groupMap[groupKey].doses.push(plan)
    })

  return groups.map((group) => {
    const freeDoses = group.doses.filter(dose => dose.category === 'free')
    const paidDoses = group.doses.filter(dose => dose.category === 'paid')
    return {
      ...group,
      freeDoses,
      paidDoses,
      hasFree: freeDoses.length > 0,
      hasPaid: paidDoses.length > 0,
      doneCount: group.doses.filter(dose => dose.done).length,
      skippedCount: group.doses.filter(dose => dose.skipped).length,
      replacedCount: group.doses.filter(dose => dose.replaced).length,
      handledCount: group.doses.filter(dose => dose.handled).length,
      totalCount: group.doses.length,
    }
  })
}

function createVaccinePayload(plan, records = [], birthDate = '', recordTime = '', customVaccines = []) {
  if (!plan) return null
  const time = recordTime || formatDate(new Date(), 'YYYY-MM-DD HH:mm')
  const simulatedRecords = [
    ...(records || []),
    {
      name: plan.name,
      vaccineId: plan.vaccineId,
      doseId: plan.doseId,
      time,
    },
  ]
  const nextPlan = findNextDosePlan(simulatedRecords, birthDate, plan.category, customVaccines)
  return {
    name: plan.name,
    vaccineId: plan.vaccineId,
    doseId: plan.doseId,
    category: plan.category,
    doseLabel: plan.doseLabel,
    custom: plan.custom || undefined,
    recommendedDate: plan.recommendedDateText || undefined,
    status: 'done',
    skipped: false,
    time,
    nextName: nextPlan ? nextPlan.name : undefined,
    nextDate: nextPlan && nextPlan.recommendedDateText ? nextPlan.recommendedDateText : undefined,
  }
}

function createSkipPayload(plan, records = [], birthDate = '', reason = '手动跳过', customVaccines = []) {
  if (!plan) return null
  const time = formatDate(new Date(), 'YYYY-MM-DD HH:mm')
  const simulatedRecords = [
    ...(records || []),
    {
      name: plan.name,
      vaccineId: plan.vaccineId,
      doseId: plan.doseId,
      status: 'skipped',
      skipped: true,
      time,
    },
  ]
  const nextPlan = findNextDosePlan(simulatedRecords, birthDate, plan.category, customVaccines)
  return {
    name: plan.name,
    vaccineId: plan.vaccineId,
    doseId: plan.doseId,
    category: plan.category,
    doseLabel: plan.doseLabel,
    custom: plan.custom || undefined,
    recommendedDate: plan.recommendedDateText || undefined,
    status: 'skipped',
    skipped: true,
    skippedReason: reason,
    note: reason,
    time,
    nextName: nextPlan ? nextPlan.name : undefined,
    nextDate: nextPlan && nextPlan.recommendedDateText ? nextPlan.recommendedDateText : undefined,
  }
}

module.exports = {
  VACCINE_CATEGORIES,
  VACCINE_CATALOG,
  buildCatalogGroups,
  buildDosePlans,
  buildTimelineGroups,
  createSkipPayload,
  createVaccinePayload,
  findNextDosePlan,
  findNextDosePlans,
}
