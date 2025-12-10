// 欢迎页面
const app = getApp()

Page({
  data: {
    currentIndex: 0
  },

  onLoad() {
    // 检查是否已有主密码，如果有则跳转到登录页
    const hasPassword = wx.getStorageSync('masterPasswordHash')
    if (hasPassword) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    })
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },

  goToLogin() {
    const hasPassword = wx.getStorageSync('masterPasswordHash')
    if (!hasPassword) {
      wx.showToast({
        title: '请先创建账户',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/login/login'
    })
  }
})
