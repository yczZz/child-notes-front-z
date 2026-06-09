const pointsService = require('../../services/points')
const app = getApp()

function getAuthToken() {
  return app.globalData.token || wx.getStorageSync('token') || ''
}

function formatLottery(lottery) {
  if (!lottery) return null
  return {
    ...lottery,
    prizeImage: lottery.prizeImage || lottery.coverImage || '/image/logo.png',
    participantAvatars: lottery.participantAvatars || [],
    joinText: lottery.alreadyJoined ? '已参与抽奖' : `参与抽奖（使用${lottery.costPoints || 0}积分）`,
  }
}

Page({
  data: {
    loading: false,
    signing: false,
    joining: false,
    points: 0,
    totalEarned: 0,
    totalSpent: 0,
    shareReferrerId: '',
    signIn: {
      todaySigned: false,
      continuousDays: 0,
      todayRewardPoints: 1,
      timeline: [],
    },
    lottery: null,
    tasks: [],
    inviteRecords: [],
    lotteryHistory: [],
    showInviteRecords: false,
    showLotteryHistory: false,
  },

  onLoad() {
    this.loadDashboard().then(() => {
      this._loaded = true
    })
  },

  onShow() {
    if (this._loaded) {
      this.loadDashboard()
    }
  },

  requireLogin() {
    if (getAuthToken()) return true
    wx.showModal({
      title: '需要登录',
      content: '登录后才能签到、参与抽奖和邀请好友。',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/mine/index' })
        }
      },
    })
    return false
  },

  async loadDashboard() {
    if (!this.requireLogin()) return
    this.setData({ loading: true })
    try {
      const dashboard = await pointsService.getDashboard()
      this.applyDashboard(dashboard)
    } catch (e) {
      console.warn('load points dashboard failed:', e)
      wx.showToast({ title: '积分加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  applyDashboard(dashboard = {}) {
    this.setData({
      points: dashboard.points || 0,
      totalEarned: dashboard.totalEarned || 0,
      totalSpent: dashboard.totalSpent || 0,
      shareReferrerId: dashboard.shareReferrerId || '',
      signIn: dashboard.signIn || this.data.signIn,
      lottery: formatLottery(dashboard.lottery),
      tasks: dashboard.tasks || [],
      inviteRecords: dashboard.inviteRecords || [],
    })
  },

  async onSignIn() {
    if (!this.requireLogin() || this.data.signing || this.data.signIn.todaySigned) return
    this.setData({ signing: true })
    try {
      const dashboard = await pointsService.signIn()
      const reward = dashboard && dashboard.signIn ? dashboard.signIn.todayRewardPoints : 1
      this.applyDashboard(dashboard)
      wx.showToast({ title: `签到成功 +${reward}`, icon: 'success' })
    } catch (e) {
      console.warn('sign in failed:', e)
    } finally {
      this.setData({ signing: false })
    }
  },

  onHistoryTap() {
    this.loadLotteryHistory()
  },

  async loadLotteryHistory() {
    try {
      const history = await pointsService.getLotteryHistory()
      this.setData({
        lotteryHistory: (history || []).map(item => ({
          ...item,
          statusText: item.status === 'joined' ? '待开奖' : item.status,
        })),
        showLotteryHistory: true,
      })
    } catch (e) {
      console.warn('load lottery history failed:', e)
      wx.showToast({ title: '历史抽奖加载失败', icon: 'none' })
    }
  },

  closeLotteryHistory() {
    this.setData({ showLotteryHistory: false })
  },

  openInviteRecords() {
    this.setData({ showInviteRecords: true })
  },

  closeInviteRecords() {
    this.setData({ showInviteRecords: false })
  },

  async onJoinLottery() {
    const lottery = this.data.lottery
    if (!this.requireLogin() || !lottery || this.data.joining) return
    if (lottery.alreadyJoined) {
      wx.showToast({ title: '已参与本期抽奖', icon: 'none' })
      return
    }
    if (this.data.points < lottery.costPoints) {
      wx.showToast({ title: '积分不足', icon: 'none' })
      return
    }
    wx.showModal({
      title: '参与抽奖',
      content: `将消耗${lottery.costPoints}积分参与本期抽奖。`,
      confirmText: '确认参与',
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ joining: true })
        try {
          const dashboard = await pointsService.joinLottery(lottery.activityId)
          this.applyDashboard(dashboard)
          wx.showToast({ title: '参与成功', icon: 'success' })
        } catch (e) {
          console.warn('join lottery failed:', e)
        } finally {
          this.setData({ joining: false })
        }
      },
    })
  },

  stopTap() {},

  stopTouchMove() {},

  onShareAppMessage() {
    const referrerId = this.data.shareReferrerId || ''
    return {
      title: '邀请你一起记录宝宝成长',
      path: `/pages/index/index?referrer_id=${encodeURIComponent(referrerId)}`,
      imageUrl: '/image/logo.png',
    }
  },
})
