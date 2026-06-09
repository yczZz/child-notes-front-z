/**
 * API 请求封装
 * 后端使用 Response<T> 统一包装：{ state, msg, data }
 */

const config = require('../config/index')

const BASE_URL = config.apiBaseUrl
const SUCCESS_STATES = ['000000', 'ok']

/**
 * 解析后端 Response 包装
 * 成功时返回 data，失败时弹出 msg 并 reject
 */
function unwrapResponse(responseBody) {
  if (!responseBody) {
    wx.showToast({ title: '响应为空', icon: 'none' })
    return Promise.reject(new Error('empty response'))
  }

  // 后端 Response<T> 格式
  const { state, msg, data } = responseBody

  if (state && SUCCESS_STATES.includes(String(state).toLowerCase())) {
    return Promise.resolve(data)
  }

  // 失败：弹出后端返回的 msg
  wx.showToast({ title: msg || '请求失败', icon: 'none' })
  return Promise.reject(new Error(msg || 'request failed'))
}

/**
 * 通用请求方法
 */
const request = (url, options = {}) => {
  const method = options.method || 'GET'
  const data = options.data || {}

  // Mock 模式：直接返回 options.mockData（仍需解包）
  if (config.useMockApi || !BASE_URL) {
    console.warn(`[mock api] ${method} ${url}`)
    return Promise.resolve(options.mockData === undefined ? null : options.mockData)
  }

  console.log(`[api] ${method} ${BASE_URL}${url}`, JSON.stringify(data))
  return new Promise((resolve, reject) => {
    wx.getStorage({
      key: 'token',
      complete(storageRes) {
        const app = getApp()
        const babyId = typeof app.getCurrentBabyId === 'function'
          ? app.getCurrentBabyId()
          : wx.getStorageSync('currentBabyId')
        wx.request({
          url: `${BASE_URL}${url}`,
          method,
          data,
          header: {
            'Content-Type': 'application/json',
            Authorization: storageRes.data ? `Bearer ${storageRes.data}` : '',
            ...(babyId ? { 'X-Baby-Id': String(babyId) } : {}),
            ...options.header,
          },
          success(res) {
            if (res.statusCode === 200) {
              unwrapResponse(res.data).then(resolve).catch(reject)
            } else if (res.statusCode === 401) {
              if (typeof app.clearAuthSession === 'function') {
                app.clearAuthSession()
              } else {
                wx.removeStorage({ key: 'token' })
                app.globalData.token = ''
                app.globalData.isLogin = false
              }
              reject(res)
            } else if (res.statusCode === 404) {
              // 资源不存在（如没有宝宝），静默 reject 让调用方处理
              reject(res)
            } else {
              wx.showToast({ title: '网络异常', icon: 'none' })
              reject(res)
            }
          },
          fail(err) {
            wx.showToast({ title: '网络异常', icon: 'none' })
            reject(err)
          },
        })
      },
    })
  })
}

const get = (url, data) => request(url, { method: 'GET', data })
const post = (url, data) => request(url, { method: 'POST', data })
const put = (url, data) => request(url, { method: 'PUT', data })
const del = (url, data) => request(url, { method: 'DELETE', data })

module.exports = { get, post, put, del, request }
