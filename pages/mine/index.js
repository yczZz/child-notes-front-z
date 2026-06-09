// pages/mine/index.js
const babyService = require('../../services/baby')
const authService = require('../../services/auth')
const uploadService = require('../../services/upload')
const smartAnalysisService = require('../../services/smartAnalysis')
const { FAMILY_ROLES } = require('../../constants/roles')
const app = getApp()

Page({
  data: {
    userInfo: {},
    userRole: '共同记录者',
    babyName: '',
    isLogin: false,
    loginLoading: false,
    showLoginSheet: false,
    babyList: [],
    currentBabyId: '',
    showBabyInfoSheet: false,
    showRoleSheet: false,
    roleSheetMode: '',
    roleSheetTitle: '选择你的身份',
    roleSheetDesc: '用于标记你和宝宝的关系，后续可在家人管理里修改。',
    familyRoleOptions: FAMILY_ROLES,
    selectedRoleIndex: 0,
    showProfileEditor: false,
    profileForm: {
      nickName: '',
      avatarUrl: '',
    },
    profileSaving: false,

    showBabyEditor: false,
    babyEditorBackToList: false,
    babyForm: {
      id: '',
      name: '',
      avatar: '',
      birthDate: '',
      gender: 'boy',
      familyRoleCode: '',
      familyRoleName: '',
    },
    babySaving: false,
    babyAvatarUploading: false,
    todayStr: '',

    agreedPrivacy: false,
    showSmartSheet: false,
    smartLoading: false,
    smartGenerating: false,
    smartStartDate: '',
    smartEndDate: '',
    smartRangeValid: true,
    smartRangeTip: '',
    smartCanGenerateRange: true,
    smartRecords: [],
    smartDetail: null,
  },

  onLoad() {
    const todayStr = this.getTodayString()
    const defaultRange = this.getDefaultSmartRange(todayStr)
    this.setData({
      todayStr,
      smartStartDate: defaultRange.startDate,
      smartEndDate: defaultRange.endDate,
      smartRangeTip: '将分析该连续 7 天内的记录',
    })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this.loadData()
  },

  async loadData() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const isLogin = !!(app.globalData.token || wx.getStorageSync('token'))
    if (!isLogin) {
      this.setData({
        userInfo: {},
        isLogin: false,
        babyName: '',
        babyList: [],
        currentBabyId: '',
        showBabyInfoSheet: false,
        showRoleSheet: false,
        roleSheetMode: '',
        babyEditorBackToList: false,
        showProfileEditor: false,
        showSmartSheet: false,
        smartDetail: null,
        smartRecords: [],
        smartCanGenerateRange: true,
      }, () => {
        const hasPendingReferrer = typeof app.getPendingReferrerId === 'function' && app.getPendingReferrerId()
        const hasPendingFamilyInvite = typeof app.hasPendingFamilyInvite === 'function'
          ? app.hasPendingFamilyInvite()
          : !!(app.globalData.pendingFamilyInvite && app.globalData.pendingFamilyInvite.babyId)
        if ((hasPendingReferrer || hasPendingFamilyInvite) && !app.globalData.familyInviteProcessing) {
          this.openLoginSheet()
        }
      })
      return
    }
    if (isLogin && !app.globalData.token) {
      app.globalData.token = wx.getStorageSync('token')
      app.globalData.isLogin = true
    }
    if (isLogin && !app.globalData.userInfo) {
      app.globalData.userInfo = userInfo
    }

    let currentBaby = app.globalData.currentBaby
    let babyList = app.globalData.babyList || []
    try {
      const session = await babyService.loadBabySession()
      currentBaby = session.currentBaby
      babyList = session.babyList
    } catch (e) {
      console.warn('load baby failed:', e)
      if (e && e.statusCode === 404) {
        currentBaby = null
        app.globalData.currentBaby = null
      }
      if (!(app.globalData.token || wx.getStorageSync('token'))) {
        this.setData({
          userInfo: {},
          isLogin: false,
          babyName: '',
          babyList: [],
          currentBabyId: '',
          showBabyInfoSheet: false,
          showRoleSheet: false,
          roleSheetMode: '',
          showProfileEditor: false,
          showSmartSheet: false,
          smartDetail: null,
          smartRecords: [],
          smartCanGenerateRange: true,
        })
        return
      }
    }
    this.setData({
      userInfo,
      isLogin,
      babyList,
      currentBabyId: currentBaby ? currentBaby.id : '',
      babyName: currentBaby ? currentBaby.name : '',
    })
    if (app.globalData.pendingAddBaby) {
      app.globalData.pendingAddBaby = false
      this.openBabyEditor()
    }
  },

  onUserCardTap() {
    if (this.data.isLogin) {
      this.openProfileEditor()
    } else {
      this.openLoginSheet()
    }
  },

  openLoginSheet() {
    if (this.data.loginLoading) return
    this.setData({
      showLoginSheet: true,
      agreedPrivacy: !!wx.getStorageSync('privacyAgreed'),
    })
  },

  closeLoginSheet() {
    if (this.data.loginLoading) return
    this.setData({ showLoginSheet: false })
  },

  onTogglePrivacyAgreement() {
    this.setData({ agreedPrivacy: !this.data.agreedPrivacy })
  },

  onOpenPrivacyContract(e) {
    if (typeof wx.openPrivacyContract === 'function') {
      wx.openPrivacyContract({
        success: () => {
          // 用户从隐私协议页面返回
        },
        fail: (err) => {
          console.warn('openPrivacyContract failed:', err)
        },
      })
    }
  },

  requestWechatProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于展示头像和昵称',
        success: resolve,
        fail: reject,
      })
    })
  },

  async onLogin() {
    if (this.data.loginLoading) return
    if (!this.data.agreedPrivacy) {
      wx.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' })
      return
    }
    if (!wx.getUserProfile) {
      wx.showToast({ title: '当前微信版本不支持授权', icon: 'none' })
      return
    }

    this.setData({ loginLoading: true })
    wx.showLoading({ title: '正在唤起授权', mask: true })
    try {
      wx.setStorageSync('privacyAgreed', true)
      const profile = await this.requestWechatProfile()
      const profileUserInfo = profile.userInfo || {}
      const localAvatarUrl = uploadService.isLocalFilePath(profileUserInfo.avatarUrl)
        ? profileUserInfo.avatarUrl
        : ''
      wx.showLoading({ title: '正在登录', mask: true })
      const loginRes = await authService.loginWithWechat(profileUserInfo)
      if (!loginRes || !loginRes.token) {
        throw new Error('login response missing token')
      }
      const userInfo = loginRes.userInfo || profileUserInfo
      this.applyUserInfo(userInfo, loginRes.token)
      let avatarUploadFailed = false
      if (localAvatarUrl) {
        wx.showLoading({ title: '正在上传头像', mask: true })
        try {
          const profileUpdate = { avatarUrl: localAvatarUrl }
          if (userInfo.nickName) {
            profileUpdate.nickName = userInfo.nickName
          }
          const updatedUserInfo = await authService.updateProfile(profileUpdate)
          this.applyUserInfo(updatedUserInfo)
        } catch (avatarError) {
          avatarUploadFailed = true
          console.warn('upload login avatar failed:', avatarError)
        }
      }
      if (typeof app.clearPendingReferrerId === 'function') {
        app.clearPendingReferrerId()
      }
      this.setData({ showLoginSheet: false })
      if (typeof app.processPendingFamilyInvite === 'function') {
        await app.processPendingFamilyInvite()
      }
      this.loadData()
      wx.hideLoading()
      wx.showModal({
        title: '登录成功',
        content: avatarUploadFailed
          ? '微信授权已完成，头像上传失败，可稍后在编辑资料里重试。'
          : '微信授权已完成，宝宝记录会同步到当前账号。',
        showCancel: false,
        confirmText: '知道了',
      })
    } catch (e) {
      console.warn('login failed:', e)
      wx.hideLoading()
      const errMsg = (e && e.errMsg) || ''
      const isCancel = errMsg.includes('cancel') || errMsg.includes('deny')
      wx.showToast({ title: isCancel ? '已取消授权' : '登录失败', icon: 'none' })
    } finally {
      this.setData({ loginLoading: false })
    }
  },

  openProfileEditor() {
    const userInfo = this.data.userInfo || {}
    this.setData({
      showProfileEditor: true,
      profileForm: {
        nickName: userInfo.nickName || '',
        avatarUrl: userInfo.avatarUrl || '',
      },
    })
  },

  closeProfileEditor() {
    if (this.data.profileSaving) return
    this.setData({ showProfileEditor: false })
  },

  stopTap() {},

  stopTouchMove() {},

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    if (!avatarUrl) return
    this.setData({ 'profileForm.avatarUrl': avatarUrl })
  },

  onNickNameInput(e) {
    this.setData({ 'profileForm.nickName': e.detail.value })
  },

  async onSaveProfile() {
    const form = this.data.profileForm
    const nickName = (form.nickName || '').trim()
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    this.setData({ profileSaving: true })
    try {
      const userInfo = await authService.updateProfile({
        nickName,
        avatarUrl: form.avatarUrl || '',
      })
      this.applyUserInfo(userInfo)
      this.setData({ showProfileEditor: false })
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {
      console.warn('save profile failed:', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ profileSaving: false })
    }
  },

  applyUserInfo(userInfo, token) {
    app.globalData.userInfo = userInfo
    app.globalData.isLogin = true
    if (token) {
      app.globalData.token = token
      wx.setStorageSync('token', token)
      app.globalData.babyList = []
      if (typeof app.setCurrentBaby === 'function') {
        app.setCurrentBaby(null)
      } else {
        app.globalData.currentBaby = null
        wx.removeStorageSync('currentBaby')
        wx.removeStorageSync('currentBabyId')
      }
    }
    wx.setStorageSync('userInfo', userInfo)
    this.setData({ userInfo, isLogin: true })
  },

  // ==================== 菜单点击 ====================
  onAddBaby() {
    if (!this.data.isLogin) {
      this.openLoginSheet()
      return
    }
    this.openBabyEditor({}, { backToList: this.data.showBabyInfoSheet })
  },

  openBabyEditor(baby = {}, options = {}) {
    this.setData({
      showBabyEditor: true,
      showBabyInfoSheet: false,
      showRoleSheet: false,
      babyEditorBackToList: !!options.backToList,
      babyAvatarUploading: false,
      babyForm: {
        id: baby.id || '',
        name: baby.name || '',
        avatar: baby.avatar || '',
        birthDate: baby.birthDate || '',
        gender: baby.gender || 'boy',
        familyRoleCode: baby.familyRoleCode || '',
        familyRoleName: baby.familyRoleName || '',
      },
    })
  },

  closeBabyEditor() {
    if (this.data.babySaving || this.data.babyAvatarUploading) return
    this.setData({
      showBabyEditor: false,
      babyEditorBackToList: false,
      showRoleSheet: false,
    })
  },

  backToBabyInfoSheet() {
    if (this.data.babySaving || this.data.babyAvatarUploading) return
    this.setData({
      showBabyEditor: false,
      showBabyInfoSheet: true,
      babyEditorBackToList: false,
    })
  },

  async openBabyInfoSheet() {
    if (!this.data.isLogin) {
      this.openLoginSheet()
      return
    }
    try {
      const session = await babyService.loadBabySession()
      this.setData({
        babyList: session.babyList,
        currentBabyId: session.currentBaby ? session.currentBaby.id : '',
        babyName: session.currentBaby ? session.currentBaby.name : '',
        showBabyInfoSheet: true,
      })
    } catch (e) {
      console.warn('load baby list failed:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  closeBabyInfoSheet() {
    this.setData({ showBabyInfoSheet: false })
  },

  onEditBabyTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const baby = this.data.babyList.find(item => Number(item.id) === id)
    if (!baby) return
    this.openBabyEditor(baby, { backToList: true })
  },

  onBabyNameInput(e) {
    this.setData({ 'babyForm.name': e.detail.value })
  },

  onChooseBabyAvatar() {
    if (this.data.babyAvatarUploading) return
    const { uploadFile } = require('../../services/upload')
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFilePaths && res.tempFilePaths[0]
        if (!filePath) return
        this.setData({ babyAvatarUploading: true })
        try {
          const url = await uploadFile(filePath)
          this.setData({ 'babyForm.avatar': url })
        } catch (e) {
          console.warn('upload baby avatar failed:', e)
          wx.showToast({ title: '头像上传失败', icon: 'none' })
        } finally {
          this.setData({ babyAvatarUploading: false })
        }
      },
      fail: (e) => {
        const errMsg = (e && e.errMsg) || ''
        if (!errMsg.includes('cancel')) {
          wx.showToast({ title: '选择头像失败', icon: 'none' })
        }
      },
    })
  },

  onBabyBirthChange(e) {
    this.setData({ 'babyForm.birthDate': e.detail.value })
  },

  onBabyGenderTap(e) {
    this.setData({ 'babyForm.gender': e.currentTarget.dataset.gender })
  },

  async onSaveBaby() {
    if (this.data.babyAvatarUploading) {
      wx.showToast({ title: '头像上传中', icon: 'none' })
      return
    }
    if (!this.validateBabyForm()) {
      return
    }
    const { id, familyRoleCode } = this.data.babyForm
    if (!id && this.data.babyList.length === 0 && !familyRoleCode) {
      this.openRoleSheet('createBaby')
      return
    }
    await this.saveBabyWithCurrentForm()
  },

  validateBabyForm() {
    const { name, birthDate } = this.data.babyForm
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' })
      return false
    }
    if (!birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return false
    }
    return true
  },

  async saveBabyWithCurrentForm() {
    const { id, name, avatar, birthDate, gender, familyRoleCode, familyRoleName } = this.data.babyForm
    this.setData({ babySaving: true })
    try {
      const payload = {
        name: name.trim(),
        avatar: avatar || '',
        birthDate,
        gender,
      }
      if (id) {
        payload.id = id
      } else if (familyRoleCode) {
        payload.roleCode = familyRoleCode
        payload.roleName = familyRoleName
      }
      const baby = id
        ? await babyService.updateBabyInfo(payload)
        : await babyService.addBaby(payload)
      const shouldSetCurrent = !id || Number(id) === Number(babyService.getCurrentBabyId())
      if (shouldSetCurrent && typeof app.setCurrentBaby === 'function') {
        app.setCurrentBaby(baby)
      } else if (shouldSetCurrent) {
        app.globalData.currentBaby = baby
      }
      wx.showToast({ title: id ? '保存成功' : '添加成功', icon: 'success' })
      this.setData({
        showBabyEditor: false,
        showBabyInfoSheet: false,
        babyEditorBackToList: false,
        babyName: shouldSetCurrent ? baby.name : this.data.babyName,
      })
      this.loadData()
    } catch (e) {
      console.warn('save baby failed:', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ babySaving: false })
    }
  },

  openRoleSheet(mode) {
    this.setData({
      showRoleSheet: true,
      roleSheetMode: mode,
      selectedRoleIndex: 0,
      roleSheetTitle: '你是宝宝的谁',
      roleSheetDesc: '首次添加宝宝时先选身份，后续可在家人管理里修改。',
    })
  },

  closeRoleSheet() {
    if (this.data.babySaving) return
    this.setData({
      showRoleSheet: false,
      roleSheetMode: '',
    })
  },

  onRolePickerChange(e) {
    this.setData({ selectedRoleIndex: Number(e.detail.value) })
  },

  async onConfirmRole() {
    if (this.data.babySaving) return
    const role = this.data.familyRoleOptions[this.data.selectedRoleIndex]
    if (!role || this.data.roleSheetMode !== 'createBaby') return
    this.setData({
      'babyForm.familyRoleCode': role.code,
      'babyForm.familyRoleName': role.name,
      showRoleSheet: false,
      roleSheetMode: '',
    })
    await this.saveBabyWithCurrentForm()
  },

  onFamily() {
    if (!this.data.isLogin) {
      this.openLoginSheet()
      return
    }
    wx.navigateTo({ url: '/pages/family/index' })
  },

  onSmartAnalysis() {
    if (!this.data.isLogin) {
      this.openLoginSheet()
      return
    }
    if (!this.data.currentBabyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    const range = this.ensureSmartDefaultRange()
    const rangeState = this.getSmartRangeState(range.startDate, range.endDate, [])
    this.setData({
      showSmartSheet: true,
      smartDetail: null,
      smartLoading: true,
      smartRecords: [],
      smartStartDate: range.startDate,
      smartEndDate: range.endDate,
      ...rangeState,
    })
    clearTimeout(this.smartLoadTimer)
    this.smartLoadTimer = setTimeout(() => {
      this.loadSmartRecords(true)
    }, 180)
  },

  closeSmartSheet() {
    clearTimeout(this.smartLoadTimer)
    this.setData({
      showSmartSheet: false,
      smartDetail: null,
    })
  },

  backToSmartList() {
    this.setData({ smartDetail: null })
  },

  async loadSmartRecords(force = false) {
    if (this.data.smartLoading && !force) return
    if (!this.data.smartLoading) {
      this.setData({ smartLoading: true })
    }
    try {
      const records = await smartAnalysisService.getAnalysisList()
      const normalizedRecords = (records || []).map(item => this.normalizeSmartRecord(item))
      const rangeState = this.getSmartRangeState(this.data.smartStartDate, this.data.smartEndDate, normalizedRecords)
      this.setData({
        smartRecords: normalizedRecords,
        ...rangeState,
      })
    } catch (e) {
      console.warn('load smart analysis failed:', e)
      wx.showToast({ title: '加载分析失败', icon: 'none' })
    } finally {
      this.setData({ smartLoading: false })
    }
  },

  async onGenerateSmartAnalysis() {
    if (this.data.smartGenerating) return
    if (!this.data.currentBabyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    const rangeState = this.getSmartRangeState(this.data.smartStartDate, this.data.smartEndDate, this.data.smartRecords)
    if (!rangeState.smartRangeValid) {
      this.setData(rangeState)
      wx.showToast({ title: rangeState.smartRangeTip, icon: 'none' })
      return
    }
    if (!rangeState.smartCanGenerateRange) {
      this.setData(rangeState)
      wx.showToast({ title: '该区间已分析过', icon: 'none' })
      return
    }
    const startDate = this.data.smartStartDate
    const endDate = this.data.smartEndDate
    this.setData({ smartGenerating: true })
    wx.showLoading({ title: '正在分析', mask: true })
    try {
      const record = await smartAnalysisService.generateAnalysis({ startDate, endDate })
      const item = this.normalizeSmartRecord(record)
      const records = [item].concat((this.data.smartRecords || []).filter(oldItem => oldItem.id !== item.id))
      const nextRangeState = this.getSmartRangeState(startDate, endDate, records)
      this.setData({
        smartRecords: records,
        smartDetail: item,
        ...nextRangeState,
      })
      wx.hideLoading()
      wx.showToast({ title: '分析完成', icon: 'success' })
    } catch (e) {
      console.warn('generate smart analysis failed:', e)
      wx.hideLoading()
      wx.showToast({ title: '分析失败', icon: 'none' })
    } finally {
      this.setData({ smartGenerating: false })
    }
  },

  async onSmartRecordTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (!id) return
    const cached = (this.data.smartRecords || []).find(item => Number(item.id) === id)
    if (cached) {
      this.setData({ smartDetail: cached })
    }
    try {
      const detail = await smartAnalysisService.getAnalysisDetail(id)
      this.setData({ smartDetail: this.normalizeSmartRecord(detail) })
    } catch (err) {
      console.warn('load smart analysis detail failed:', err)
      wx.showToast({ title: '加载详情失败', icon: 'none' })
    }
  },

  normalizeSmartRecord(record = {}) {
    const analysisText = record.analysisText || ''
    const rangeStart = record.rangeStartDate || ''
    const rangeEnd = record.rangeEndDate || ''
    return {
      ...record,
      analysisText,
      analysisBlocks: this.parseSmartMarkdown(analysisText),
      preview: this.makeSmartPreview(analysisText),
      rangeLabel: rangeStart && rangeEnd ? `${rangeStart} 至 ${rangeEnd}` : '最近一周',
      dataQualityTip: record.dataQualityTip || '',
      createdAtLabel: record.createdAt || '',
    }
  },

  hasSmartRecordForRange(records = [], startDate, endDate) {
    return records.some(item => item && item.rangeStartDate === startDate && item.rangeEndDate === endDate)
  },

  onSmartStartDateChange(e) {
    const startDate = e.detail.value
    const rangeState = this.getSmartRangeState(startDate, this.data.smartEndDate, this.data.smartRecords)
    this.setData({
      smartStartDate: startDate,
      ...rangeState,
    })
  },

  onSmartEndDateChange(e) {
    const endDate = e.detail.value
    const rangeState = this.getSmartRangeState(this.data.smartStartDate, endDate, this.data.smartRecords)
    this.setData({
      smartEndDate: endDate,
      ...rangeState,
    })
  },

  ensureSmartDefaultRange() {
    if (this.data.smartStartDate && this.data.smartEndDate) {
      return {
        startDate: this.data.smartStartDate,
        endDate: this.data.smartEndDate,
      }
    }
    const todayStr = this.data.todayStr || this.getTodayString()
    return this.getDefaultSmartRange(todayStr)
  },

  getDefaultSmartRange(todayStr) {
    return {
      startDate: this.addDateDays(todayStr, -6),
      endDate: todayStr,
    }
  },

  getSmartRangeState(startDate, endDate, records = []) {
    const days = this.getInclusiveDays(startDate, endDate)
    let smartRangeTip = '请选择连续 7 天作为分析区间'
    let smartRangeValid = false
    if (days < 0) {
      smartRangeTip = '结束日期不能早于开始日期'
    } else if (days === 7) {
      smartRangeTip = '将分析该连续 7 天内的记录'
      smartRangeValid = true
    } else if (days > 7) {
      smartRangeTip = '分析区间不能超过 7 天'
    } else if (days > 0) {
      smartRangeTip = '分析区间不能少于 7 天'
    }
    const smartCanGenerateRange = smartRangeValid && !this.hasSmartRecordForRange(records, startDate, endDate)
    if (smartRangeValid && !smartCanGenerateRange) {
      smartRangeTip = '该区间已经生成过分析'
    }
    return {
      smartRangeValid,
      smartRangeTip,
      smartCanGenerateRange,
    }
  },

  getInclusiveDays(startDate, endDate) {
    const start = this.parseDateString(startDate)
    const end = this.parseDateString(endDate)
    if (!start || !end) return 0
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
    return diff < 0 ? -1 : diff + 1
  },

  addDateDays(dateStr, days) {
    const date = this.parseDateString(dateStr) || new Date()
    date.setDate(date.getDate() + days)
    return this.formatDateString(date)
  },

  parseDateString(value) {
    if (!value) return null
    const parts = String(value).split('-').map(part => Number(part))
    if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) return null
    return new Date(parts[0], parts[1] - 1, parts[2])
  },

  formatDateString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  getTodayString() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  makeSmartPreview(text) {
    const preview = this.stripMarkdown(text).replace(/\s+/g, ' ').trim()
    return preview.length > 72 ? `${preview.slice(0, 72)}...` : preview
  },

  parseSmartMarkdown(text = '') {
    const blocks = []
    let paragraph = []

    const flushParagraph = () => {
      const content = paragraph.join('\n').trim()
      if (content) {
        blocks.push({
          type: 'paragraph',
          text: this.stripMarkdown(content),
        })
      }
      paragraph = []
    }

    String(text || '').replace(/\r/g, '').split('\n').forEach((rawLine) => {
      const line = rawLine.trim()
      if (!line) {
        flushParagraph()
        return
      }

      const heading = line.match(/^(#{1,6})\s*(.+)$/)
      if (heading) {
        flushParagraph()
        const level = Math.min(3, heading[1].length)
        blocks.push({
          type: 'heading',
          text: this.stripMarkdown(heading[2]),
          className: `level-${level}`,
        })
        return
      }

      const sectionHeading = line.match(/^(本周概览|本月概览|与上次对比|与上周对比|对比变化|重点观察|个性化建议|需要留意|接下来\s*7\s*天)[:：]\s*(.*)$/) ||
        line.match(/^(本周概览|本月概览|与上次对比|与上周对比|对比变化|重点观察|个性化建议|需要留意|接下来\s*7\s*天)$/)
      if (sectionHeading) {
        flushParagraph()
        blocks.push({
          type: 'heading',
          text: this.stripMarkdown(sectionHeading[1]),
          className: 'level-2',
        })
        if (sectionHeading[2]) {
          paragraph.push(sectionHeading[2])
        }
        return
      }

      const bullet = line.match(/^[-*+]\s+(.+)$/) || line.match(/^\d+[\.、)]\s*(.+)$/)
      if (bullet) {
        flushParagraph()
        blocks.push({
          type: 'bullet',
          text: this.stripMarkdown(bullet[1]),
        })
        return
      }

      paragraph.push(line)
    })

    flushParagraph()
    const result = blocks.length ? blocks : [{ type: 'paragraph', text: '暂无分析内容' }]
    return result.map((block, index) => ({
      ...block,
      id: index,
      isHeading: block.type === 'heading',
      isBullet: block.type === 'bullet',
    }))
  },

  stripMarkdown(text = '') {
    return String(text || '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+[\.、)]\s*/gm, '')
      .trim()
  },

  onSettings() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onAgreement() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onPrivacy() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onAbout() {
    wx.showModal({
      title: '关于成长记录',
      content: '新生儿成长记录小程序\n版本 v1.0.0\n\n记录宝宝成长的每一个瞬间',
      showCancel: false,
    })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          if (typeof app.clearAuthSession === 'function') {
            app.clearAuthSession()
          } else {
            app.globalData.userInfo = null
            app.globalData.isLogin = false
            app.globalData.token = ''
            app.globalData.currentBaby = null
            app.globalData.babyList = []
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
          }
          this.setData({
            showLoginSheet: false,
            showProfileEditor: false,
            showBabyInfoSheet: false,
            showBabyEditor: false,
            showRoleSheet: false,
            showSmartSheet: false,
            smartDetail: null,
            smartRecords: [],
            smartCanGenerateRange: true,
            babyEditorBackToList: false,
            roleSheetMode: '',
          })
          this.loadData()
        }
      },
    })
  },
})
