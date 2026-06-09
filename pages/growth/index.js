// pages/growth/index.js
const recordService = require('../../services/record')
const babyService = require('../../services/baby')
const app = getApp()

function getDefaultFormData(date = '') {
  return {
    title: '',
    date,
    content: '',
    photos: [],
  }
}

function getAuthToken() {
  return app.globalData.token || wx.getStorageSync('token') || ''
}

function isLoggedIn() {
  return !!getAuthToken()
}

Page({
  data: {
    baby: null,
    milestones: [],
    isLogin: false,
    showForm: false,
    editing: null,       // null=新增, object=编辑
    formData: getDefaultFormData(),
    previewVisible: false,
    previewSrc: '',
    todayStr: '',
  },

  onLoad() {
    const d = new Date()
    this.setData({ todayStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    if (!isLoggedIn()) {
      this.resetLoggedOutState()
      return
    }
    this.loadData()
  },

  resetLoggedOutState() {
    this.setData({
      baby: null,
      milestones: [],
      isLogin: false,
      showForm: false,
      editing: null,
      formData: getDefaultFormData(this.data.todayStr),
      previewVisible: false,
      previewSrc: '',
    })
  },

  requireLogin() {
    if (isLoggedIn()) return true
    wx.showModal({
      title: '需要登录',
      content: '请先登录后再记录宝宝成长',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/mine/index' })
        }
      },
    })
    return false
  },

  async loadData() {
    const authToken = getAuthToken()
    if (!authToken) {
      this.resetLoggedOutState()
      return
    }

    try {
      const baby = app.globalData.currentBaby || await babyService.getBabyInfo()
      if (getAuthToken() !== authToken) return
      if (!baby || !baby.id) {
        app.globalData.currentBaby = null
        this.setData({ baby: null, milestones: [], isLogin: true })
        return
      }
      if (typeof app.setCurrentBaby === 'function') {
        app.setCurrentBaby(baby)
      } else {
        app.globalData.currentBaby = baby
      }

      let milestones = await recordService.getMilestones()
      if (getAuthToken() !== authToken) return
      // 没有里程碑且有出生日期 → 自动创建出生节点
      if (milestones.length === 0 && baby.birthDate) {
        await recordService.addMilestone({
          title: '🎂 出生',
          date: baby.birthDate,
          content: `欢迎${baby.name}来到这个世界`,
        })
        if (getAuthToken() !== authToken) return
        milestones = await recordService.getMilestones()
      }

      if (getAuthToken() !== authToken) return
      this.setData({ baby, milestones, isLogin: true })
    } catch (e) {
      console.warn('load milestones failed:', e)
      if (e && e.statusCode === 404) {
        app.globalData.currentBaby = null
        this.setData({ baby: null, milestones: [], isLogin: true })
      } else if (!isLoggedIn()) {
        this.resetLoggedOutState()
      }
    }
  },

  // ==================== 表单 ====================
  onAdd() {
    if (!this.requireLogin()) return
    this.setData({
      showForm: true,
      editing: null,
      formData: getDefaultFormData(this.data.todayStr),
    })
  },

  onEdit(e) {
    if (!this.requireLogin()) return
    const id = e.currentTarget.dataset.id
    const item = this.data.milestones.find(m => m.id == id)
    if (!item) return
    this.setData({
      showForm: true,
      editing: item,
      formData: {
        title: item.title || '',
        date: item.date || '',
        content: item.content || '',
        photos: item.photos || [],
      },
    })
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`formData.${field}`]: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'formData.date': e.detail.value })
  },

  addPhoto() {
    if (!this.requireLogin()) return
    if (this.data.formData.photos.length >= 4) {
      wx.showToast({ title: '最多4张', icon: 'none' })
      return
    }
    const { uploadFile } = require('../../services/upload')
    wx.chooseImage({
      count: 1, sizeType: ['compressed'], sourceType: ['camera', 'album'],
      success: res => {
        uploadFile(res.tempFilePaths[0]).then(url => {
          this.setData({ ['formData.photos']: [...this.data.formData.photos, url] })
        }).catch(() => wx.showToast({ title: '上传失败', icon: 'none' }))
      },
    })
  },

  removePhoto(e) {
    const idx = e.currentTarget.dataset.index
    const photos = [...this.data.formData.photos]
    photos.splice(idx, 1)
    this.setData({ 'formData.photos': photos })
  },

  previewPhoto(e) {
    this.setData({ previewVisible: true, previewSrc: e.currentTarget.dataset.url })
  },

  onClosePreview() {
    this.setData({ previewVisible: false, previewSrc: '' })
  },

  closeForm() {
    this.setData({ showForm: false, editing: null })
  },

  async onSave() {
    if (!this.requireLogin()) return
    const { title, date, content, photos } = this.data.formData
    if (!title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return }
    if (!date) { wx.showToast({ title: '请选择日期', icon: 'none' }); return }

    const payload = {
      title: title.trim(),
      date,
      content: content.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
    }

    try {
      if (this.data.editing) {
        await recordService.updateMilestone(this.data.editing.id, payload)
      } else {
        await recordService.addMilestone(payload)
      }
      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ showForm: false, editing: null })
      this.loadData()
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 格式化日期显示
  fmtDate(dateStr) {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
  },

  stopTap() {},
})
