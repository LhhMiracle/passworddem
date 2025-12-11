# Firefox 扩展 vs Chrome 扩展 - 技术差异对比

本文档详细说明了 Firefox 版本和 Chrome 版本扩展之间的技术差异。

## Manifest 版本

| 特性 | Chrome 扩展 | Firefox 扩展 |
|------|------------|-------------|
| Manifest 版本 | V3 | V2 |
| 后台脚本类型 | Service Worker | Background Script |
| 是否持久化 | 非持久 | 可配置（设为 false） |

### 为什么使用 Manifest V2？

- Firefox 对 Manifest V3 的支持尚不完善
- Manifest V2 更稳定，兼容性更好
- 功能完全满足需求
- Firefox 计划在未来完全支持 V3

## API 差异

### 1. Background Script 配置

**Chrome (manifest.json):**
```json
{
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  }
}
```

**Firefox (manifest.json):**
```json
{
  "background": {
    "scripts": ["background/background.js"],
    "persistent": false
  }
}
```

### 2. Browser Action

**Chrome:**
```json
{
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { ... }
  }
}
```

**Firefox:**
```json
{
  "browser_action": {
    "default_popup": "popup/popup.html",
    "default_icon": { ... }
  }
}
```

### 3. Permissions

**Chrome:**
```json
{
  "permissions": ["storage", "activeTab", ...],
  "host_permissions": ["<all_urls>"]
}
```

**Firefox:**
```json
{
  "permissions": [
    "storage",
    "activeTab",
    "<all_urls>"
  ]
}
```

### 4. Web Accessible Resources

**Chrome:**
```json
{
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**Firefox:**
```json
{
  "web_accessible_resources": ["assets/*"]
}
```

### 5. Commands (快捷键)

**Chrome:**
```json
{
  "commands": {
    "_execute_action": { ... }
  }
}
```

**Firefox:**
```json
{
  "commands": {
    "_execute_browser_action": { ... }
  }
}
```

## JavaScript API 差异

### 1. API 命名空间

**Chrome:**
- 使用 `chrome` 命名空间
- 基于回调的 API
- 部分新 API 支持 Promise

```javascript
chrome.storage.local.get(keys, (result) => {
  // callback
});
```

**Firefox:**
- 原生支持 `browser` 命名空间（推荐）
- 基于 Promise 的 API
- 也支持 `chrome` 命名空间作为兼容层

```javascript
const result = await browser.storage.local.get(keys);
```

### 2. 兼容层实现

**我们的做法：**
```javascript
// 同时兼容 Firefox 和 Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// 使用 Promise 风格（需要手动包装 Chrome API）
async function getData() {
  const result = await browserAPI.storage.local.get(keys);
  return result;
}
```

### 3. 特定 API 差异

| API | Chrome | Firefox | 备注 |
|-----|--------|---------|------|
| `action.openPopup()` | ✅ 支持 | ❌ 不支持 | Firefox 需用其他方法 |
| `action.setBadgeText()` | ✅ | ✅ (browserAction) | 方法名不同 |
| `tabs.query()` | Promise | Promise | 完全兼容 |
| `storage.local` | Promise | Promise | 完全兼容 |

## 功能限制

### 1. 弹出窗口打开

**Chrome:**
```javascript
// 可以通过脚本打开弹出窗口
chrome.action.openPopup();
```

**Firefox:**
```javascript
// 不支持 openPopup()
// 替代方案：打开新标签页
browser.tabs.create({ url: 'http://localhost:5173/vault' });
```

### 2. Service Worker 限制

**Chrome (Manifest V3):**
- Background 使用 Service Worker
- 无法直接访问 DOM
- 生命周期有限制
- 需要消息传递与页面通信

**Firefox (Manifest V2):**
- Background 使用普通脚本
- 可以使用长连接
- 更简单的生命周期管理

## 图标尺寸

| 平台 | 推荐尺寸 |
|------|----------|
| Chrome | 16, 32, 48, 128 |
| Firefox | 16, 32, 48, 96 |

**注意：** Firefox 推荐使用 96x96，而 Chrome 推荐 128x128

## 开发调试差异

### Chrome:
1. 打开 `chrome://extensions/`
2. 启用「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 可以使用自动热重载（需要配置）

### Firefox:
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 需要手动点击「重新加载」按钮（不支持自动热重载）

## 安全策略

### Content Security Policy (CSP)

**Chrome (Manifest V3):**
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Firefox (Manifest V2):**
```json
{
  "content_security_policy": "script-src 'self'; object-src 'self'"
}
```

## 代码适配总结

### 需要修改的部分：

1. **manifest.json**
   - ✅ 版本号（V3 → V2）
   - ✅ background 配置
   - ✅ action → browser_action
   - ✅ permissions 合并
   - ✅ web_accessible_resources 简化
   - ✅ commands 快捷键名称

2. **background.js**
   - ✅ 移除 module 类型
   - ✅ 使用 browserAPI 兼容层
   - ✅ action API → browserAction API
   - ✅ 移除 openPopup 调用

3. **content.js**
   - ✅ 添加 browserAPI 兼容层
   - ✅ 替换 chrome.runtime → browserAPI.runtime

4. **popup.js**
   - ✅ 添加 browserAPI 兼容层
   - ✅ 替换 chrome.runtime → browserAPI.runtime

### 无需修改的部分：

- ✅ content.css
- ✅ popup.css
- ✅ popup.html
- ✅ 大部分业务逻辑

## 测试清单

- [ ] 扩展可以正常加载
- [ ] 弹出窗口显示正常
- [ ] 登录功能正常
- [ ] 密码列表加载正常
- [ ] 自动填充功能正常
- [ ] 右键菜单功能正常
- [ ] 快捷键功能正常
- [ ] 密码生成功能正常
- [ ] 保存新密码功能正常
- [ ] 图标徽章显示正常

## 性能对比

| 特性 | Chrome | Firefox |
|------|--------|---------|
| 内存占用 | 较低（Service Worker） | 中等（Background Script） |
| 启动速度 | 快 | 快 |
| 响应速度 | 快 | 快 |
| 稳定性 | 高 | 高 |

## 兼容性

### 浏览器版本要求：

- **Chrome:** 88+ (Manifest V3 支持)
- **Firefox:** 109+ (推荐使用最新版)
  - Manifest V2: 全面支持
  - Manifest V3: 部分支持

## 迁移建议

如果将来要从 Manifest V2 迁移到 V3：

1. 修改 manifest.json 版本号
2. 将 background.scripts 改为 service_worker
3. 替换 browser_action 为 action
4. 调整 web_accessible_resources 格式
5. 测试所有功能

## 结论

虽然 Chrome 和 Firefox 扩展有一些差异，但通过：
- ✅ 使用兼容层
- ✅ 条件编译
- ✅ 合理的 API 选择

可以实现 **95%+ 的代码复用**，大大降低维护成本。

---

最后更新：2024-12-11
