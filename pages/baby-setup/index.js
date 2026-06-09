// pages/baby-setup/index.js
const babyService = require('../../services/baby')
const app = getApp()

Page({
  data: {
    from: '',       // 来源页面标识
    saving: false,
    todayStr: '',
    form: {
      name: '',
      birthDate: '',
      gender: 'boy',
    },
  },

  onLoad(options) {
    const d = new Date()
    this.setData({
      from: options.from || '',
      todayStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    })
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  onBirthChange(e) {
    this.setData({ 'form.birthDate': e.detail.value })
  },

  onGenderTap(e) {
    this.setData({ 'form.gender': e.currentTarget.dataset.gender })
  },

  async onSave() {
    const { name, birthDate, gender } = this.data.form
    if (!name.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' })
      return
    }
    if (!birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      const baby = await babyService.addBaby({
        name: name.trim(),
        birthDate,
        gender,
      })
      if (typeof app.setCurrentBaby === 'function') {
        app.setCurrentBaby(baby)
      } else {
        app.globalData.currentBaby = baby
      }
      wx.showToast({ title: '添加成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 800)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  onSkip() {
    wx.switchTab({ url: '/pages/index/index' })
  },
})
