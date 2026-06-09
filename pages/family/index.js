const babyService = require('../../services/baby')
const { FAMILY_ROLES } = require('../../constants/roles')
const app = getApp()
const SHARE_IMAGE_URL = '/image/logo.png'

Page({
  data: {
    FAMILY_ROLES,
    familyGroups: [],
    familyMembers: [],
    loading: false,
    showRoleSheet: false,
    selectedMemberKey: '',
    selectedBabyIds: [],
    selectedRoleIndex: 0,
    roleSaving: false,
    showInviteSheet: false,
    inviteRoleIndex: 0,
  },

  onLoad() {
    this.ensureLogin()
  },

  onShow() {
    if (this.ensureLogin()) {
      this.loadFamilyMembers()
    }
  },

  onPullDownRefresh() {
    this.loadFamilyMembers().finally(() => wx.stopPullDownRefresh())
  },

  ensureLogin() {
    const isLogin = !!(app.globalData.token || wx.getStorageSync('token'))
    if (!isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.navigateBack({ delta: 1 }), 500)
      return false
    }
    if (!app.globalData.token) {
      app.globalData.token = wx.getStorageSync('token')
      app.globalData.isLogin = true
    }
    return true
  },

  async loadFamilyMembers() {
    if (!this.ensureLogin()) return
    this.setData({ loading: true })
    try {
      const groups = await babyService.getFamilyMembers()
      const safeGroups = Array.isArray(groups) ? groups : []
      const familyMembers = []
      const memberByUser = {}
      for (const group of safeGroups) {
        for (const member of (group.members || [])) {
          const memberKey = String(member.userId || `member-${member.memberId}`)
          const babyId = group.babyId
          const babyName = group.babyName
          const existing = memberByUser[memberKey]
          if (existing) {
            if (babyId && !existing.babyIds.some(id => String(id) === String(babyId))) {
              existing.babyIds.push(babyId)
            }
            if (babyName && !existing.babyNames.includes(babyName)) {
              existing.babyNames.push(babyName)
            }
            if (member.roleCode && !existing.roleCodes.includes(member.roleCode)) {
              existing.roleCodes.push(member.roleCode)
            }
            if (member.roleName && !existing.roleNames.includes(member.roleName)) {
              existing.roleNames.push(member.roleName)
            }
            existing.owner = !!(existing.owner || member.owner)
            existing.mine = !!(existing.mine || member.mine)
            existing.lastLoginTime = this.pickLatestTime(existing.lastLoginTime, member.lastLoginTime)
            existing.lastLoginText = this.formatTime(existing.lastLoginTime)
            existing.roleCode = existing.roleCodes[0] || member.roleCode || ''
            existing.roleName = existing.roleNames.length > 1 ? existing.roleNames.join(' / ') : (existing.roleNames[0] || member.roleName || '')
            existing.babyName = existing.babyNames.join('、')
            existing.babyNamesText = existing.babyName
          } else {
            const item = {
              ...member,
              memberKey,
              babyId,
              babyName,
              babyIds: babyId ? [babyId] : [],
              babyNames: babyName ? [babyName] : [],
              babyNamesText: babyName || '',
              roleCodes: member.roleCode ? [member.roleCode] : [],
              roleNames: member.roleName ? [member.roleName] : [],
              lastLoginText: this.formatTime(member.lastLoginTime),
            }
            memberByUser[memberKey] = item
            familyMembers.push(item)
          }
        }
      }
      this.setData({
        familyGroups: safeGroups,
        familyMembers,
      })
    } catch (e) {
      console.warn('load family members failed:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  pickLatestTime(left, right) {
    if (!left) return right || ''
    if (!right) return left
    const leftTime = new Date(left).getTime()
    const rightTime = new Date(right).getTime()
    if (isNaN(leftTime)) return right
    if (isNaN(rightTime)) return left
    return rightTime > leftTime ? right : left
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
    return this.formatDate(d)
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  // ==================== 角色修改 ====================
  openRoleSheet(e) {
    const memberKey = e.currentTarget.dataset.memberKey
    const member = this.data.familyMembers.find(item => item.memberKey === memberKey)
    if (!member || !member.babyIds || member.babyIds.length === 0) return
    const roleCode = member.roleCode || e.currentTarget.dataset.roleCode
    const idx = FAMILY_ROLES.findIndex(r => r.code === roleCode)
    this.setData({
      selectedMemberKey: memberKey,
      selectedBabyIds: member.babyIds,
      selectedRoleIndex: idx >= 0 ? idx : 0,
      showRoleSheet: true,
    })
  },

  closeRoleSheet() {
    if (this.data.roleSaving) return
    this.setData({ showRoleSheet: false, selectedMemberKey: '', selectedBabyIds: [] })
  },

  onRolePickerChange(e) {
    this.setData({ selectedRoleIndex: Number(e.detail.value) })
  },

  onConfirmRole() {
    const { selectedBabyIds, selectedRoleIndex, roleSaving } = this.data
    if (!selectedBabyIds.length || roleSaving) return
    const role = FAMILY_ROLES[selectedRoleIndex]
    if (!role) return

    wx.showModal({
      title: '确认修改',
      content: `确定将你的身份修改为"${role.name}"吗？`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doUpdateRole(selectedBabyIds, role.code, role.name)
        }
      },
    })
  },

  async doUpdateRole(babyIds, roleCode, roleName) {
    const safeBabyIds = Array.isArray(babyIds) ? babyIds : [babyIds]
    this.setData({ roleSaving: true })
    try {
      await Promise.all(safeBabyIds.map(babyId => babyService.updateMyFamilyRole({ babyId, roleCode, roleName })))
      wx.showToast({ title: '已更新身份', icon: 'success' })
      this.setData({ showRoleSheet: false, selectedMemberKey: '', selectedBabyIds: [] })
      this.loadFamilyMembers()
    } catch (e) {
      console.warn('update family role failed:', e)
      wx.showToast({ title: '更新失败', icon: 'none' })
    } finally {
      this.setData({ roleSaving: false })
    }
  },

  // ==================== 邀请家人 ====================
  openInviteSheet() {
    this.setData({
      showInviteSheet: true,
      inviteRoleIndex: 0,
    })
  },

  closeInviteSheet() {
    this.setData({
      showInviteSheet: false,
      inviteRoleIndex: 0,
    })
  },

  onInviteRolePickerChange(e) {
    this.setData({ inviteRoleIndex: Number(e.detail.value) })
  },

  onShareAppMessage() {
    const { familyGroups, inviteRoleIndex } = this.data
    const baby = familyGroups[0]
    const role = FAMILY_ROLES[inviteRoleIndex]
    if (!baby || !role) {
      return {
        title: '一起记录宝宝成长',
        path: '/pages/index/index',
        imageUrl: SHARE_IMAGE_URL,
      }
    }
    const babyNames = familyGroups
      .map(item => item.babyName)
      .filter(Boolean)
      .join('、')
    return {
      title: `邀请你成为${babyNames || '宝宝'}的${role.name}，一起记录成长`,
      path: `/pages/index/index?inviteBabyId=${baby.babyId}&inviteRoleCode=${role.code}&inviteRoleName=${encodeURIComponent(role.name)}`,
      imageUrl: SHARE_IMAGE_URL,
    }
  },

  onGoAddBaby() {
    app.globalData.pendingAddBaby = true
    wx.switchTab({ url: '/pages/mine/index' })
  },

  stopTap() {},

  stopTouchMove() {},
})
