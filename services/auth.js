const { get, post, put } = require('../api/index')
const { uploadFileIfNeeded, isLocalFilePath } = require('./upload')

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) resolve(res.code)
        else reject(new Error('wx.login no code'))
      },
      fail: reject,
    })
  })
}

async function loginByWechatCode(userInfo) {
  const code = await wxLogin()
  const app = getApp()
  const referrerId = typeof app.getPendingReferrerId === 'function'
    ? app.getPendingReferrerId()
    : wx.getStorageSync('pendingReferrerId')
  const payload = { code, referrerId }
  if (userInfo) {
    payload.userInfo = sanitizeUserInfoForLogin(userInfo)
  }
  return post('/api/auth/wx-login', payload)
}

function sanitizeUserInfoForLogin(userInfo) {
  if (!userInfo || !isLocalFilePath(userInfo.avatarUrl)) {
    return userInfo
  }
  return {
    ...userInfo,
    avatarUrl: '',
  }
}

function loginWithWechat(userInfo) {
  return loginByWechatCode(userInfo)
}

function silentLoginWithWechat() {
  return loginByWechatCode()
}

function getCurrentUser() {
  return get('/api/auth/me')
}

async function updateProfile(data) {
  const payload = { ...(data || {}) }
  if (payload.avatarUrl) {
    payload.avatarUrl = await uploadFileIfNeeded(payload.avatarUrl)
  }
  return put('/api/auth/profile', payload)
}

module.exports = { loginWithWechat, silentLoginWithWechat, getCurrentUser, updateProfile }

