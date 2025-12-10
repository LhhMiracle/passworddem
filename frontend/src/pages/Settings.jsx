import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { auth as authApi } from '../utils/api';
import { storage } from '../utils/storage';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, lock } = useAuth();
  const { getStats } = useVault();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const stats = getStats();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.new !== passwordForm.confirm) {
      setError('两次密码不一致');
      return;
    }

    if (passwordForm.new.length < 8) {
      setError('新密码至少8位');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(passwordForm.current, passwordForm.new);
      setSuccess('密码修改成功，请重新登录');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
      navigate('/welcome');
    }
  };

  const handleClearData = () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      if (window.confirm('再次确认：您的所有密码将被删除！')) {
        storage.clearAll();
        logout();
        navigate('/welcome');
      }
    }
  };

  const handleLock = () => {
    lock();
    navigate('/unlock');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-primary-500 text-white px-4 py-4 flex items-center gap-4 safe-top">
        <button onClick={() => navigate(-1)} className="text-2xl">
          ←
        </button>
        <h1 className="text-lg font-bold">设置</h1>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 用户信息 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <p className="font-medium text-gray-800">{user?.email}</p>
              <p className="text-sm text-gray-500">密码总数: {stats.total}</p>
            </div>
          </div>
        </div>

        {/* 安全设置 */}
        <div className="bg-white rounded-xl divide-y">
          <div className="p-4">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              🔒 安全设置
            </h3>
          </div>

          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div>
              <p className="text-gray-800">修改主密码</p>
              <p className="text-sm text-gray-500">定期更换密码更安全</p>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          <button
            onClick={handleLock}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div>
              <p className="text-gray-800">锁定保险箱</p>
              <p className="text-sm text-gray-500">立即锁定，需要密码解锁</p>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>

        {/* 关于 */}
        <div className="bg-white rounded-xl divide-y">
          <div className="p-4">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              ℹ️ 关于
            </h3>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="text-gray-800">版本</span>
            <span className="text-gray-500">1.0.0</span>
          </div>

          <div className="p-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              密码保险箱采用端到端加密技术，您的密码在设备上加密后才会上传到服务器。
              我们无法访问您的任何密码数据。
            </p>
          </div>
        </div>

        {/* 危险操作 */}
        <div className="bg-white rounded-xl divide-y">
          <div className="p-4">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              ⚠️ 危险操作
            </h3>
          </div>

          <button
            onClick={handleClearData}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div>
              <p className="text-red-500">清除所有数据</p>
              <p className="text-sm text-gray-500">删除所有密码并重置应用</p>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-white text-red-500 font-medium rounded-xl border border-gray-200"
        >
          退出登录
        </button>
      </div>

      {/* 修改密码弹窗 */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">修改主密码</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">当前密码</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">新密码</label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                  className="input"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-primary-500 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? '修改中...' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
