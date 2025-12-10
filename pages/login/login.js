// 登录页面 - 解锁保险箱
const app = getApp()

Page({
  data: {
    password: '',
    showPassword: false,
    errorMessage: '',
    isShaking: false,
    attempts: 0
  },

  onLoad() {
    // 如果没有设置主密码，跳转到欢迎页
    const hasPassword = wx.getStorageSync('masterPasswordHash')
    if (!hasPassword) {
      wx.redirectTo({
        url: '/pages/welcome/welcome'
      })
    }
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value,
      errorMessage: ''
    })
  },

  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  unlock() {
    const { password, attempts } = this.data

    if (!password) {
      this.setData({
        errorMessage: '请输入主密码'
      })
      return
    }

    // 尝试解锁
    const success = app.unlock(password)

    if (success) {
      wx.showToast({
        title: '解锁成功',
        icon: 'success',
        duration: 1000
      })

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/vault/vault'
        })
      }, 1000)
    } else {
      const newAttempts = attempts + 1

      this.setData({
        attempts: newAttempts,
        isShaking: true,
        errorMessage: `密码错误，请重试 (${newAttempts}/5)`,
        password: ''
      })

      // 停止抖动动画
      setTimeout(() => {
        this.setData({ isShaking: false })
      }, 500)

      // 超过5次错误，锁定一段时间
      if (newAttempts >= 5) {
        this.setData({
          errorMessage: '错误次数过多，请30秒后重试'
        })

        setTimeout(() => {
          this.setData({
            attempts: 0,
            errorMessage: ''
          })
        }, 30000)
      }
    }
  },

  resetApp() {
    wx.showModal({
      title: '重置应用',
      content: '重置将删除所有保存的密码数据，此操作不可恢复！确定要重置吗？',
      confirmText: '确定重置',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 二次确认
          wx.showModal({
            title: '最后确认',
            content: '您确定要删除所有数据吗？',
            confirmText: '删除',
            confirmColor: '#ff4d4f',
            success: (res2) => {
              if (res2.confirm) {
                // 清除所有数据
                wx.clearStorageSync()
                app.globalData.isUnlocked = false
                app.globalData.masterKey = null

                wx.showToast({
                  title: '重置成功',
                  icon: 'success'
                })

                setTimeout(() => {
                  wx.reLaunch({
                    url: '/pages/welcome/welcome'
                  })
                }, 1500)
              }
            }
          })
        }
      }
    })
  }
})
