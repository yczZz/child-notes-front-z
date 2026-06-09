// app.js - 新生儿成长记录小程序
const babyService = require('./services/baby')

App({
  onLaunch(options) {
    this.initSystemInfo()
    this.checkLoginStatus()
    this.captureInviteParams(options)
    this.handlePendingInviteOnOpen()
  },

  onShow(options) {
    this.captureInviteParams(options)
    this.handlePendingInviteOnOpen()
  },

  initSystemInfo() {
    try {
      const windowInfo = wx.getWindowInfo()
      const deviceInfo = wx.getDeviceInfo()
      this.globalData.statusBarHeight = windowInfo.statusBarHeight
      this.globalData.navBarHeight = deviceInfo.platform === 'android' ? 48 : 44
      this.globalData.systemInfo = {
        ...windowInfo,
        ...deviceInfo,
      }
    } catch (e) {
      console.warn('initSystemInfo failed:', e)
    }
  },

  checkLoginStatus() {
    wx.getStorage({
      key: 'token',
      success: (res) => {
        if (res.data) {
          this.globalData.isLogin = true
          this.globalData.token = res.data
        }
      },
    })
  },

  captureInviteParams(options) {
    if (!options || !options.query) return
    const { inviteBabyId, inviteRoleCode, inviteRoleName, referrer_id: referrerId, referrerId: camelReferrerId } = options.query
    const pendingReferrerId = referrerId || camelReferrerId
    if (pendingReferrerId) {
      const decodedReferrerId = decodeURIComponent(pendingReferrerId)
      this.globalData.pendingReferrerId = decodedReferrerId
      wx.setStorageSync('pendingReferrerId', decodedReferrerId)
    }
    if (inviteBabyId) {
      this.globalData.pendingFamilyInvite = {
        babyId: inviteBabyId,
        roleCode: inviteRoleCode || '',
        roleName: inviteRoleName ? decodeURIComponent(inviteRoleName) : '',
      }
    }
  },

  getPendingReferrerId() {
    return this.globalData.pendingReferrerId || wx.getStorageSync('pendingReferrerId') || ''
  },

  clearPendingReferrerId() {
    this.globalData.pendingReferrerId = ''
    wx.removeStorageSync('pendingReferrerId')
  },

  hasAuthToken() {
    const token = this.globalData.token || wx.getStorageSync('token')
    if (token && !this.globalData.token) {
      this.globalData.token = token
      this.globalData.isLogin = true
    }
    return !!token
  },

  applyAuthSession(loginRes) {
    if (!loginRes || !loginRes.token) return
    this.globalData.token = loginRes.token
    this.globalData.isLogin = true
    this.globalData.userInfo = loginRes.userInfo || null
    this.globalData.babyList = []
    this.setCurrentBaby(null)
    wx.setStorageSync('token', loginRes.token)
    if (loginRes.userInfo) {
      wx.setStorageSync('userInfo', loginRes.userInfo)
    }
  },

  hasPendingPointsInvite() {
    return !!this.getPendingReferrerId()
  },

  clearPendingFamilyInvite() {
    this.globalData.pendingFamilyInvite = null
  },

  hasPendingFamilyInvite() {
    const invite = this.globalData.pendingFamilyInvite
    return !!(invite && invite.babyId)
  },

  handlePendingInviteOnOpen() {
    const hasFamilyInvite = this.hasPendingFamilyInvite()
    const hasPointsInvite = this.hasPendingPointsInvite()
    if ((!hasFamilyInvite && !hasPointsInvite) || this.globalData.familyInviteProcessing) return

    if (this.hasAuthToken()) {
      this.clearPendingReferrerId()
      if (hasFamilyInvite) {
        this.processPendingFamilyInvite()
      }
      return
    }

    this.openInviteLoginPage()
  },

  openInviteLoginPage() {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const currentPage = pages && pages.length ? pages[pages.length - 1] : null
    if (currentPage && currentPage.route === 'pages/mine/index') {
      return
    }
    setTimeout(() => {
      wx.switchTab({ url: '/pages/mine/index' })
    }, 80)
  },

  refreshCurrentPage() {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const currentPage = pages && pages.length ? pages[pages.length - 1] : null
    if (currentPage && typeof currentPage.loadData === 'function') {
      currentPage.loadData()
    }
  },

  async processPendingFamilyInvite() {
    const invite = this.globalData.pendingFamilyInvite
    if (!invite || !invite.babyId) return
    if (this.globalData.familyInviteProcessing) return
    if (!this.hasAuthToken()) return

    const inviteBabyId = invite.babyId
    this.globalData.familyInviteProcessing = true
    try {
      await babyService.joinFamilyViaInvite({
        babyId: inviteBabyId,
        roleCode: invite.roleCode,
        roleName: invite.roleName,
      })
      this.clearPendingFamilyInvite()
      await this.refreshBabySessionAfterInvite(inviteBabyId)
      this.refreshCurrentPage()
      wx.showToast({ title: '已加入宝宝家庭', icon: 'success' })
    } catch (e) {
      console.warn('join family via invite failed:', e)
      // 可能已加入或邀请过期，静默清除
      this.clearPendingFamilyInvite()
    } finally {
      this.globalData.familyInviteProcessing = false
    }
  },

  async refreshBabySessionAfterInvite(inviteBabyId) {
    try {
      const list = await babyService.getBabyList()
      const babyList = Array.isArray(list) ? list : []
      this.globalData.babyList = babyList
      const targetBaby = babyList.find(item => String(item.id) === String(inviteBabyId))
      this.setCurrentBaby(targetBaby || babyList[0] || null)
    } catch (e) {
      console.warn('refresh baby session after invite failed:', e)
    }
  },

  clearAuthSession() {
    this.globalData.userInfo = null
    this.globalData.isLogin = false
    this.globalData.token = ''
    this.globalData.currentBaby = null
    this.globalData.babyList = []
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('currentBaby')
    wx.removeStorageSync('currentBabyId')
    wx.removeStorageSync('pendingReferrerId')
  },

  // 获取当前宝宝信息
  getCurrentBaby() {
    return this.globalData.currentBaby || wx.getStorageSync('currentBaby') || null
  },

  getCurrentBabyId() {
    const baby = this.getCurrentBaby()
    return baby && baby.id ? baby.id : (wx.getStorageSync('currentBabyId') || '')
  },

  setCurrentBaby(baby) {
    this.globalData.currentBaby = baby || null
    if (baby && baby.id) {
      wx.setStorageSync('currentBaby', baby)
      wx.setStorageSync('currentBabyId', baby.id)
    } else {
      wx.removeStorageSync('currentBaby')
      wx.removeStorageSync('currentBabyId')
    }
  },

  globalData: {
    userInfo: null,
    isLogin: false,
    token: '',
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 44,
    currentBaby: null,
    babyList: [],
    pendingAddBaby: false,
    pendingFamilyInvite: null,
    pendingReferrerId: '',
    familyInviteProcessing: false,
  },
})
