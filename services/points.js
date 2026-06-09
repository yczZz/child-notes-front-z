const { get, post } = require('../api/index')

function getDashboard() {
  return get('/api/points/dashboard')
}

function getSignInRule() {
  return get('/api/points/sign-in-rule')
}

function signIn() {
  return post('/api/points/sign-in')
}

function getActiveLottery() {
  return get('/api/points/lottery/active')
}

function joinLottery(activityId) {
  return post(`/api/points/lottery/${activityId}/join`)
}

function getLotteryHistory() {
  return get('/api/points/lottery/history')
}

function getInviteRecords() {
  return get('/api/points/invite-records')
}

module.exports = {
  getDashboard,
  getSignInRule,
  signIn,
  getActiveLottery,
  joinLottery,
  getLotteryHistory,
  getInviteRecords,
}
