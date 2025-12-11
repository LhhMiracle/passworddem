/**
 * 密码保险箱 - Chrome 扩展内容脚本
 * 负责检测登录表单、填充密码、保存新密码
 */

// 登录表单检测
const LOGIN_FORM_SELECTORS = {
  username: [
    'input[type="email"]',
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="email"]',
    'input[type="text"][name*="login"]',
    'input[type="text"][name*="account"]',
    'input[type="text"][id*="user"]',
    'input[type="text"][id*="email"]',
    'input[type="text"][id*="login"]',
    'input[type="text"][autocomplete="username"]',
    'input[type="text"][autocomplete="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[name="login"]'
  ],
  password: [
    'input[type="password"]'
  ]
};

// 当前检测到的表单
let detectedForms = [];
let passwordInputs = [];

// 检测登录表单
function detectLoginForms() {
  detectedForms = [];
  const forms = document.querySelectorAll('form');

  forms.forEach(form => {
    const passwordFields = form.querySelectorAll(LOGIN_FORM_SELECTORS.password.join(','));
    if (passwordFields.length === 0) return;

    let usernameField = null;
    for (const selector of LOGIN_FORM_SELECTORS.username) {
      usernameField = form.querySelector(selector);
      if (usernameField) break;
    }

    if (usernameField || passwordFields.length > 0) {
      detectedForms.push({
        form,
        username: usernameField,
        password: passwordFields[0]
      });
    }
  });

  // 检测不在 form 标签内的密码框
  const allPasswordInputs = document.querySelectorAll(LOGIN_FORM_SELECTORS.password.join(','));
  allPasswordInputs.forEach(pwdInput => {
    if (!pwdInput.closest('form')) {
      // 查找附近的用户名输入框
      const container = pwdInput.closest('div, section, article') || document.body;
      let usernameField = null;

      for (const selector of LOGIN_FORM_SELECTORS.username) {
        usernameField = container.querySelector(selector);
        if (usernameField) break;
      }

      detectedForms.push({
        form: container,
        username: usernameField,
        password: pwdInput
      });
    }
  });

  return detectedForms;
}

