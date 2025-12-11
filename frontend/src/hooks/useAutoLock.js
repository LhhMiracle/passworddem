import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';

// 自动锁定时间选项 (毫秒)
export const AUTO_LOCK_OPTIONS = [
  { value: 5 * 60 * 1000, label: '5 分钟' },
  { value: 10 * 60 * 1000, label: '10 分钟' },
  { value: 15 * 60 * 1000, label: '15 分钟' },
  { value: 30 * 60 * 1000, label: '30 分钟' },
  { value: 0, label: '从不' }
];

// 默认设置
const DEFAULT_SETTINGS = {
  autoLockTime: 15 * 60 * 1000, // 15分钟
  lockOnHide: true,            // 页面隐藏时锁定
  showLockWarning: true,       // 显示锁定前警告
  warningTime: 30 * 1000       // 警告提前30秒
};

const SETTINGS_KEY = 'vault_lock_settings';

/**
 * 获取锁定设置
 */
export function getLockSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('读取锁定设置失败:', e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * 保存锁定设置
 */
export function saveLockSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('保存锁定设置失败:', e);
  }
}

/**
 * 自动锁定 Hook
 */
export default function useAutoLock() {
  const { lock, isUnlocked } = useAuth();
  const [settings, setSettings] = useState(getLockSettings);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 更新设置
  const updateSettings = useCallback((newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveLockSettings(updated);
  }, [settings]);

  // 重置活动时间
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setCountdown(0);

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // 执行锁定
  const doLock = useCallback(() => {
    setShowWarning(false);
    setCountdown(0);
    lock();
  }, [lock]);

  // 取消锁定 (用户活动)
  const cancelLock = useCallback(() => {
    resetActivity();
  }, [resetActivity]);

  // 检查是否应该锁定
  const checkLock = useCallback(() => {
    if (!isUnlocked() || settings.autoLockTime === 0) return;

    const elapsed = Date.now() - lastActivityRef.current;
    const timeToLock = settings.autoLockTime - elapsed;

    // 如果超时，直接锁定
    if (timeToLock <= 0) {
      doLock();
      return;
    }

    // 如果接近超时且需要警告
    if (settings.showLockWarning && timeToLock <= settings.warningTime && !showWarning) {
      setShowWarning(true);
      setCountdown(Math.ceil(timeToLock / 1000));

      // 开始倒计时
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            doLock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isUnlocked, settings, showWarning, doLock]);

  // 主定时器
  useEffect(() => {
    if (!isUnlocked() || settings.autoLockTime === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // 每秒检查一次
    timerRef.current = setInterval(checkLock, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isUnlocked, settings.autoLockTime, checkLock]);

  // 用户活动监听
  useEffect(() => {
    if (!isUnlocked()) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isUnlocked, resetActivity]);

  // 页面可见性监听
  useEffect(() => {
    if (!isUnlocked() || !settings.lockOnHide) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时锁定
        doLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUnlocked, settings.lockOnHide, doLock]);

  // 快捷键监听 (Cmd/Ctrl + Shift + L)
  useEffect(() => {
    if (!isUnlocked()) return;

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        doLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUnlocked, doLock]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return {
    settings,
    updateSettings,
    showWarning,
    countdown,
    cancelLock,
    doLock
  };
}
