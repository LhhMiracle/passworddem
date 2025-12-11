/**
 * 锁定前警告弹窗组件
 */
export default function LockWarning({ countdown, onCancel, onLockNow }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center animate-pulse-slow">
        {/* 图标 */}
        <div className="text-6xl mb-4">🔒</div>

        {/* 标题 */}
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          即将自动锁定
        </h3>

        {/* 倒计时 */}
        <div className="mb-6">
          <div className="text-5xl font-bold text-primary-500 mb-2">
            {countdown}
          </div>
          <p className="text-gray-500">秒后将自动锁定</p>
        </div>

        {/* 提示 */}
        <p className="text-sm text-gray-500 mb-6">
          点击任意位置或按任意键取消
        </p>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            保持解锁
          </button>
          <button
            onClick={onLockNow}
            className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
          >
            立即锁定
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
