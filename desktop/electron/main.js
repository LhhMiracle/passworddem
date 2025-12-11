const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// 初始化存储
const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    autoLaunch: false,
    minimizeToTray: true,
    startMinimized: false
  }
});

// 开发环境判断
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let tray = null;
let isQuitting = false;

// 创建主窗口
function createWindow() {
  const { width, height, x, y } = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 800,
    minHeight: 600,
    title: '密码保险箱',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 }
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (!store.get('startMinimized')) {
      mainWindow.show();
    }
  });

  // 保存窗口位置和大小
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('minimizeToTray')) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }

    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

// 创建系统托盘
function createTray() {
  const iconPath = path.join(__dirname, 'icons', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  // 如果图标不存在，创建一个默认图标
  const trayIcon = icon.isEmpty()
    ? nativeImage.createEmpty().resize({ width: 16, height: 16 })
    : icon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开密码保险箱',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '快速搜索',
      accelerator: 'CmdOrCtrl+Shift+P',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('quick-search');
        }
      }
    },
    { type: 'separator' },
    {
      label: '锁定',
      accelerator: 'CmdOrCtrl+Shift+L',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('lock-vault');
        }
      }
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('密码保险箱');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 创建应用菜单
function createMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '关于密码保险箱' },
        { type: 'separator' },
        {
          label: '设置...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-settings');
            }
          }
        },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    }] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '新建密码',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('new-password');
            }
          }
        },
        { type: 'separator' },
        {
          label: '导入...',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('import-data');
            }
          }
        },
        {
          label: '导出...',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('export-data');
            }
          }
        },
        { type: 'separator' },
        {
          label: '锁定',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('lock-vault');
            }
          }
        },
        ...(process.platform !== 'darwin' ? [
          { type: 'separator' },
          { role: 'quit', label: '退出' }
        ] : [])
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
        { type: 'separator' },
        {
          label: '查找',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('focus-search');
            }
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' },
        ...(isDev ? [
          { type: 'separator' },
          { role: 'toggleDevTools', label: '开发者工具' }
        ] : [])
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front', label: '前置全部窗口' }
        ] : [
          { role: 'close', label: '关闭' }
        ])
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用文档',
          click: () => {
            shell.openExternal('https://github.com/LhhMiracle/passworddem');
          }
        },
        {
          label: '报告问题',
          click: () => {
            shell.openExternal('https://github.com/LhhMiracle/passworddem/issues');
          }
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于密码保险箱',
              message: '密码保险箱',
              detail: `版本: ${app.getVersion()}\n\n一个安全的密码管理工具，采用端到端加密保护您的数据。`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 注册全局快捷键
function registerShortcuts() {
  // 快速搜索
  globalShortcut.register('CmdOrCtrl+Shift+P', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('quick-search');
    }
  });

  // 锁定
  globalShortcut.register('CmdOrCtrl+Shift+L', () => {
    if (mainWindow) {
      mainWindow.webContents.send('lock-vault');
    }
  });
}

// IPC 处理
function setupIPC() {
  // 获取设置
  ipcMain.handle('get-settings', () => {
    return {
      autoLaunch: store.get('autoLaunch'),
      minimizeToTray: store.get('minimizeToTray'),
      startMinimized: store.get('startMinimized')
    };
  });

  // 保存设置
  ipcMain.handle('save-settings', (event, settings) => {
    Object.keys(settings).forEach(key => {
      store.set(key, settings[key]);
    });
    return true;
  });

  // 显示通知
  ipcMain.on('show-notification', (event, { title, body }) => {
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // 最小化到托盘
  ipcMain.on('minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  // 获取应用版本
  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });

  // 打开外部链接
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();
  registerShortcuts();
  setupIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

// 应用退出前清理
app.on('before-quit', () => {
  isQuitting = true;
});

// 所有窗口关闭时
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出时注销快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 阻止多个实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
