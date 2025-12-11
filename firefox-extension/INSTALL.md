# Firefox 扩展快速安装指南

## 方法一：开发模式安装（推荐，用于测试）

### 步骤：

1. **打开 Firefox**

2. **进入调试页面**
   - 在地址栏输入：`about:debugging#/runtime/this-firefox`
   - 或通过菜单：设置 → 更多工具 → 扩展和主题调试器

3. **加载扩展**
   - 点击「临时载入附加组件」按钮
   - 浏览到 `firefox-extension` 目录
   - 选择 `manifest.json` 文件
   - 点击「打开」

4. **完成！**
   - 扩展图标会出现在工具栏
   - 点击图标即可使用

### 注意事项：
- ⚠️ 临时加载的扩展在 Firefox 重启后会失效
- ✅ 适合开发和测试
- ✅ 可以实时调试和修改代码

---

## 方法二：打包安装（永久安装）

### 步骤：

1. **打包扩展**
   ```bash
   cd firefox-extension
   zip -r ../password-vault-firefox.xpi *
   ```

2. **安装扩展**
   - 打开 Firefox
   - 在地址栏输入：`about:addons`
   - 点击右上角的齿轮图标⚙️
   - 选择「从文件安装附加组件」
   - 选择打包好的 `.xpi` 文件

3. **确认安装**
   - Firefox 会提示确认安装
   - 点击「添加」
   - 完成！

### 注意事项：
- ✅ 永久安装，重启后仍然有效
- ⚠️ Firefox 可能提示扩展未签名（自己打包的扩展）
- ⚠️ 需要在 `about:config` 中设置 `xpinstall.signatures.required` 为 `false`（仅用于测试）

---

## 方法三：发布到 Firefox Add-ons（公开发布）

### 步骤：

1. **注册开发者账号**
   - 访问 https://addons.mozilla.org/developers/
   - 注册或登录账号

2. **准备扩展**
   - 确保 `manifest.json` 中的版本号和信息正确
   - 打包扩展为 `.zip` 文件（不是 `.xpi`）

3. **提交审核**
   - 在开发者中心点击「Submit a New Add-on」
   - 上传 `.zip` 文件
   - 填写扩展信息、隐私政策等
   - 提交审核

4. **等待审核**
   - 通常需要几天到几周
   - 审核通过后会自动签名
   - 用户可以在 Firefox Add-ons Store 下载

---

## 使用前准备

### 1. 确保后端服务运行

扩展需要连接到本地后端服务：

```bash
cd backend
npm run dev
```

后端应运行在：`http://localhost:3001`

### 2. 确保前端应用运行

```bash
cd frontend
npm run dev
```

前端应运行在：`http://localhost:5173`

### 3. 注册账号

1. 打开 http://localhost:5173/register
2. 注册新账号
3. 登录

### 4. 使用扩展

1. 点击扩展图标
2. 使用相同账号登录
3. 开始使用！

---

## 快捷键

- `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) - 打开密码保险箱
- `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`) - 自动填充密码

---

## 调试技巧

### 查看后台脚本日志

1. 打开 `about:debugging#/runtime/this-firefox`
2. 找到「密码保险箱」扩展
3. 点击「检查」按钮
4. 查看控制台输出

### 调试弹出窗口

1. 右键点击扩展图标
2. 选择「检查」或「调试弹出窗口」
3. 在开发者工具中调试

### 调试内容脚本

1. 打开任意网页
2. 按 `F12` 打开开发者工具
3. 在控制台查看内容脚本输出

---

## 常见问题

### Q: 扩展无法加载？
A: 检查 manifest.json 是否有语法错误，确保所有引用的文件都存在。

### Q: 提示「未签名」？
A: 临时加载的扩展无需签名。如需永久安装，可在 `about:config` 中禁用签名检查（仅用于开发）。

### Q: 无法连接到后端？
A: 确保后端服务运行在 `http://localhost:3001`，检查防火墙设置。

### Q: 自动填充不工作？
A: 某些网站使用特殊的登录表单，可能无法自动检测。尝试使用右键菜单手动填充。

---

## 卸载扩展

1. 打开 `about:addons`
2. 找到「密码保险箱」
3. 点击「移除」

---

## 更多帮助

详细文档请查看 `README.md` 文件。

如有问题，请通过 GitHub Issues 反馈。
