import { useState } from 'react';
import { share } from '../utils/api';

/**
 * 共享对话框组件
 * 支持设置过期时间、查看次数限制、密码保护
 */
export default function ShareDialog({ item, encryptedData, iv, onClose, onSuccess }) {
  const [expiresIn, setExpiresIn] = useState('1d');
  const [maxViews, setMaxViews] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareResult, setShareResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await share.create(
        item.id,
        expiresIn,
        maxViews ? parseInt(maxViews) : null,
        usePassword ? password : null,
        encryptedData,
        iv
      );

      setShareResult(result);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.message || '创建共享链接失败');
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => {
    if (!shareResult) return '';
    return `${window.location.origin}/shared/${shareResult.token}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 降级使用 execCommand
      const textarea = document.createElement('textarea');
      textarea.value = getShareUrl();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiresAt = (date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 创建成功后显示结果
  if (shareResult) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-lg">共享链接已创建</h3>
            <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
          </div>

          <div className="p-4 space-y-4">
            <div className="text-center">
              <span className="text-5xl">🔗</span>
              <p className="text-green-600 font-medium mt-2">链接创建成功！</p>
            </div>

            {/* 链接显示 */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">共享链接</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getShareUrl()}
                  readOnly
                  className="flex-1 bg-white border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>

            {/* 链接信息 */}
            <div className="bg-blue-50 rounded-xl p-3 text-sm space-y-1">
              <p className="flex justify-between">
                <span className="text-gray-600">过期时间</span>
                <span className="font-medium">{formatExpiresAt(shareResult.expiresAt)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">查看次数限制</span>
                <span className="font-medium">{shareResult.maxViews || '无限制'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">密码保护</span>
                <span className="font-medium">{shareResult.hasPassword ? '是' : '否'}</span>
              </p>
            </div>

            {shareResult.hasPassword && password && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-xs text-yellow-700 mb-1">访问密码（请妥善保存）</p>
                <p className="font-mono font-medium text-yellow-800">{password}</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">分享密码</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 过期时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              过期时间
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '1h', label: '1小时' },
                { value: '1d', label: '1天' },
                { value: '7d', label: '7天' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExpiresIn(option.value)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    expiresIn === option.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 查看次数限制 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              查看次数限制
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '1', label: '1次' },
                { value: '5', label: '5次' },
                { value: '', label: '无限制' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMaxViews(option.value)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    maxViews === option.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 密码保护 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usePassword}
                onChange={(e) => setUsePassword(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">添加密码保护</span>
            </label>

            {usePassword && (
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入访问密码"
                className="mt-2 w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required={usePassword}
              />
            )}
          </div>

          {/* 安全提示 */}
          <div className="bg-yellow-50 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div className="text-sm text-yellow-700">
                <p className="font-medium mb-1">安全提示</p>
                <ul className="list-disc list-inside space-y-0.5 text-yellow-600">
                  <li>链接过期或查看次数用尽后将失效</li>
                  <li>您可以随时在共享记录中撤销链接</li>
                  <li>建议使用密码保护敏感信息</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || (usePassword && !password)}
              className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建链接'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
