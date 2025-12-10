/**
 * 端到端加密模块 - 使用 Web Crypto API
 * 实现 AES-256-GCM 加密
 */

// 将字符串转换为 ArrayBuffer
function stringToBuffer(str) {
  return new TextEncoder().encode(str);
}

// 将 ArrayBuffer 转换为字符串
function bufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}

// 将 ArrayBuffer 转换为 Base64
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 将 Base64 转换为 ArrayBuffer
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 从主密码派生加密密钥
 * 使用 PBKDF2 算法
 */
export async function deriveKey(masterPassword, salt) {
  const passwordBuffer = stringToBuffer(masterPassword);
  const saltBuffer = stringToBuffer(salt);

  // 导入密码作为原始密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // 派生 AES-GCM 密钥
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000, // 高迭代次数增加安全性
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * 加密数据
 * @param {Object} data - 要加密的数据对象
 * @param {CryptoKey} key - 加密密钥
 * @returns {Promise<{encryptedData: string, iv: string}>}
 */
export async function encryptData(data, key) {
  const jsonString = JSON.stringify(data);
  const dataBuffer = stringToBuffer(jsonString);

  // 生成随机 IV (初始化向量)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 加密
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  );

  return {
    encryptedData: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv)
  };
}

/**
 * 解密数据
 * @param {string} encryptedData - Base64 编码的加密数据
 * @param {string} iv - Base64 编码的 IV
 * @param {CryptoKey} key - 解密密钥
 * @returns {Promise<Object>}
 */
export async function decryptData(encryptedData, iv, key) {
  const encryptedBuffer = base64ToBuffer(encryptedData);
  const ivBuffer = new Uint8Array(base64ToBuffer(iv));

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer
    },
    key,
    encryptedBuffer
  );

  const jsonString = bufferToString(decryptedBuffer);
  return JSON.parse(jsonString);
}

/**
 * 生成随机密码
 */
export function generatePassword(length = 16, options = {}) {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true
  } = options;

  let chars = '';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }

  return password;
}

/**
 * 评估密码强度 (0-4)
 */
export function evaluatePasswordStrength(password) {
  if (!password) return 0;

  let score = 0;

  // 长度评分
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 0.5;

  // 字符类型评分
  if (/[a-z]/.test(password)) score += 0.5;
  if (/[A-Z]/.test(password)) score += 0.5;
  if (/[0-9]/.test(password)) score += 0.5;
  if (/[^a-zA-Z0-9]/.test(password)) score += 0.5;

  return Math.min(4, Math.floor(score));
}

/**
 * 获取密码强度标签
 */
export function getStrengthLabel(strength) {
  const labels = ['很弱', '弱', '一般', '强', '很强'];
  return labels[strength] || '未知';
}

/**
 * 获取密码强度颜色
 */
export function getStrengthColor(strength) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  return colors[strength] || '#9ca3af';
}
