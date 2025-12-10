import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部蓝色区域 */}
      <div className="flex-1 bg-gradient-to-b from-primary-500 to-primary-700 flex flex-col items-center justify-center text-white px-6 pb-12 rounded-b-[3rem]">
        <div className="text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h1 className="text-4xl font-bold mb-3">密码保险箱</h1>
          <p className="text-lg text-white/80 mb-8">安全存储您的所有密码</p>

          {/* 特性列表 */}
          <div className="space-y-4 text-left max-w-xs mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <span>端到端加密，安全可靠</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <span>多设备同步，随时访问</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <span>一键复制，快速使用</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎲</span>
              <span>密码生成器，告别弱密码</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮区域 */}
      <div className="p-6 space-y-4 safe-bottom">
        <Link
          to="/register"
          className="block w-full py-4 bg-primary-500 text-white text-center font-semibold rounded-xl hover:bg-primary-600 transition-colors"
        >
          创建新账户
        </Link>
        <Link
          to="/login"
          className="block w-full py-4 bg-white text-primary-500 text-center font-semibold rounded-xl border-2 border-primary-500 hover:bg-primary-50 transition-colors"
        >
          已有账户，登录
        </Link>
      </div>
    </div>
  );
}
