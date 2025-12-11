/**
 * 密码保险箱 - Chrome 扩展弹出窗口
 */

// 视图元素
const views = {
  loading: document.getElementById('loading-view'),
  login: document.getElementById('login-view'),
  main: document.getElementById('main-view'),
  detail: document.getElementById('detail-view'),
  settings: document.getElementById('settings-view')
};

// 当前状态
let currentItems = [];
let currentItem = null;
let decryptionKey = null;

// 显示指定视图
function showView(viewName) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[viewName].classList.remove('hidden');
}

// 发送消息到后台
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// 初始化
async function init() {
  showView('loading');

  try {
    const auth = await sendMessage({ type: 'CHECK_AUTH' });

    if (auth.isLoggedIn) {
      document.getElementById('user-email').textContent = auth.user?.email || '';
      await loadPasswords();
      showView('main');
    } else {
      showView('login');
    }
  } catch (error) {
    console.error('Init error:', error);
    showView('login');
  }
}

// 加载密码列表
async function loadPasswords() {
  try {
    // 获取当前标签页 URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || '';

    // 获取匹配的密码
    const matchedResult = await sendMessage({
      type: 'GET_MATCHED_PASSWORDS',
      url: currentUrl
    });

    // 获取所有密码
    const allResult = await sendMessage({ type: 'GET_VAULT_ITEMS' });

    // 解密数据（这里需要加密密钥，实际实现需要更复杂的处理）
    const allItems = allResult.items || [];
    const matchedItems = matchedResult.items || [];

    currentItems = allItems;

    // 更新匹配的密码
    const matchedSection = document.getElementById('current-site-section');
    const matchedList = document.getElementById('matched-list');
    const matchCount = document.getElementById('match-count');

    if (matchedItems.length > 0) {
      matchedSection.classList.remove('hidden');
      matchCount.textContent = matchedItems.length;
      matchedList.innerHTML = matchedItems.map(item => createPasswordItem(item, true)).join('');
    } else {
      matchedSection.classList.add('hidden');
    }

    // 更新所有密码
    const allList = document.getElementById('all-list');
    const totalCount = document.getElementById('total-count');
    const emptyState = document.getElementById('empty-state');

    totalCount.textContent = allItems.length;

    if (allItems.length > 0) {
      allList.innerHTML = allItems.map(item => createPasswordItem(item, false)).join('');
      emptyState.classList.add('hidden');
    } else {
      allList.innerHTML = '';
      emptyState.classList.remove('hidden');
    }

    // 绑定点击事件
    bindPasswordItemEvents();
  } catch (error) {
    console.error('Load passwords error:', error);
  }
}

// 创建密码项 HTML
function createPasswordItem(item, showFillBtn = false) {
  const initial = (item.title?.[0] || '?').toUpperCase();
  const colors = ['#0052CC', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
  const color = colors[item.id % colors.length];

  return `
    <div class="password-item" data-id="${item.id}">
      <div class="password-icon" style="background: ${color}">${initial}</div>
      <div class="password-info">
        <div class="password-title">${escapeHtml(item.title || '未命名')}</div>
        <div class="password-username">${escapeHtml(item.username || '')}</div>
      </div>
      <div class="password-actions">
        ${showFillBtn ? '<button class="action-icon fill-action" title="填充">⬇️</button>' : ''}
        <button class="action-icon copy-action" title="复制密码">📋</button>
      </div>
    </div>
  `;
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 绑定密码项事件
function bindPasswordItemEvents() {
  // 点击密码项
  document.querySelectorAll('.password-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.password-actions')) return;
      const id = parseInt(item.dataset.id);
      showPasswordDetail(id);
    });
  });

  // 填充按钮
  document.querySelectorAll('.fill-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.closest('.password-item').dataset.id);
      await fillPassword(id);
    });
  });

  // 复制按钮
  document.querySelectorAll('.copy-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.closest('.password-item').dataset.id);
      const item = currentItems.find(i => i.id === id);
      if (item?.password) {
        await copyToClipboard(item.password);
        showToast('密码已复制');
      }
    });
  });
}

