// 添加/编辑密码页面
const app = getApp()
const crypto = require('../../utils/crypto.js')
const storage = require('../../utils/storage.js')

Page({
  data: {
    isEdit: false,
    editId: null,
    categories: [],
    formData: {
      title: '',
      username: '',
      password: '',
      website: '',
      notes: '',
      category: 'login'
    },
    showPassword: false,
    passwordStrength: 0,
    strengthLabel: '',
    strengthColor: '#999',
    canSave: false,
    showGenerator: false,
    generatedPassword: '',
    generatorOptions: {
      length: 16,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true
    }
  },

  onLoad(options) {
    const categories = storage.getCategories()
    this.setData({ categories })

    // 检查是否是编辑模式
    if (options.id) {
      this.setData({ isEdit: true, editId: options.id })
      this.loadPassword(options.id)
      wx.setNavigationBarTitle({ title: '编辑密码' })
    }
  },

  loadPassword(id) {
    const masterKey = app.globalData.masterKey
    const password = storage.getPasswordById(id, masterKey)

    if (password) {
      this.setData({
        formData: {
          title: password.title,
          username: password.username,
          password: password.password,
          website: password.website || '',
          notes: password.notes || '',
          category: password.category
        }
      })
      this.updatePasswordStrength(password.password)
      this.checkCanSave()
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value

    this.setData({
      [`formData.${field}`]: value
    })
    this.checkCanSave()
  },

  onPasswordInput(e) {
    const password = e.detail.value
    this.setData({
      'formData.password': password
    })
    this.updatePasswordStrength(password)
    this.checkCanSave()
  },

  updatePasswordStrength(password) {
    const strength = crypto.evaluatePasswordStrength(password)
    this.setData({
      passwordStrength: strength,
      strengthLabel: crypto.getPasswordStrengthLabel(strength),
      strengthColor: crypto.getPasswordStrengthColor(strength)
    })
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      'formData.category': category
    })
  },

  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  checkCanSave() {
    const { title, username, password } = this.data.formData
    const canSave = title.trim() && username.trim() && password.trim()
    this.setData({ canSave })
  },

  // 密码生成器
  generatePassword() {
    this.regeneratePassword()
    this.setData({ showGenerator: true })
  },

  closeGenerator() {
    this.setData({ showGenerator: false })
  },

  regeneratePassword() {
    const { length, includeUppercase, includeLowercase, includeNumbers, includeSymbols } = this.data.generatorOptions
    const password = crypto.generatePassword(length, {
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols
    })
    this.setData({ generatedPassword: password })
  },

  onLengthChange(e) {
    this.setData({
      'generatorOptions.length': e.detail.value
    })
    this.regeneratePassword()
  },

  onOptionChange(e) {
    const option = e.currentTarget.dataset.option
    this.setData({
      [`generatorOptions.${option}`]: e.detail.value
    })
    this.regeneratePassword()
  },

  useGeneratedPassword() {
    this.setData({
      'formData.password': this.data.generatedPassword,
      showGenerator: false
    })
    this.updatePasswordStrength(this.data.generatedPassword)
    this.checkCanSave()
  },

  cancel() {
    wx.navigateBack()
  },

  save() {
    if (!this.data.canSave) return

    const { formData, isEdit, editId } = this.data
    const masterKey = app.globalData.masterKey

    if (isEdit) {
      // 更新密码
      const success = storage.updatePassword(editId, formData, masterKey)
      if (success) {
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: '修改失败',
          icon: 'error'
        })
      }
    } else {
      // 添加新密码
      const result = storage.addPassword(formData, masterKey)
      if (result) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: '添加失败',
          icon: 'error'
        })
      }
    }
  }
})
