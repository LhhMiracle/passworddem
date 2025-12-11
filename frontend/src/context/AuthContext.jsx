import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../utils/api';
import { storage, session } from '../utils/storage';
import { deriveKey } from '../utils/crypto';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState(null);

  // 初始化：检查是否已登录
  useEffect(() => {
    const initAuth = async () => {
      if (storage.isLoggedIn()) {
        try {
          const { user } = await authApi.getMe();
          setUser(user);
        } catch (error) {
          storage.clearAll();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // 注册
  const register = async (email, password) => {
    const result = await authApi.register(email, password);
    storage.setToken(result.token);
    storage.setUser(result.user);
    storage.setSalt(result.encryptionSalt);
    setUser(result.user);

    // 派生加密密钥
    const key = await deriveKey(password, result.encryptionSalt);
    setEncryptionKey(key);

    return result;
  };

  // 登录
  const login = async (email, password, totpToken = null) => {
    const result = await authApi.login(email, password, totpToken);

    // 检查是否需要 2FA
    if (result.requiresTwoFactor) {
      return result; // 返回给调用者处理 2FA 流程
    }

    storage.setToken(result.token);
    storage.setUser(result.user);
    storage.setSalt(result.encryptionSalt);
    setUser(result.user);

    // 派生加密密钥
    const key = await deriveKey(password, result.encryptionSalt);
    setEncryptionKey(key);

    return result;
  };

  // 解锁（用于应用锁定后重新输入密码）
  const unlock = async (password) => {
    const salt = storage.getSalt();
    if (!salt) throw new Error('需要重新登录');

    const key = await deriveKey(password, salt);
    setEncryptionKey(key);
    return true;
  };

  // 锁定
  const lock = () => {
    setEncryptionKey(null);
    session.clearMasterKey();
  };

  // 登出
  const logout = () => {
    storage.clearAll();
    session.clearMasterKey();
    setUser(null);
    setEncryptionKey(null);
  };

  // 检查是否已解锁
  const isUnlocked = () => !!encryptionKey;

  const value = {
    user,
    loading,
    encryptionKey,
    register,
    login,
    logout,
    unlock,
    lock,
    isUnlocked,
    isLoggedIn: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
