const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 设置相关
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // 应用信息
  getVersion: () => ipcRenderer.invoke('get-version'),

  // 通知
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },

  // 窗口操作
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),

  // 外部链接
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // 事件监听
  onQuickSearch: (callback) => {
    ipcRenderer.on('quick-search', callback);
    return () => ipcRenderer.removeListener('quick-search', callback);
  },

  onLockVault: (callback) => {
    ipcRenderer.on('lock-vault', callback);
    return () => ipcRenderer.removeListener('lock-vault', callback);
  },

  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', callback);
    return () => ipcRenderer.removeListener('open-settings', callback);
  },

  onNewPassword: (callback) => {
    ipcRenderer.on('new-password', callback);
    return () => ipcRenderer.removeListener('new-password', callback);
  },

  onImportData: (callback) => {
    ipcRenderer.on('import-data', callback);
    return () => ipcRenderer.removeListener('import-data', callback);
  },

  onExportData: (callback) => {
    ipcRenderer.on('export-data', callback);
    return () => ipcRenderer.removeListener('export-data', callback);
  },

  onFocusSearch: (callback) => {
    ipcRenderer.on('focus-search', callback);
    return () => ipcRenderer.removeListener('focus-search', callback);
  },

  // 平台信息
  platform: process.platform,
  isElectron: true
});

// 检测是否在 Electron 环境中
window.isElectron = true;
