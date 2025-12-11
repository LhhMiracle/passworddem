# 密码保险箱 - Chrome 扩展

Chrome/Edge 浏览器扩展，支持自动填充密码、生成密码等功能。

## 功能特性

- **自动检测登录表单** - 识别用户名和密码字段
- **一键填充密码** - 快速填充保存的用户名和密码
- **密码生成器** - 生成强随机密码
- **保存新密码** - 检测注册表单并提示保存
- **快捷键支持** - Cmd/Ctrl + Shift + P 打开扩展
- **右键菜单** - 快速访问功能

## 安装方法

### 开发模式安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension` 文件夹

### 生成图标

扩展需要 PNG 格式的图标文件。请使用以下命令生成：

```bash
# 使用 ImageMagick 将 SVG 转换为 PNG
convert assets/icon.svg -resize 16x16 assets/icon16.png
convert assets/icon.svg -resize 32x32 assets/icon32.png
convert assets/icon.svg -resize 48x48 assets/icon48.png
convert assets/icon.svg -resize 128x128 assets/icon128.png
```

或者使用在线工具将 `assets/icon.svg` 转换为不同尺寸的 PNG 文件。

## 使用方法

### 登录扩展

1. 点击工具栏中的扩展图标
2. 输入你的密码保险箱账号和密码
3. 登录后即可使用所有功能

### 自动填充

- 访问登录页面时，扩展会自动检测匹配的密码
- 点击扩展图标，选择要填充的账号
- 或使用快捷键 `Cmd/Ctrl + Shift + F` 快速填充

### 生成密码

- 在密码框上右键点击
- 选择「生成密码」
- 强密码会自动填充到输入框

### 保存新密码

- 注册新账号时，扩展会自动检测
- 表单提交后会提示是否保存密码
- 点击「保存」将密码添加到保险箱

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Cmd/Ctrl + Shift + P | 打开扩展弹窗 |
| Cmd/Ctrl + Shift + F | 快速填充密码 |

## 目录结构

```
extension/
├── manifest.json        # 扩展配置文件
├── background/
│   └── service-worker.js # 后台服务
├── popup/
│   ├── popup.html       # 弹窗 HTML
│   ├── popup.css        # 弹窗样式
│   └── popup.js         # 弹窗逻辑
├── content/
│   ├── content.js       # 内容脚本
│   └── content.css      # 内容脚本样式
└── assets/
    ├── icon.svg         # 原始图标
    ├── icon16.png       # 16x16 图标
    ├── icon32.png       # 32x32 图标
    ├── icon48.png       # 48x48 图标
    └── icon128.png      # 128x128 图标
```

## 技术栈

- Manifest V3
- Chrome Extension API
- Vanilla JavaScript

## 注意事项

- 确保后端服务运行在 `http://localhost:3001`
- 确保前端应用运行在 `http://localhost:5173`
- 首次使用需要登录密码保险箱账号

## 许可证

MIT License
