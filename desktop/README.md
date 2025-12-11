# 密码保险箱 - 桌面版

基于 Electron 的跨平台桌面应用，复用现有的 React 前端代码。

## 功能特性

- **跨平台支持**: macOS、Windows、Linux
- **系统托盘**: 最小化到托盘，快速访问
- **全局快捷键**:
  - `Cmd/Ctrl + Shift + P` - 快速搜索
  - `Cmd/Ctrl + Shift + L` - 锁定保险箱
- **原生菜单**: 完整的应用菜单支持
- **自动更新**: 支持自动检查和安装更新
- **单实例运行**: 防止多个实例同时运行

## 开发环境

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
cd desktop
npm install
```

### 开发模式

```bash
npm run dev
```

这将同时启动 Vite 开发服务器和 Electron 应用。

### 构建应用

```bash
# 构建所有平台
npm run build

# 仅构建 macOS
npm run build:mac

# 仅构建 Windows
npm run build:win

# 仅构建 Linux
npm run build:linux
```

构建产物将输出到 `release/` 目录。

## 目录结构

```
desktop/
├── package.json          # 项目配置
├── vite.config.js        # Vite 配置
├── electron/
│   ├── main.js           # 主进程入口
│   ├── preload.js        # 预加载脚本
│   └── icons/            # 应用图标
│       ├── icon.png      # 通用图标
│       ├── icon.icns     # macOS 图标
│       ├── icon.ico      # Windows 图标
│       └── tray-icon.png # 托盘图标
├── dist/                 # 构建输出（Vite）
└── release/              # 打包输出（electron-builder）
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + Shift + P` | 快速搜索 |
| `Cmd/Ctrl + Shift + L` | 锁定保险箱 |
| `Cmd/Ctrl + N` | 新建密码 |
| `Cmd/Ctrl + F` | 搜索 |
| `Cmd/Ctrl + ,` | 设置 (macOS) |

## 托盘菜单

右键点击托盘图标可访问：

- 打开密码保险箱
- 快速搜索
- 锁定
- 设置
- 退出

## 配置

应用配置存储在用户目录：

- **macOS**: `~/Library/Application Support/password-vault-desktop/config.json`
- **Windows**: `%APPDATA%/password-vault-desktop/config.json`
- **Linux**: `~/.config/password-vault-desktop/config.json`

### 可配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `autoLaunch` | `false` | 开机自启动 |
| `minimizeToTray` | `true` | 关闭时最小化到托盘 |
| `startMinimized` | `false` | 启动时最小化 |

## 与 Web 版的区别

| 特性 | Web 版 | 桌面版 |
|------|--------|--------|
| 系统托盘 | ❌ | ✅ |
| 全局快捷键 | ❌ | ✅ |
| 原生菜单 | ❌ | ✅ |
| 离线使用 | PWA | 完全离线 |
| 自动更新 | 自动 | 自动 |
| 开机自启动 | ❌ | ✅ |

## 安全性

- 使用 `contextIsolation: true` 隔离渲染进程
- 通过 `preload.js` 安全暴露 API
- 禁用 `nodeIntegration`
- 所有敏感操作在主进程中处理

## 常见问题

### macOS 无法打开应用

如果提示"无法验证开发者"：
1. 打开系统偏好设置 > 安全性与隐私
2. 点击"仍要打开"

### Windows 安装被阻止

Windows Defender 可能会阻止未签名的应用：
1. 点击"更多信息"
2. 选择"仍要运行"

## 许可证

MIT License
