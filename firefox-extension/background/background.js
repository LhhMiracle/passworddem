/**
 * 密码保险箱 - Firefox 扩展后台脚本
 * Manifest V2 Background Script
 */

// 使用 browser API（Firefox原生）或 chrome API（兼容）
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// API 基础地址
const API_BASE = 'http://localhost:3001/api';

// 存储管理
const storage = {
  async get(keys) {
    return browserAPI.storage.local.get(keys);
  },
  async set(data) {
    return browserAPI.storage.local.set(data);
  },
  async remove(keys) {
    return browserAPI.storage.local.remove(keys);
  },
  async clear() {
    return browserAPI.storage.local.clear();
  }
};

// API 请求
async function apiRequest(endpoint, options = {}) {
  const { token } = await storage.get('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// 登录
async function login(email, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  await storage.set({
    token: result.token,
    user: result.user,
    encryptionSalt: result.encryptionSalt
  });

  return result;
}

// 登出
async function logout() {
  await storage.clear();
  // 通知所有标签页用户已登出
  const tabs = await browserAPI.tabs.query({});
  tabs.forEach(tab => {
    browserAPI.tabs.sendMessage(tab.id, { type: 'LOGGED_OUT' }).catch(() => {});
  });
}

// 获取密码列表
async function getVaultItems() {
  return apiRequest('/vault/items');
}

// 检查登录状态
async function checkAuth() {
  const { token } = await storage.get('token');
  if (!token) return { isLoggedIn: false };

  try {
    const user = await apiRequest('/auth/me');
    return { isLoggedIn: true, user };
  } catch {
    await storage.remove(['token', 'user']);
    return { isLoggedIn: false };
  }
}

// 根据 URL 匹配密码
function matchPasswordsByUrl(items, url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');

    return items.filter(item => {
      if (!item.website) return false;
      try {
        const itemHost = new URL(item.website).hostname.replace('www.', '');
        return itemHost === hostname || hostname.includes(itemHost) || itemHost.includes(hostname);
      } catch {
        return item.website.includes(hostname);
      }
    });
  } catch {
    return [];
  }
}

// 更新扩展图标徽章
async function updateBadge(count) {
  const text = count > 0 ? String(count) : '';
  await browserAPI.browserAction.setBadgeText({ text });
  await browserAPI.browserAction.setBadgeBackgroundColor({
    color: count > 0 ? '#0052CC' : '#666'
  });
}

// 初始化 - 创建右键菜单
browserAPI.runtime.onInstalled.addListener(() => {
  // 创建右键菜单
  browserAPI.contextMenus.create({
    id: 'fill-password',
    title: '填充密码',
    contexts: ['editable']
  });

  browserAPI.contextMenus.create({
    id: 'generate-password',
    title: '生成密码',
    contexts: ['editable']
  });

  browserAPI.contextMenus.create({
    id: 'open-vault',
    title: '打开密码保险箱',
    contexts: ['all']
  });
});

// 右键菜单点击处理
browserAPI.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'fill-password') {
    // 发送消息给 content script 填充密码
    browserAPI.tabs.sendMessage(tab.id, { type: 'SHOW_PASSWORD_PICKER' });
  } else if (info.menuItemId === 'generate-password') {
    // 生成密码并填充
    const password = generatePassword();
    browserAPI.tabs.sendMessage(tab.id, { type: 'FILL_GENERATED_PASSWORD', password });
  } else if (info.menuItemId === 'open-vault') {
    // Firefox不支持openPopup，打开新标签页
    browserAPI.tabs.create({ url: 'http://localhost:5173/vault' });
  }
});

// 生成密码
function generatePassword(length = 16) {
  const chars = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  const allChars = Object.values(chars).join('');
  let password = '';

  // 确保每种字符至少有一个
  for (const charset of Object.values(chars)) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // 打乱顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// 消息处理
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true; // 异步响应
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'LOGIN':
      return login(message.email, message.password);

    case 'LOGOUT':
      await logout();
      return { success: true };

    case 'CHECK_AUTH':
      return checkAuth();

    case 'GET_VAULT_ITEMS':
      return getVaultItems();

    case 'GET_MATCHED_PASSWORDS': {
      const { items } = await getVaultItems();
      const matches = matchPasswordsByUrl(items, message.url);
      await updateBadge(matches.length);
      return { items: matches };
    }

    case 'GENERATE_PASSWORD':
      return { password: generatePassword(message.length || 16) };

    case 'SAVE_NEW_PASSWORD':
      // 保存新密码到服务器
      return apiRequest('/vault/items', {
        method: 'POST',
        body: JSON.stringify(message.data)
      });

    case 'GET_STORAGE':
      return storage.get(message.keys);

    case 'SET_STORAGE':
      await storage.set(message.data);
      return { success: true };

    default:
      throw new Error('Unknown message type');
  }
}

// 标签页更新时检查匹配的密码
browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const { token } = await storage.get('token');
      if (!token) {
        await updateBadge(0);
        return;
      }

      const { items } = await getVaultItems();
      const matches = matchPasswordsByUrl(items, tab.url);
      await updateBadge(matches.length);
    } catch {
      await updateBadge(0);
    }
  }
});

// 快捷键命令处理
browserAPI.commands.onCommand.addListener(async (command) => {
  if (command === 'fill_password') {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      browserAPI.tabs.sendMessage(tabs[0].id, { type: 'QUICK_FILL' });
    }
  }
});

console.log('Password Vault Firefox Extension Background Script started');
