// 注册页面 - 设置主密码
const app = getApp()
const crypto = require('../../utils/crypto.js')

Page({
  data: {
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    passwordStrength: 0,
    strengthLabel: '',
    strengthColor: '#999',
    canSubmit: false
  },

  onPasswordInput(e) {
    const password = e.detail.value
    const strength = crypto.evaluatePasswordStrength(password)

    this.setData({
      password,
      passwordStrength: strength,
      strengthLabel: crypto.getPasswordStrengthLabel(strength),
      strengthColor: crypto.getPasswordStrengthColor(strength)
    })

    this.checkCanSubmit()
  },

  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    })
    this.checkCanSubmit()
  },

  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  toggleConfirmPassword() {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    })
  },

  checkCanSubmit() {
    const { password, confirmPassword } = this.data
    const canSubmit = password.length >= 8 && password === confirmPassword

    this.setData({ canSubmit })
  },

  createAccount() {
    const { password, confirmPassword, canSubmit } = this.data

    if (!canSubmit) {
      return
    }

    if (password.length < 8) {
      wx.showToast({
        title: '密码至少需要8位',
        icon: 'none'
      })
      return
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      })
      return
    }

    // 设置主密码
    app.setMasterPassword(password)

    wx.showToast({
      title: '创建成功',
      icon: 'success',
      duration: 1500
    })

    // 跳转到密码保险箱主页
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/vault/vault'
      })
    }, 1500)
  }
})
