import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unlock() {
  const navigate = useNavigate();
  const { unlock, logout, isLoggedIn } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // 如果未登录，跳转到欢迎页
  if (!isLoggedIn) {
    navigate('/welcome');
    return null;
  }

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

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

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
              <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full loading"></span>
              解锁中...
            </span>
          ) : (
            '解锁'
          )}
        </button>
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
