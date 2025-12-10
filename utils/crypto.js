/**
 * 加密工具类 - 实现AES加密和密码哈希
 * 注意：微信小程序环境没有Web Crypto API，这里使用简化的实现
 * 生产环境建议使用服务端加密或引入第三方加密库
 */

// Base64 编码表
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * 字符串转Base64
 */
function stringToBase64(str) {
  const bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  )
  let result = ''
  let i = 0
  while (i < bytes.length) {
    const a = bytes.charCodeAt(i++)
    const b = i < bytes.length ? bytes.charCodeAt(i++) : 0
    const c = i < bytes.length ? bytes.charCodeAt(i++) : 0
    const triplet = (a << 16) | (b << 8) | c
    result += BASE64_CHARS[(triplet >> 18) & 0x3F]
    result += BASE64_CHARS[(triplet >> 12) & 0x3F]
    result += i > bytes.length + 1 ? '=' : BASE64_CHARS[(triplet >> 6) & 0x3F]
    result += i > bytes.length ? '=' : BASE64_CHARS[triplet & 0x3F]
  }
  return result
}

/**
 * Base64转字符串
 */
function base64ToString(base64) {
  const chars = base64.replace(/=+$/, '')
  let bytes = ''
  for (let i = 0; i < chars.length; i += 4) {
    const a = BASE64_CHARS.indexOf(chars[i])
    const b = BASE64_CHARS.indexOf(chars[i + 1])
    const c = BASE64_CHARS.indexOf(chars[i + 2])
    const d = BASE64_CHARS.indexOf(chars[i + 3])
    const triplet = (a << 18) | (b << 12) | ((c >= 0 ? c : 0) << 6) | (d >= 0 ? d : 0)
    bytes += String.fromCharCode((triplet >> 16) & 0xFF)
    if (c >= 0) bytes += String.fromCharCode((triplet >> 8) & 0xFF)
    if (d >= 0) bytes += String.fromCharCode(triplet & 0xFF)
  }
  try {
    return decodeURIComponent(bytes.split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''))
  } catch (e) {
    return bytes
  }
}

/**
 * 简单哈希函数 - 用于密码哈希
 * 生产环境应使用PBKDF2或Argon2
 */
function hashPassword(password) {
  let hash = 0
  const salt = 'passworddem_salt_2024'
  const combined = salt + password + salt

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  // 多轮哈希增加安全性
  let hashStr = Math.abs(hash).toString(16)
  for (let round = 0; round < 1000; round++) {
    let tempHash = 0
    for (let i = 0; i < hashStr.length; i++) {
      tempHash = ((tempHash << 5) - tempHash) + hashStr.charCodeAt(i)
      tempHash = tempHash & tempHash
    }
    hashStr = Math.abs(tempHash).toString(16)
  }

  return hashStr.padStart(16, '0')
}

/**
 * 派生加密密钥
 */
function deriveKey(password) {
  const hash = hashPassword(password + '_key_derivation')
  return hash.substring(0, 16)
}

/**
 * XOR加密 - 简化的对称加密
 * 生产环境应使用AES
 */
function xorEncrypt(text, key) {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }
  return result
}

/**
 * 加密数据
 */
function encrypt(plainText, key) {
  if (!plainText || !key) return ''

  // 添加随机前缀增加安全性
  const timestamp = Date.now().toString(36)
  const dataWithPrefix = timestamp + '|' + plainText

  // XOR加密
  const encrypted = xorEncrypt(dataWithPrefix, key)

  // Base64编码
  return stringToBase64(encrypted)
}

/**
 * 解密数据
 */
function decrypt(encryptedText, key) {
  if (!encryptedText || !key) return ''

  try {
    // Base64解码
    const decoded = base64ToString(encryptedText)

    // XOR解密
    const decrypted = xorEncrypt(decoded, key)

    // 移除时间戳前缀
    const parts = decrypted.split('|')
    if (parts.length >= 2) {
      return parts.slice(1).join('|')
    }
    return decrypted
  } catch (e) {
    console.error('解密失败:', e)
    return ''
  }
}

/**
 * 生成随机密码
 */
function generatePassword(length = 16, options = {}) {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true
  } = options

  let chars = ''
  if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (includeNumbers) chars += '0123456789'
  if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz'

  let password = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    password += chars[randomIndex]
  }

  return password
}

/**
 * 评估密码强度
 * @returns {number} 0-4 的强度等级
 */
function evaluatePasswordStrength(password) {
  if (!password) return 0

  let score = 0

  // 长度评分
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++

  // 字符类型评分
  if (/[a-z]/.test(password)) score += 0.5
  if (/[A-Z]/.test(password)) score += 0.5
  if (/[0-9]/.test(password)) score += 0.5
  if (/[^a-zA-Z0-9]/.test(password)) score += 0.5

  return Math.min(4, Math.floor(score))
}

/**
 * 获取密码强度描述
 */
function getPasswordStrengthLabel(strength) {
  const labels = ['很弱', '弱', '一般', '强', '很强']
  return labels[strength] || '未知'
}

/**
 * 获取密码强度颜色
 */
function getPasswordStrengthColor(strength) {
  const colors = ['#ff4d4f', '#ff7a45', '#faad14', '#52c41a', '#1890ff']
  return colors[strength] || '#999'
}

module.exports = {
  hashPassword,
  deriveKey,
  encrypt,
  decrypt,
  generatePassword,
  evaluatePasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  stringToBase64,
  base64ToString
}
