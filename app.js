// app.js
const crypto = require('./utils/crypto.js')

App({
  onLaunch() {
    // 检查是否已设置主密码
    const hasPassword = wx.getStorageSync('masterPasswordHash')
    this.globalData.isFirstLaunch = !hasPassword

    // 检查是否需要自动锁定
    this.checkAutoLock()
  },

  onShow() {
    // 每次显示时检查是否需要锁定
    this.checkAutoLock()
  },

  onHide() {
    // 记录隐藏时间用于自动锁定
    this.globalData.lastHideTime = Date.now()
  },

  // 检查自动锁定
  checkAutoLock() {
    const autoLockTime = wx.getStorageSync('autoLockTime') || 60000 // 默认1分钟
    const lastHideTime = this.globalData.lastHideTime

    if (lastHideTime && (Date.now() - lastHideTime > autoLockTime)) {
      this.globalData.isUnlocked = false
    }
  },

  // 验证主密码
  verifyMasterPassword(password) {
    const storedHash = wx.getStorageSync('masterPasswordHash')
    const inputHash = crypto.hashPassword(password)
    return storedHash === inputHash
  },

  // 设置主密码
  setMasterPassword(password) {
    const hash = crypto.hashPassword(password)
    wx.setStorageSync('masterPasswordHash', hash)
    this.globalData.masterKey = crypto.deriveKey(password)
    this.globalData.isUnlocked = true
  },

  // 解锁保险箱
  unlock(password) {
    if (this.verifyMasterPassword(password)) {
      this.globalData.masterKey = crypto.deriveKey(password)
      this.globalData.isUnlocked = true
      return true
    }
    return false
  },

  // 锁定保险箱
  lock() {
    this.globalData.masterKey = null
    this.globalData.isUnlocked = false
  },

  globalData: {
    isFirstLaunch: true,
    isUnlocked: false,
    masterKey: null,
    lastHideTime: null
  }
})
