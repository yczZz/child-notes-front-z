const { get, post, put, del } = require('../api/index')

function getTodayRecords() {
  return get('/api/records/today')
}

function getTodayStats() {
  return get('/api/records/today/stats')
}

function getDailyStats(dateStr) {
  return get('/api/records/stats/date', { date: dateStr })
}

function getStatsRange(startDate, endDate) {
  return get('/api/records/stats/range', { startDate, endDate })
}

function getRecordsByDate(dateStr) {
  return get('/api/records/date', { date: dateStr })
}

function getHistoryRecords() {
  return get('/api/records/history')
}

function addFeedRecord(data) {
  return post('/api/records/feed', data)
}

function getLatestFeed() {
  return get('/api/records/feed/latest')
}

function addDiaperRecord(data) {
  return post('/api/records/diaper', data)
}

function addSleepRecord(data) {
  return post('/api/records/sleep', data)
}

function addTemperatureRecord(data) {
  return post('/api/records/temperature', data)
}

function addSupplementRecord(data) {
  return post('/api/records/supplement', data)
}

function getSupplementCustomItems() {
  return get('/api/records/supplement/custom-items')
}

function addGrowthRecord(data) {
  return post('/api/records/growth', data)
}

function wakeUpSleep(sleepId) {
  return put(`/api/records/sleep/${sleepId}/wake`)
}

function addAbnormalRecord(data) {
  return post('/api/records/abnormal', data)
}

function addPumpRecord(data) {
  return post('/api/records/pump', data)
}

function addComplementaryRecord(data) {
  return post('/api/records/complementary', data)
}

function addMaternalFoodRecord(data) {
  return post('/api/records/maternal-food', data)
}

function markFeverResolved() {
  return post('/api/records/fever-resolved')
}

function markDiarrheaResolved() {
  return post('/api/records/diarrhea-resolved')
}

function markAbnormalResolved() {
  return post('/api/records/abnormal-resolved')
}

function addVaccineRecord(data) {
  return post('/api/records/vaccine', data)
}

function getVaccines() {
  return get('/api/records/vaccines')
}

function getCustomVaccines() {
  return get('/api/records/vaccines/custom')
}

function addCustomVaccine(data) {
  return post('/api/records/vaccines/custom', data)
}

function getLatestSleep() {
  return get('/api/records/sleep/latest')
}

function addActivityRecord(data) {
  return post('/api/records/activity', data)
}

function getActivities() {
  return get('/api/records/activities')
}

function getCustomItems(type) {
  return get('/api/records/custom-items', { type }).then(res => (res && res.items) ? res.items : [])
}

function deleteCustomItem(type, name) {
  return del(`/api/records/custom-items?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`)
}

function updateRecord(id, data) {
  return put(`/api/records/${id}`, data)
}

function deleteRecord(id) {
  return del(`/api/records/${id}`)
}

function addMilestone(data) {
  return post('/api/records/milestone', data)
}

function getMilestones() {
  return get('/api/records/milestones')
}

function updateMilestone(id, data) {
  return put(`/api/records/milestone/${id}`, data)
}

module.exports = {
  getTodayRecords, getTodayStats, getDailyStats, getStatsRange, getRecordsByDate, getHistoryRecords,
  addFeedRecord, getLatestFeed, addDiaperRecord, addSleepRecord, addTemperatureRecord,
  addSupplementRecord, getSupplementCustomItems, addGrowthRecord, wakeUpSleep, addAbnormalRecord, addPumpRecord, addComplementaryRecord, addMaternalFoodRecord,
  markFeverResolved, markDiarrheaResolved, markAbnormalResolved, addVaccineRecord, getVaccines, getCustomVaccines, addCustomVaccine, getLatestSleep,
  addActivityRecord, getActivities, getCustomItems, deleteCustomItem, updateRecord, deleteRecord, addMilestone, getMilestones, updateMilestone,
}
