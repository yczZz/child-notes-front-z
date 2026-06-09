const { get, post, put } = require('../api/index')

function getBabyInfo() {
  return get('/api/baby/current')
}

function getBabyList() {
  return get('/api/baby/list')
}

function updateBabyInfo(data) {
  return put('/api/baby/update', data)
}

function addBaby(data) {
  return post('/api/baby/add', data)
}

function getFamilyMembers() {
  return get('/api/baby/family/members')
}

function updateMyFamilyRole(data) {
  return put('/api/baby/family/my-role', data)
}

function setCurrentBaby(baby) {
  const app = getApp()
  if (typeof app.setCurrentBaby === 'function') {
    app.setCurrentBaby(baby)
    return
  }
  app.globalData.currentBaby = baby || null
  if (baby && baby.id) {
    wx.setStorageSync('currentBaby', baby)
    wx.setStorageSync('currentBabyId', baby.id)
  } else {
    wx.removeStorageSync('currentBaby')
    wx.removeStorageSync('currentBabyId')
  }
}

function getCurrentBabyId() {
  const app = getApp()
  if (typeof app.getCurrentBabyId === 'function') {
    return app.getCurrentBabyId()
  }
  const currentBaby = app.globalData.currentBaby || wx.getStorageSync('currentBaby') || {}
  return currentBaby.id || wx.getStorageSync('currentBabyId') || ''
}

async function loadBabySession() {
  const app = getApp()
  const list = await getBabyList()
  const babyList = Array.isArray(list) ? list : []
  app.globalData.babyList = babyList

  if (babyList.length === 0) {
    setCurrentBaby(null)
    return { currentBaby: null, babyList }
  }

  const currentId = Number(getCurrentBabyId())
  const currentBaby = babyList.find(item => Number(item.id) === currentId) || babyList[0]
  setCurrentBaby(currentBaby)
  return { currentBaby, babyList }
}

function joinFamilyViaInvite(data) {
  return post('/api/baby/family/join', data)
}

function getGrowthStage(babyId) {
  return get('/api/baby/growth-stage', babyId ? { babyId } : {})
}

module.exports = {
  getBabyInfo,
  getBabyList,
  updateBabyInfo,
  addBaby,
  getFamilyMembers,
  updateMyFamilyRole,
  joinFamilyViaInvite,
  getGrowthStage,
  setCurrentBaby,
  getCurrentBabyId,
  loadBabySession,
}
