// 设置页面
const app = getApp()
const crypto = require('../../utils/crypto.js')
const storage = require('../../utils/storage.js')

Page({
  data: {
    stats: {
      total: 0,
      weakPasswords: 0
    },
    autoLockOptions: [
      { label: '立即', value: 0 },
      { label: '1分钟', value: 60000 },
      { label: '5分钟', value: 300000 },
      { label: '15分钟', value: 900000 },
      { label: '30分钟', value: 1800000 },
      { label: '从不', value: -1 }
    ],
    autoLockIndex: 1,
    showChangePassword: false,
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  },

  onLoad() {
    this.loadSettings()
  },

  onShow() {
    this.loadStats()
  },

  loadSettings() {
    const autoLockTime = wx.getStorageSync('autoLockTime') || 60000
    const autoLockIndex = this.data.autoLockOptions.findIndex(o => o.value === autoLockTime)

    this.setData({
      autoLockIndex: autoLockIndex >= 0 ? autoLockIndex : 1
    })
  },

  loadStats() {
    const masterKey = app.globalData.masterKey
    if (masterKey) {
      const stats = storage.getPasswordStats(masterKey)
      this.setData({ stats })
    }
  },

  onAutoLockChange(e) {
    const index = e.detail.value
    const value = this.data.autoLockOptions[index].value

    this.setData({ autoLockIndex: index })
    wx.setStorageSync('autoLockTime', value)

    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    })
  },

  // 修改密码
  changePassword() {
    this.setData({
      showChangePassword: true,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    })
  },

  closeChangePassword() {
    this.setData({ showChangePassword: false })
  },

  onCurrentPasswordInput(e) {
    this.setData({ currentPassword: e.detail.value })
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value })
  },

  onConfirmNewPasswordInput(e) {
    this.setData({ confirmNewPassword: e.detail.value })
  },

  confirmChangePassword() {
    const { currentPassword, newPassword, confirmNewPassword } = this.data

    // 验证当前密码
    if (!app.verifyMasterPassword(currentPassword)) {
      wx.showToast({
        title: '当前密码错误',
        icon: 'error'
      })
      return
    }

    // 验证新密码
    if (newPassword.length < 8) {
      wx.showToast({
        title: '新密码至少8位',
        icon: 'none'
      })
      return
    }

    if (newPassword !== confirmNewPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      })
      return
    }

    // 获取所有密码并用新密钥重新加密
    const oldKey = app.globalData.masterKey
    const passwords = storage.getAllPasswords(oldKey)

    // 设置新密码
    app.setMasterPassword(newPassword)

    // 用新密钥保存密码
    storage.saveAllPasswords(passwords, app.globalData.masterKey)

    wx.showToast({
      title: '密码已修改',
      icon: 'success'
    })

    this.setData({ showChangePassword: false })
  },

  // 导出数据
  exportData() {
    const masterKey = app.globalData.masterKey
    const exportedData = storage.exportPasswords(masterKey)

    wx.setClipboardData({
      data: JSON.stringify(exportedData),
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: `已导出 ${exportedData.count} 个密码到剪贴板。请妥善保管备份数据。`,
          showCancel: false
        })
      }
    })
  },

  // 导入数据
  importData() {
    wx.showModal({
      title: '导入数据',
      content: '请确保剪贴板中包含有效的备份数据',
      success: (res) => {
        if (res.confirm) {
          wx.getClipboardData({
            success: (res) => {
              try {
                const exportedData = JSON.parse(res.data)
                if (!exportedData.data || !exportedData.version) {
                  throw new Error('无效的备份格式')
                }

                const masterKey = app.globalData.masterKey
                const imported = storage.importPasswords(exportedData, masterKey)

                if (imported >= 0) {
                  wx.showToast({
                    title: `成功导入 ${imported} 个`,
                    icon: 'success'
                  })
                  this.loadStats()
                } else {
                  wx.showToast({
                    title: '导入失败',
                    icon: 'error'
                  })
                }
              } catch (e) {
                wx.showToast({
                  title: '数据格式错误',
                  icon: 'error'
                })
              }
            }
          })
        }
      }
    })
  },

  // 显示隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '密码保险箱重视您的隐私。所有密码数据均在本地加密存储，不会上传至任何服务器。我们不会收集、存储或分享您的任何个人信息。',
      showCancel: false
    })
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于密码保险箱',
      content: '密码保险箱是一款安全、简洁的密码管理工具。\n\n功能特点：\n• 本地加密存储\n• 密码生成器\n• 分类管理\n• 一键复制\n\n版本：1.0.0',
      showCancel: false
    })
  },

  // 清除所有数据
  clearAllData() {
    wx.showModal({
      title: '清除所有数据',
      content: '此操作将删除所有保存的密码并重置应用。此操作不可恢复！',
      confirmText: '确定清除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '最后确认',
            content: '确定要删除所有数据吗？',
            confirmText: '删除',
            confirmColor: '#ff4d4f',
            success: (res2) => {
              if (res2.confirm) {
                wx.clearStorageSync()
                app.globalData.isUnlocked = false
                app.globalData.masterKey = null

                wx.showToast({
                  title: '已清除所有数据',
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
  },

  // 锁定保险箱
  lockVault() {
    app.lock()

    wx.showToast({
      title: '已锁定',
      icon: 'success'
    })

    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/login/login'
      })
    }, 1000)
  }
})
