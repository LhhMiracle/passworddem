// 密码保险箱主页面
const app = getApp()
const storage = require('../../utils/storage.js')

Page({
  data: {
    passwords: [],
    filteredPasswords: [],
    categories: [],
    currentCategory: 'all',
    searchKeyword: '',
    stats: {
      total: 0,
      byCategory: {}
    }
  },

  onLoad() {
    this.checkAuth()
  },

  onShow() {
    this.checkAuth()
    if (app.globalData.isUnlocked) {
      this.loadData()
    }
  },

  checkAuth() {
    // 检查是否已解锁
    if (!app.globalData.isUnlocked) {
      const hasPassword = wx.getStorageSync('masterPasswordHash')
      if (hasPassword) {
        wx.redirectTo({
          url: '/pages/login/login'
        })
      } else {
        wx.redirectTo({
          url: '/pages/welcome/welcome'
        })
      }
    }
  },

  loadData() {
    const masterKey = app.globalData.masterKey
    const passwords = storage.getAllPasswords(masterKey)
    const categories = storage.getCategories()
    const stats = storage.getPasswordStats(masterKey)

    // 按更新时间排序
    passwords.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

    this.setData({
      passwords,
      filteredPasswords: passwords,
      categories,
      stats
    })
  },

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterPasswords()
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.filterPasswords()
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    this.filterPasswords()
  },

  filterPasswords() {
    const { passwords, currentCategory, searchKeyword } = this.data
    let filtered = [...passwords]

    // 分类筛选
    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => p.category === currentCategory)
    }

    // 关键词搜索
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(lowerKeyword) ||
        p.username.toLowerCase().includes(lowerKeyword) ||
        (p.website && p.website.toLowerCase().includes(lowerKeyword))
      )
    }

    this.setData({ filteredPasswords: filtered })
  },

  getCategoryColor(categoryId) {
    const category = this.data.categories.find(c => c.id === categoryId)
    return category ? category.color : '#0052CC'
  },

  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  copyPassword(e) {
    const id = e.currentTarget.dataset.id
    const password = this.data.passwords.find(p => p.id === id)

    if (password) {
      wx.setClipboardData({
        data: password.password,
        success: () => {
          wx.showToast({
            title: '密码已复制',
            icon: 'success'
          })

          // 30秒后清除剪贴板
          setTimeout(() => {
            wx.setClipboardData({
              data: '',
              success: () => {
                console.log('剪贴板已清除')
              }
            })
          }, 30000)
        }
      })
    }
  }
})
