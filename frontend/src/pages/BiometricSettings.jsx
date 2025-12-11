import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { webauthn } from '../utils/api';

/**
 * 生物识别设置页面
 * 支持 Touch ID / Face ID / 指纹等平台认证器
 */
export default function BiometricSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // 检查浏览器是否支持 WebAuthn
  useEffect(() => {
    const checkSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
        } catch (e) {
          setIsSupported(false);
        }
      }
    };
    checkSupport();
  }, []);

  // 加载状态
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const status = await webauthn.getStatus();
      setEnabled(status.enabled);

      if (status.enabled) {
        const { credentials: creds } = await webauthn.getCredentials();
        setCredentials(creds);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 注册新设备
  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');

      // 获取注册选项
      const options = await webauthn.getRegisterOptions();

      // 转换 challenge 和 user.id 为 ArrayBuffer
      const publicKeyOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: {
          ...options.user,
          id: base64urlToBuffer(options.user.id)
        },
        excludeCredentials: (options.excludeCredentials || []).map(cred => ({
          ...cred,
          id: base64urlToBuffer(cred.id)
        }))
      };

      // 调用 WebAuthn API 创建凭证
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });

      // 转换响应为可传输格式
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          attestationObject: bufferToBase64url(credential.response.attestationObject)
        }
      };

      // 发送到服务器
      await webauthn.register(credentialData, deviceName || getDeviceName());

      setSuccess('生物识别已启用');
      setShowAddDialog(false);
      setDeviceName('');
      await loadStatus();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('操作已取消');
      } else if (err.name === 'NotSupportedError') {
        setError('此设备不支持生物识别');
      } else {
        setError(err.message || '注册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 删除凭证
  const handleDelete = async (credentialId) => {
    if (!window.confirm('确定要删除此设备的生物识别吗？')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await webauthn.deleteCredential(credentialId);
      setSuccess('已删除');
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取设备名称
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Android/.test(ua)) return 'Android 设备';
    if (/Windows/.test(ua)) return 'Windows 设备';
    return '未知设备';
  };

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '从未';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && credentials.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-primary-500 text-white px-4 py-4 flex items-center gap-4 safe-top">
        <button onClick={() => navigate(-1)} className="text-2xl">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1">生物识别解锁</h1>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* 不支持提示 */}
        {!isSupported && (
          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-yellow-800 mb-1">不支持</h3>
                <p className="text-sm text-yellow-700">
                  您的设备或浏览器不支持生物识别功能。请使用支持 Touch ID 或 Face ID 的设备，
                  并使用 Safari、Chrome 或 Edge 浏览器。
                </p>
              </div>
            </div>
          </div>
        )}

        {isSupported && (
          <>
            {/* 说明卡片 */}
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-start gap-4">
                <span className="text-3xl">👆</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">什么是生物识别解锁？</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    启用后，您可以使用 Touch ID、Face ID 或其他生物识别方式快速解锁密码保险箱，
                    无需每次输入主密码。
                  </p>
                </div>
              </div>
            </div>

            {/* 已注册的设备 */}
            {credentials.length > 0 && (
              <div className="bg-white rounded-xl divide-y">
                <div className="p-4">
                  <h3 className="font-medium text-gray-800">已注册的设备</h3>
                </div>
                {credentials.map((cred, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <p className="font-medium text-gray-800">{cred.deviceName}</p>
                        <p className="text-sm text-gray-500">
                          添加于 {formatDate(cred.createdAt)}
                        </p>
                        {cred.lastUsed && (
                          <p className="text-xs text-gray-400">
                            上次使用：{formatDate(cred.lastUsed)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(cred.credentialId)}
                      className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-sm"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 添加设备按钮 */}
            <button
              onClick={() => setShowAddDialog(true)}
              disabled={loading}
              className="w-full py-4 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50"
            >
              {credentials.length > 0 ? '添加其他设备' : '启用生物识别'}
            </button>

            {/* 安全提示 */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">安全提示</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-600">
                    <li>生物识别数据仅存储在您的设备上</li>
                    <li>建议只在个人设备上启用此功能</li>
                    <li>主密码仍然是您账户的主要保护</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 添加设备对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">添加生物识别</h3>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setDeviceName('');
                }}
                className="text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-center mb-4">
                <span className="text-5xl">👆</span>
                <p className="text-gray-600 mt-2">
                  点击下方按钮，然后使用 Touch ID 或 Face ID 进行验证
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  设备名称（可选）
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={getDeviceName()}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddDialog(false);
                    setDeviceName('');
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl"
                >
                  取消
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50"
                >
                  {loading ? '验证中...' : '开始验证'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
