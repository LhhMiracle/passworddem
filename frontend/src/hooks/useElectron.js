import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to interact with Electron APIs
 * Returns null values if not running in Electron
 */
export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [settings, setSettings] = useState(null);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    // Check if running in Electron
    const inElectron = typeof window !== 'undefined' && window.electronAPI;
    setIsElectron(inElectron);

    if (inElectron) {
      // Load settings
      window.electronAPI.getSettings().then(setSettings);
      window.electronAPI.getVersion().then(setVersion);
    }
  }, []);

  // Save settings
  const saveSettings = useCallback(async (newSettings) => {
    if (!isElectron) return false;
    const result = await window.electronAPI.saveSettings(newSettings);
    if (result) {
      setSettings(prev => ({ ...prev, ...newSettings }));
    }
    return result;
  }, [isElectron]);

  // Show notification
  const showNotification = useCallback((title, body) => {
    if (!isElectron) {
      // Fallback to browser notifications
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      return;
    }
    window.electronAPI.showNotification(title, body);
  }, [isElectron]);

  // Minimize to tray
  const minimizeToTray = useCallback(() => {
    if (isElectron) {
      window.electronAPI.minimizeToTray();
    }
  }, [isElectron]);

  // Open external link
  const openExternal = useCallback((url) => {
    if (isElectron) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }, [isElectron]);

  return {
    isElectron,
    settings,
    version,
    saveSettings,
    showNotification,
    minimizeToTray,
    openExternal,
    platform: isElectron ? window.electronAPI.platform : 'web'
  };
}

/**
 * Hook to listen for Electron events
 */
export function useElectronEvents(callbacks = {}) {
  const {
    onQuickSearch,
    onLockVault,
    onOpenSettings,
    onNewPassword,
    onImportData,
    onExportData,
    onFocusSearch
  } = callbacks;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const cleanups = [];

    if (onQuickSearch) {
      cleanups.push(window.electronAPI.onQuickSearch(onQuickSearch));
    }
    if (onLockVault) {
      cleanups.push(window.electronAPI.onLockVault(onLockVault));
    }
    if (onOpenSettings) {
      cleanups.push(window.electronAPI.onOpenSettings(onOpenSettings));
    }
    if (onNewPassword) {
      cleanups.push(window.electronAPI.onNewPassword(onNewPassword));
    }
    if (onImportData) {
      cleanups.push(window.electronAPI.onImportData(onImportData));
    }
    if (onExportData) {
      cleanups.push(window.electronAPI.onExportData(onExportData));
    }
    if (onFocusSearch) {
      cleanups.push(window.electronAPI.onFocusSearch(onFocusSearch));
    }

    return () => {
      cleanups.forEach(cleanup => cleanup && cleanup());
    };
  }, [onQuickSearch, onLockVault, onOpenSettings, onNewPassword, onImportData, onExportData, onFocusSearch]);
}

export default useElectron;
