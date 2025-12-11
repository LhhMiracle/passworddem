import { createContext, useContext } from 'react';
import useAutoLock from '../hooks/useAutoLock';
import LockWarning from './LockWarning';

const AutoLockContext = createContext(null);

/**
 * 自动锁定 Provider
 * 提供全局自动锁定功能和设置
 */
export function AutoLockProvider({ children }) {
  const autoLock = useAutoLock();

  return (
    <AutoLockContext.Provider value={autoLock}>
      {children}

      {/* 锁定警告弹窗 */}
      {autoLock.showWarning && (
        <LockWarning
          countdown={autoLock.countdown}
          onCancel={autoLock.cancelLock}
          onLockNow={autoLock.doLock}
        />
      )}
    </AutoLockContext.Provider>
  );
}

/**
 * 使用自动锁定设置的 Hook
 */
export function useAutoLockSettings() {
  const context = useContext(AutoLockContext);
  if (!context) {
    throw new Error('useAutoLockSettings must be used within AutoLockProvider');
  }
  return context;
}