// 填充密码
function fillPassword(username, password) {
  const forms = detectLoginForms();
  if (forms.length === 0) {
    console.log('No login form detected');
    return false;
  }

  const form = forms[0];

  if (form.username && username) {
    form.username.value = username;
    form.username.dispatchEvent(new Event('input', { bubbles: true }));
    form.username.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (form.password && password) {
    form.password.value = password;
    form.password.dispatchEvent(new Event('input', { bubbles: true }));
    form.password.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return true;
}

// 填充生成的密码
function fillGeneratedPassword(password) {
  const activeElement = document.activeElement;
  if (activeElement && activeElement.type === 'password') {
    activeElement.value = password;
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  const passwordInputs = document.querySelectorAll('input[type="password"]');
  if (passwordInputs.length > 0) {
    passwordInputs[0].value = password;
    passwordInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    passwordInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false;
}

// 显示密码选择器
function showPasswordPicker() {
  // 移除现有的选择器
  const existing = document.getElementById('pv-password-picker');
  if (existing) existing.remove();

  // 创建选择器
  const picker = document.createElement('div');
  picker.id = 'pv-password-picker';
  picker.innerHTML = `
    <div class="pv-picker-header">
      <span>🔐 密码保险箱</span>
      <button class="pv-close-btn">&times;</button>
    </div>
    <div class="pv-picker-content">
      <div class="pv-loading">加载中...</div>
    </div>
  `;
  document.body.appendChild(picker);

  // 关闭按钮
  picker.querySelector('.pv-close-btn').addEventListener('click', () => {
    picker.remove();
  });

  // 加载匹配的密码
  loadMatchedPasswords(picker);
}

// 加载匹配的密码
async function loadMatchedPasswords(picker) {
  const content = picker.querySelector('.pv-picker-content');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_MATCHED_PASSWORDS',
      url: window.location.href
    });

    const items = response.items || [];

    if (items.length === 0) {
      content.innerHTML = `
        <div class="pv-empty">
          <p>未找到匹配的密码</p>
          <a href="http://localhost:5173/add" target="_blank">添加密码</a>
        </div>
      `;
      return;
    }

    content.innerHTML = items.map(item => `
      <div class="pv-password-item" data-username="${escapeAttr(item.username)}" data-password="${escapeAttr(item.password)}">
        <div class="pv-item-icon">${(item.title?.[0] || '?').toUpperCase()}</div>
        <div class="pv-item-info">
          <div class="pv-item-title">${escapeHtml(item.title || '未命名')}</div>
          <div class="pv-item-username">${escapeHtml(item.username || '')}</div>
        </div>
      </div>
    `).join('');

    // 绑定点击事件
    content.querySelectorAll('.pv-password-item').forEach(item => {
      item.addEventListener('click', () => {
        const username = item.dataset.username;
        const password = item.dataset.password;
        fillPassword(username, password);
        picker.remove();
      });
    });
  } catch (error) {
    content.innerHTML = `
      <div class="pv-error">
        <p>加载失败</p>
        <p class="pv-error-msg">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// 属性转义
function escapeAttr(text) {
  return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 监听表单提交，检测新密码
function watchFormSubmissions() {
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    const passwordInput = form.querySelector('input[type="password"]');
    if (!passwordInput) return;

    // 检查是否是注册表单（有两个密码框）
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    if (passwordInputs.length >= 2) {
      // 可能是注册表单
      let usernameInput = null;
      for (const selector of LOGIN_FORM_SELECTORS.username) {
        usernameInput = form.querySelector(selector);
        if (usernameInput) break;
      }

      if (usernameInput && passwordInputs[0].value) {
        // 延迟发送，等待表单提交
        setTimeout(() => {
          showSavePrompt({
            url: window.location.href,
            title: document.title,
            username: usernameInput.value,
            password: passwordInputs[0].value
          });
        }, 1000);
      }
    }
  }, true);
}

// 显示保存密码提示
function showSavePrompt(data) {
  const existing = document.getElementById('pv-save-prompt');
  if (existing) existing.remove();

  const prompt = document.createElement('div');
  prompt.id = 'pv-save-prompt';
  prompt.innerHTML = `
    <div class="pv-prompt-content">
      <div class="pv-prompt-icon">🔐</div>
      <div class="pv-prompt-text">
        <p><strong>保存此密码？</strong></p>
        <p class="pv-prompt-info">${escapeHtml(data.username)}</p>
      </div>
      <div class="pv-prompt-actions">
        <button class="pv-save-btn">保存</button>
        <button class="pv-dismiss-btn">忽略</button>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);

  // 保存按钮
  prompt.querySelector('.pv-save-btn').addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_NEW_PASSWORD',
        data: {
          title: new URL(data.url).hostname,
          username: data.username,
          password: data.password,
          website: data.url,
          category: 'login'
        }
      });
      showNotification('密码已保存');
    } catch (error) {
      showNotification('保存失败: ' + error.message);
    }
    prompt.remove();
  });

  // 忽略按钮
  prompt.querySelector('.pv-dismiss-btn').addEventListener('click', () => {
    prompt.remove();
  });

  // 10秒后自动消失
  setTimeout(() => {
    if (prompt.parentNode) prompt.remove();
  }, 10000);
}

// 显示通知
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'pv-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'FILL_PASSWORD':
      const filled = fillPassword(message.username, message.password);
      sendResponse({ success: filled });
      break;

    case 'FILL_GENERATED_PASSWORD':
      const filledGen = fillGeneratedPassword(message.password);
      sendResponse({ success: filledGen });
      break;

    case 'SHOW_PASSWORD_PICKER':
      showPasswordPicker();
      sendResponse({ success: true });
      break;

    case 'QUICK_FILL':
      // 快捷键填充
      showPasswordPicker();
      sendResponse({ success: true });
      break;

    case 'LOGGED_OUT':
      // 用户已登出，移除所有UI元素
      document.querySelectorAll('[id^="pv-"]').forEach(el => el.remove());
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

// 在密码框上添加图标
function addPasswordFieldIcons() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  passwordInputs.forEach(input => {
    if (input.dataset.pvEnhanced) return;
    input.dataset.pvEnhanced = 'true';

    // 创建容器
    const wrapper = document.createElement('div');
    wrapper.className = 'pv-input-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = input.offsetWidth ? input.offsetWidth + 'px' : 'auto';

    // 创建图标按钮
    const iconBtn = document.createElement('button');
    iconBtn.type = 'button';
    iconBtn.className = 'pv-field-icon';
    iconBtn.innerHTML = '🔐';
    iconBtn.title = '密码保险箱';

    // 插入到DOM
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(iconBtn);

    // 点击图标显示选择器
    iconBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPasswordPicker();
    });
  });
}

// 初始化
function init() {
  // 检测登录表单
  detectLoginForms();

  // 监听表单提交
  watchFormSubmissions();

  // 添加密码框图标（可选，取消注释启用）
  // addPasswordFieldIcons();

  // 监听DOM变化
  const observer = new MutationObserver(() => {
    detectLoginForms();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('Password Vault content script initialized');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
