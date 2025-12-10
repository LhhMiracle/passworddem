# 密码保险箱 (Password Vault)

一款类似 1Password 的密码管理工具，支持多设备同步。

## 功能特点

- 🔒 **端到端加密** - 使用 AES-256-GCM 加密，服务器无法解密您的数据
- 📱 **跨平台支持** - PWA 应用，支持 Mac、Windows、手机浏览器
- 🔄 **多设备同步** - 数据自动同步到所有设备
- 🎲 **密码生成器** - 生成安全的随机密码
- 📋 **一键复制** - 快速复制密码，30秒后自动清除剪贴板
- 🏷️ **分类管理** - 登录账号、银行卡、WiFi、安全笔记等

## 技术栈

### 后端
- Node.js + Express
- SQLite (better-sqlite3)
- JWT 认证
- bcrypt 密码哈希

### 前端
- React 18
- Vite
- TailwindCSS
- PWA (vite-plugin-pwa)
- Web Crypto API

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
# 启动后端 (端口 3001)
cd backend
npm run dev

# 启动前端 (端口 5173)
cd frontend
npm run dev
```

### 3. 访问应用

打开浏览器访问 http://localhost:5173

## 部署

### 后端部署 (Railway/Render)

1. 设置环境变量:
   - `JWT_SECRET`: JWT 密钥
   - `FRONTEND_URL`: 前端 URL
   - `PORT`: 端口号

2. 部署命令:
   ```bash
   cd backend && npm start
   ```

### 前端部署 (Vercel/Netlify)

1. 设置环境变量:
   - `VITE_API_URL`: 后端 API 地址

2. 构建命令:
   ```bash
   cd frontend && npm run build
   ```

## 安全说明

1. **主密码**: 用于派生加密密钥，不会发送到服务器
2. **端到端加密**: 所有密码数据在客户端加密后才上传
3. **零知识架构**: 服务器只存储加密后的数据
4. **PBKDF2**: 使用 100,000 次迭代派生密钥
5. **AES-256-GCM**: 业界标准的加密算法

## 项目结构

```
├── backend/                # 后端 API
│   ├── src/
│   │   ├── index.js       # 入口文件
│   │   ├── routes/        # API 路由
│   │   ├── models/        # 数据库模型
│   │   └── middleware/    # 中间件
│   └── package.json
│
├── frontend/              # 前端 PWA
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 通用组件
│   │   ├── context/      # React Context
│   │   ├── utils/        # 工具函数
│   │   └── styles/       # 样式文件
│   ├── public/           # 静态资源
│   └── package.json
│
└── README.md
```

## 后续计划

- [ ] Electron 桌面应用
- [ ] iOS/Android 原生应用
- [ ] 浏览器扩展（自动填充）
- [ ] 双因素认证 (2FA)
- [ ] 密码泄露检测

## License

MIT
