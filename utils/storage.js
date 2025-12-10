/**
 * 密码存储管理工具
 */

const crypto = require('./crypto.js')

// 存储键名
const PASSWORDS_KEY = 'encrypted_passwords'
const CATEGORIES_KEY = 'password_categories'

/**
 * 获取所有密码条目（已解密）
 */
function getAllPasswords(masterKey) {
  try {
    const encryptedData = wx.getStorageSync(PASSWORDS_KEY)
    if (!encryptedData) return []

    const decrypted = crypto.decrypt(encryptedData, masterKey)
    if (!decrypted) return []

    return JSON.parse(decrypted)
  } catch (e) {
    console.error('获取密码失败:', e)
    return []
  }
}

/**
 * 保存所有密码条目
 */
function saveAllPasswords(passwords, masterKey) {
  try {
    const jsonStr = JSON.stringify(passwords)
    const encrypted = crypto.encrypt(jsonStr, masterKey)
    wx.setStorageSync(PASSWORDS_KEY, encrypted)
    return true
  } catch (e) {
    console.error('保存密码失败:', e)
    return false
  }
}

/**
 * 添加密码条目
 */
function addPassword(passwordItem, masterKey) {
  const passwords = getAllPasswords(masterKey)

  // 生成唯一ID
  passwordItem.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  passwordItem.createdAt = Date.now()
  passwordItem.updatedAt = Date.now()

  passwords.push(passwordItem)
  return saveAllPasswords(passwords, masterKey) ? passwordItem : null
}

/**
 * 更新密码条目
 */
function updatePassword(id, updates, masterKey) {
  const passwords = getAllPasswords(masterKey)
  const index = passwords.findIndex(p => p.id === id)

  if (index === -1) return false

  passwords[index] = {
    ...passwords[index],
    ...updates,
    updatedAt: Date.now()
  }

  return saveAllPasswords(passwords, masterKey)
}

/**
 * 删除密码条目
 */
function deletePassword(id, masterKey) {
  const passwords = getAllPasswords(masterKey)
  const filtered = passwords.filter(p => p.id !== id)

  if (filtered.length === passwords.length) return false

  return saveAllPasswords(filtered, masterKey)
}

/**
 * 根据ID获取密码条目
 */
function getPasswordById(id, masterKey) {
  const passwords = getAllPasswords(masterKey)
  return passwords.find(p => p.id === id) || null
}

/**
 * 搜索密码条目
 */
function searchPasswords(keyword, masterKey) {
  const passwords = getAllPasswords(masterKey)
  const lowerKeyword = keyword.toLowerCase()

  return passwords.filter(p =>
    p.title.toLowerCase().includes(lowerKeyword) ||
    p.username.toLowerCase().includes(lowerKeyword) ||
    (p.website && p.website.toLowerCase().includes(lowerKeyword)) ||
    (p.notes && p.notes.toLowerCase().includes(lowerKeyword))
  )
}

/**
 * 按分类获取密码条目
 */
function getPasswordsByCategory(category, masterKey) {
  const passwords = getAllPasswords(masterKey)
  return passwords.filter(p => p.category === category)
}

/**
 * 获取所有分类
 */
function getCategories() {
  const defaultCategories = [
    { id: 'login', name: '登录账号', icon: 'user', color: '#0052CC' },
    { id: 'card', name: '银行卡', icon: 'card', color: '#52c41a' },
    { id: 'note', name: '安全笔记', icon: 'note', color: '#faad14' },
    { id: 'wifi', name: 'WiFi密码', icon: 'wifi', color: '#722ed1' },
    { id: 'other', name: '其他', icon: 'more', color: '#8c8c8c' }
  ]

  const customCategories = wx.getStorageSync(CATEGORIES_KEY) || []
  return [...defaultCategories, ...customCategories]
}

/**
 * 添加自定义分类
 */
function addCategory(category) {
  const categories = wx.getStorageSync(CATEGORIES_KEY) || []
  category.id = 'custom_' + Date.now().toString(36)
  categories.push(category)
  wx.setStorageSync(CATEGORIES_KEY, categories)
  return category
}

/**
 * 获取密码统计
 */
function getPasswordStats(masterKey) {
  const passwords = getAllPasswords(masterKey)
  const categories = getCategories()

  const stats = {
    total: passwords.length,
    byCategory: {},
    weakPasswords: 0,
    recentlyAdded: 0
  }

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  passwords.forEach(p => {
    // 分类统计
    stats.byCategory[p.category] = (stats.byCategory[p.category] || 0) + 1

    // 弱密码统计
    if (p.password && crypto.evaluatePasswordStrength(p.password) < 2) {
      stats.weakPasswords++
    }

    // 最近添加统计
    if (p.createdAt > oneWeekAgo) {
      stats.recentlyAdded++
    }
  })

  return stats
}

/**
 * 导出密码数据（加密格式）
 */
function exportPasswords(masterKey) {
  const passwords = getAllPasswords(masterKey)
  return {
    version: '1.0',
    exportedAt: Date.now(),
    count: passwords.length,
    data: crypto.encrypt(JSON.stringify(passwords), masterKey)
  }
}

/**
 * 导入密码数据
 */
function importPasswords(exportedData, masterKey) {
  try {
    const decrypted = crypto.decrypt(exportedData.data, masterKey)
    const passwords = JSON.parse(decrypted)

    const existingPasswords = getAllPasswords(masterKey)
    const existingIds = new Set(existingPasswords.map(p => p.id))

    // 只导入不存在的密码
    let imported = 0
    passwords.forEach(p => {
      if (!existingIds.has(p.id)) {
        existingPasswords.push(p)
        imported++
      }
    })

    saveAllPasswords(existingPasswords, masterKey)
    return imported
  } catch (e) {
    console.error('导入失败:', e)
    return -1
  }
}

module.exports = {
  getAllPasswords,
  saveAllPasswords,
  addPassword,
  updatePassword,
  deletePassword,
  getPasswordById,
  searchPasswords,
  getPasswordsByCategory,
  getCategories,
  addCategory,
  getPasswordStats,
  exportPasswords,
  importPasswords
}
