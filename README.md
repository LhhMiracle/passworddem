# 微信小程序项目

这是一个基础的微信小程序项目模板。

## 项目结构

```
.
├── app.json          # 全局配置文件
├── app.js            # 小程序逻辑
├── app.wxss          # 全局样式
├── sitemap.json      # 站点地图配置
├── pages/            # 页面目录
│   ├── index/        # 首页
│   │   ├── index.json
│   │   ├── index.js
│   │   ├── index.wxml
│   │   └── index.wxss
│   └── logs/         # 日志页
│       ├── logs.json
│       ├── logs.js
│       ├── logs.wxml
│       └── logs.wxss
└── utils/            # 工具函数
    └── util.js
```

## 功能说明

### 首页 (pages/index)
- 显示欢迎信息
- 获取用户头像和昵称
- 跳转到日志页面

### 日志页 (pages/logs)
- 显示小程序启动日志
- 记录每次启动的时间

## 使用步骤

### 1. 安装微信开发者工具
- 访问 [微信开发者工具下载页面](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 下载并安装适合你操作系统的版本

### 2. 导入项目
1. 打开微信开发者工具
2. 选择"小程序"
3. 点击"导入项目"
4. 选择本项目目录
5. 填写 AppID（测试可以使用测试号）

### 3. 运行项目
- 点击"编译"按钮即可在模拟器中预览
- 点击"预览"可以在手机微信中扫码查看
- 点击"真机调试"可以在真实设备上调试

## 开发指南

### 创建新页面
1. 在 `pages/` 目录下创建新文件夹
2. 创建四个文件：`.json`, `.js`, `.wxml`, `.wxss`
3. 在 `app.json` 的 `pages` 数组中添加页面路径

### 页面跳转
```javascript
// 保留当前页面，跳转到应用内的某个页面
wx.navigateTo({
  url: '/pages/logs/logs'
})

// 关闭当前页面，跳转到应用内的某个页面
wx.redirectTo({
  url: '/pages/logs/logs'
})
```

### 数据绑定
```javascript
// 在 .js 文件中
Page({
  data: {
    message: 'Hello World'
  }
})

// 在 .wxml 文件中
<text>{{message}}</text>
```

### 生命周期
```javascript
Page({
  onLoad() {
    // 页面加载时触发
  },
  onShow() {
    // 页面显示时触发
  },
  onReady() {
    // 页面初次渲染完成时触发
  },
  onHide() {
    // 页面隐藏时触发
  },
  onUnload() {
    // 页面卸载时触发
  }
})
```

## 相关资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信小程序 API 文档](https://developers.weixin.qq.com/miniprogram/dev/api/)
- [微信小程序组件库](https://developers.weixin.qq.com/miniprogram/dev/component/)
- [微信开发者社区](https://developers.weixin.qq.com/community/develop/mixflow)

## 注意事项

1. **AppID**: 正式发布需要在微信公众平台注册小程序并获取 AppID
2. **服务器域名**: 在小程序中进行网络请求时，需要在微信公众平台配置服务器域名
3. **版本要求**: 建议使用基础库 2.10.4 及以上版本
4. **用户隐私**: 获取用户信息需要用户授权，遵守微信小程序用户隐私保护指引

## 下一步

- 添加更多页面和功能
- 接入后端 API
- 添加自定义组件
- 优化页面样式和交互
- 添加数据缓存和状态管理

## 许可证

MIT License
