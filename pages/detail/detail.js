// 密码详情页面
const app = getApp()
const crypto = require('../../utils/crypto.js')
const storage = require('../../utils/storage.js')

Page({
  data: {
    passwordId: '',
    password: null,
    showPassword: false,
    maskedPassword: '',
    categoryName: '',
    categoryColor: '#0052CC',
    strengthLabel: '',
    strengthColor: '#999',
    createdTime: '',
    updatedTime: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ passwordId: options.id })
    }
  },

  onShow() {
    this.loadPassword()
  },

  loadPassword() {
    const { passwordId } = this.data
    const masterKey = app.globalData.masterKey
    const password = storage.getPasswordById(passwordId, masterKey)

    if (!password) {
      wx.showToast({
        title: '密码不存在',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 获取分类信息
    const categories = storage.getCategories()
    const category = categories.find(c => c.id === password.category)

    // 计算密码强度
    const strength = crypto.evaluatePasswordStrength(password.password)

    // 格式化时间
    const createdTime = this.formatTime(password.createdAt)
    const updatedTime = this.formatTime(password.updatedAt)

    // 生成掩码密码
    const maskedPassword = '•'.repeat(Math.min(password.password.length, 16))

    this.setData({
      password,
      maskedPassword,
      categoryName: category ? category.name : '其他',
      categoryColor: category ? category.color : '#0052CC',
      strengthLabel: crypto.getPasswordStrengthLabel(strength),
      strengthColor: crypto.getPasswordStrengthColor(strength),
      createdTime,
      updatedTime
    })
  },

  formatTime(timestamp) {
    if (!timestamp) return '未知'
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  copyField(e) {
    const { field, value } = e.currentTarget.dataset

    wx.setClipboardData({
      data: value,
      success: () => {
        const fieldName = field === 'password' ? '密码' : '用户名'
        wx.showToast({
          title: `${fieldName}已复制`,
          icon: 'success'
        })

        // 如果是密码，30秒后清除剪贴板
        if (field === 'password') {
          setTimeout(() => {
            wx.setClipboardData({
              data: '',
              success: () => {
                console.log('剪贴板已清除')
              }
            })
          }, 30000)
        }
      }
    })
  },

  openWebsite() {
    const { website } = this.data.password
    if (!website) return

    wx.setClipboardData({
      data: website,
      success: () => {
        wx.showToast({
          title: '网址已复制',
          icon: 'success'
        })
      }
    })
  },

  editPassword() {
    wx.navigateTo({
      url: `/pages/add/add?id=${this.data.passwordId}`
    })
  },

  deletePassword() {
    wx.showModal({
      title: '删除密码',
      content: `确定要删除"${this.data.password.title}"吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const masterKey = app.globalData.masterKey
          const success = storage.deletePassword(this.data.passwordId, masterKey)

          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  }
})
