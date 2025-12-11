# 密码保险箱 Firefox 扩展

这是密码保险箱的 Firefox 浏览器扩展版本，支持自动填充密码、生成强密码、安全存储等功能。

## 功能特性

- ✅ 自动检测登录表单
- ✅ 一键填充密码
- ✅ 生成强随机密码
- ✅ 保存新密码
- ✅ 右键菜单快捷操作
- ✅ 快捷键支持（Ctrl+Shift+P 打开扩展，Ctrl+Shift+F 填充密码）
- ✅ 根据网站自动匹配密码
- ✅ 密码强度提示

## 安装方法

### 开发模式安装（临时）

1. 打开 Firefox 浏览器
2. 在地址栏输入 `about:debugging#/runtime/this-firefox`
3. 点击「临时载入附加组件」按钮
4. 选择本目录下的 `manifest.json` 文件
5. 扩展将被临时安装（Firefox 重启后失效）

### 正式安装

1. 将扩展打包为 `.xpi` 文件：
   ```bash
   cd firefox-extension
   zip -r ../password-vault-firefox.xpi *
   ```

2. 打开 Firefox
3. 在地址栏输入 `about:addons`
4. 点击齿轮图标，选择「从文件安装附加组件」
5. 选择打包好的 `.xpi` 文件

### 发布到 Firefox Add-ons

1. 在 [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/) 注册账号
2. 打包扩展为 `.zip` 文件
3. 提交审核
4. 审核通过后即可在 Firefox Add-ons Store 下载

## 图标资源

扩展需要以下尺寸的图标文件，请将它们放置在 `assets/` 目录下：

- `icon16.png` - 16x16 像素
- `icon32.png` - 32x32 像素
- `icon48.png` - 48x48 像素
- `icon96.png` - 96x96 像素（Firefox 推荐）

您可以：
1. 使用 Chrome 扩展中的图标（复制 `extension/assets/` 下的文件）
2. 自行设计图标
3. 使用在线工具生成图标

### 快速创建图标

```bash
# 从 Chrome 扩展复制图标
cp -r ../extension/assets/* ./assets/
```

## 与 Chrome 扩展的区别

### Manifest 版本
- Chrome: Manifest V3（使用 Service Worker）
- Firefox: Manifest V2（使用 Background Script）

### API 差异
- Firefox 原生支持基于 Promise 的 `browser` API
- Chrome 使用基于回调的 `chrome` API
- 本扩展已添加兼容层，同时支持两种 API

### 主要适配点

1. **Background Script**
   - Chrome: `service_worker`
   - Firefox: `scripts` 数组

2. **Browser Action**
   - Chrome: `action`
   - Firefox: `browser_action`

3. **Permissions**
   - Firefox 将 `host_permissions` 合并到 `permissions` 中

4. **Web Accessible Resources**
   - Firefox 使用简单数组格式
   - Chrome 使用对象数组格式

## 开发说明

### 目录结构

```
firefox-extension/
├── manifest.json          # 扩展配置文件（Manifest V2）
├── background/
│   └── background.js      # 后台脚本
├── content/
│   ├── content.js         # 内容脚本（页面注入）
│   └── content.css        # 内容样式
├── popup/
│   ├── popup.html         # 弹出窗口HTML
│   ├── popup.js           # 弹出窗口脚本
│   └── popup.css          # 弹出窗口样式
└── assets/                # 图标资源
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon96.png
```

### 调试技巧

1. **查看后台脚本日志**
   - 打开 `about:debugging#/runtime/this-firefox`
   - 找到扩展，点击「检查」按钮
   - 在控制台查看 `console.log` 输出

2. **调试弹出窗口**
   - 右键点击扩展图标
   - 选择「检查」
   - 在开发者工具中调试

3. **调试内容脚本**
   - 在目标网页上按 F12 打开开发者工具
   - 切换到「控制台」标签
   - 查看内容脚本的日志输出

### 热重载

Firefox 不支持自动热重载，修改代码后需要：
1. 打开 `about:debugging#/runtime/this-firefox`
2. 找到扩展
3. 点击「重新加载」按钮

## 配置说明

扩展默认连接到本地后端服务：
- API 地址：`http://localhost:3001/api`
- Web 应用：`http://localhost:5173`

如需修改，请编辑：
- `background/background.js` 中的 `API_BASE` 常量
- `popup/popup.html` 中的链接地址

## 已知问题

1. **弹出窗口打开**
   - Firefox 不支持 `browser.action.openPopup()`
   - 右键菜单的「打开密码保险箱」会打开新标签页而非弹出窗口

2. **自动填充限制**
   - 某些网站使用 Shadow DOM 或动态表单可能无法正确检测
   - 建议在这些网站使用右键菜单手动填充

## 技术栈

- Manifest V2
- Firefox WebExtensions API
- Vanilla JavaScript（无框架依赖）
- CSS3

## 隐私和安全

- ✅ 所有密码数据端到端加密
- ✅ 不收集任何用户数据
- ✅ 扩展仅在本地存储临时登录令牌
- ✅ 所有通信通过 HTTPS（生产环境）
- ✅ 开源代码，可审计

## 版本历史

### v1.0.0 (2024-12-11)
- 初始版本
- 基于 Chrome 扩展适配
- 支持所有核心功能

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请通过以下方式联系：
- GitHub Issues: [项目地址]
- Email: [联系邮箱]
