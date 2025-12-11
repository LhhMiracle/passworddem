import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { webauthn } from '../utils/api';
import { storage } from '../utils/storage';
import { deriveKey } from '../utils/crypto';

export default function Unlock() {
  const navigate = useNavigate();
  const { unlock, logout, isLoggedIn, user } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // 如果未登录，跳转到欢迎页
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/welcome');
    }
  }, [isLoggedIn, navigate]);

  // 检查生物识别是否可用
  useEffect(() => {
    const checkBiometric = async () => {
      if (!window.PublicKeyCredential) return;

      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) return;

        // 检查用户是否启用了生物识别
        const status = await webauthn.getStatus();
        setBiometricAvailable(status.enabled);
      } catch (e) {
        // 忽略错误
      }
    };
    checkBiometric();
  }, []);

  // 密码解锁
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await unlock(password);
      navigate('/vault');
    } catch (err) {
      setError('密码错误');
      setPassword('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  // 生物识别解锁
  const handleBiometricUnlock = async () => {
    try {
      setBiometricLoading(true);
      setError('');

      const email = storage.getUser()?.email;
      if (!email) {
        throw new Error('请重新登录');
      }

      // 获取认证选项
      const options = await webauthn.getAuthenticateOptions(email);

      // 转换 challenge 和 allowCredentials
      const publicKeyOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: (options.allowCredentials || []).map(cred => ({
          ...cred,
          id: base64urlToBuffer(cred.id)
        }))
      };

      // 调用 WebAuthn API 进行验证
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });

      // 转换响应
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          authenticatorData: bufferToBase64url(credential.response.authenticatorData),
          signature: bufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle
            ? bufferToBase64url(credential.response.userHandle)
            : null
        }
      };

      // 发送到服务器验证
      const result = await webauthn.authenticate(email, credentialData);

      // 更新 token 和 salt
      storage.setToken(result.token);
      storage.setSalt(result.encryptionSalt);

      // 这里需要密码来派生加密密钥，但生物识别不提供密码
      // 一个解决方案是在服务器端存储一个加密的密钥，用生物识别解锁后返回
      // 这里我们简化处理，跳转到 vault（实际应用需要更复杂的密钥管理）

      // 提示用户仍需输入密码一次来派生密钥
      setError('生物识别验证成功，请输入主密码完成解锁');
      setBiometricAvailable(false); // 隐藏生物识别按钮

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('操作已取消');
      } else {
        setError(err.message || '生物识别验证失败');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-primary-700 flex flex-col items-center justify-center px-6">
      <div className={`text-center text-white mb-8 ${shake ? 'animate-shake' : ''}`}>
        <div className="text-7xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold">保险箱已锁定</h1>
        <p className="text-white/80 mt-2">请输入主密码解锁</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/50 text-white rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        <div className="relative mb-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            placeholder="请输入主密码"
            required
            autoFocus
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
              解锁中...
            </span>
          ) : (
            '解锁'
          )}
        </button>

        {/* 生物识别按钮 */}
        {biometricAvailable && (
          <button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={biometricLoading}
            className="w-full mt-4 py-4 bg-white/10 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {biometricLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                验证中...
              </>
            ) : (
              <>
                <span className="text-xl">👆</span>
                使用生物识别解锁
              </>
            )}
          </button>
        )}
      </form>

      <button
        onClick={handleLogout}
        className="mt-8 text-white/60 hover:text-white text-sm"
      >
        退出登录
      </button>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

// 辅助函数：Base64URL 转 ArrayBuffer
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// 辅助函数：ArrayBuffer 转 Base64URL
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