// 显示密码详情
function showPasswordDetail(id) {
  const item = currentItems.find(i => i.id === id);
  if (!item) return;

  currentItem = item;

  document.getElementById('detail-title').textContent = item.title || '未命名';
  document.getElementById('detail-username').textContent = item.username || '';
  document.getElementById('detail-password').textContent = '••••••••';
  document.getElementById('detail-password').dataset.visible = 'false';

  const websiteItem = document.getElementById('website-item');
  const websiteLink = document.getElementById('detail-website');
  if (item.website) {
    websiteItem.classList.remove('hidden');
    websiteLink.href = item.website;
    websiteLink.textContent = item.website;
  } else {
    websiteItem.classList.add('hidden');
  }

  showView('detail');
}

// 填充密码
async function fillPassword(id) {
  const item = currentItems.find(i => i.id === id);
  if (!item) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_PASSWORD',
      username: item.username,
      password: item.password
    });
    window.close();
  }
}

// 复制到剪贴板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// 显示提示
function showToast(message) {
  const existing = document.querySelector('.copy-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// 搜索
function handleSearch(keyword) {
  const lower = keyword.toLowerCase();
  const filtered = currentItems.filter(item =>
    item.title?.toLowerCase().includes(lower) ||
    item.username?.toLowerCase().includes(lower) ||
    item.website?.toLowerCase().includes(lower)
  );

  const allList = document.getElementById('all-list');
  allList.innerHTML = filtered.map(item => createPasswordItem(item, false)).join('');
  bindPasswordItemEvents();
}

// 登录表单提交
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');
  const errorDiv = document.getElementById('login-error');

  loginBtn.disabled = true;
  loginBtn.textContent = '登录中...';
  errorDiv.classList.add('hidden');

  try {
    await sendMessage({ type: 'LOGIN', email, password });
    document.getElementById('user-email').textContent = email;
    await loadPasswords();
    showView('main');
  } catch (error) {
    errorDiv.textContent = error.message || '登录失败';
    errorDiv.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
});

// 搜索输入
document.getElementById('search-input').addEventListener('input', (e) => {
  handleSearch(e.target.value);
});

// 返回按钮
document.getElementById('back-btn').addEventListener('click', () => {
  showView('main');
  currentItem = null;
});

// 设置按钮
document.getElementById('settings-btn').addEventListener('click', () => {
  showView('settings');
});

// 设置返回按钮
document.getElementById('settings-back-btn').addEventListener('click', () => {
  showView('main');
});

// 登出按钮
document.getElementById('logout-btn').addEventListener('click', async () => {
  await sendMessage({ type: 'LOGOUT' });
  showView('login');
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
});

// 切换密码显示
document.getElementById('toggle-password').addEventListener('click', () => {
  const pwdEl = document.getElementById('detail-password');
  const isVisible = pwdEl.dataset.visible === 'true';

  if (isVisible) {
    pwdEl.textContent = '••••••••';
    pwdEl.dataset.visible = 'false';
  } else if (currentItem?.password) {
    pwdEl.textContent = currentItem.password;
    pwdEl.dataset.visible = 'true';
  }
});

// 复制按钮
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const field = btn.dataset.field;
    if (currentItem && currentItem[field]) {
      await copyToClipboard(currentItem[field]);
      showToast(field === 'password' ? '密码已复制' : '用户名已复制');
    }
  });
});

// 填充按钮
document.getElementById('fill-btn').addEventListener('click', async () => {
  if (currentItem) {
    await fillPassword(currentItem.id);
  }
});

// 编辑按钮
document.getElementById('edit-btn').addEventListener('click', () => {
  if (currentItem) {
    chrome.tabs.create({ url: `http://localhost:5173/edit/${currentItem.id}` });
  }
});

// 初始化
init();
