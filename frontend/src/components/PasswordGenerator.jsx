import { useState, useEffect, useCallback } from 'react';
import { generatePassword, evaluatePasswordStrength, getStrengthLabel, getStrengthColor } from '../utils/crypto';

// 生成历史记录最大条数
const MAX_HISTORY = 10;
// LocalStorage key
const HISTORY_KEY = 'password_generator_history';

/**
 * 密码生成器组件
 * 支持：可配置长度(8-64)、字符类型选择、避免混淆字符、历史记录、一键复制
 */
export default function PasswordGenerator({
  onSelect,
  onClose,
  initialPassword = ''
}) {
  // 生成选项
  const [options, setOptions] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false // 避免易混淆字符 (0/O, 1/l/I)
  });

  // 当前生成的密码
  const [password, setPassword] = useState('');
  // 历史记录
  const [history, setHistory] = useState([]);
  // 显示历史记录面板
  const [showHistory, setShowHistory] = useState(false);
  // 复制成功提示
  const [copied, setCopied] = useState(false);

  // 加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  }, []);

  // 保存历史记录
  const saveToHistory = useCallback((pwd) => {
    if (!pwd) return;

    setHistory(prev => {
      // 避免重复
      const filtered = prev.filter(item => item.password !== pwd);
      const newHistory = [
        { password: pwd, createdAt: new Date().toISOString() },
        ...filtered
      ].slice(0, MAX_HISTORY);

      // 保存到 localStorage
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.error('保存历史记录失败:', e);
      }

      return newHistory;
    });
  }, []);

  // 生成密码
  const generate = useCallback(() => {
    const pwd = generatePassword(options.length, {
      uppercase: options.uppercase,
      lowercase: options.lowercase,
      numbers: options.numbers,
      symbols: options.symbols,
      excludeAmbiguous: options.excludeAmbiguous
    });
    setPassword(pwd);
    return pwd;
  }, [options]);

  // 初始化生成
  useEffect(() => {
    if (!initialPassword) {
      generate();
    } else {
      setPassword(initialPassword);
    }
  }, []);

  // 当选项变化时重新生成
  useEffect(() => {
    generate();
  }, [options, generate]);

  // 计算密码强度
  const strength = evaluatePasswordStrength(password);
  const strengthLabel = getStrengthLabel(strength);
  const strengthColor = getStrengthColor(strength);

  // 计算熵值 (bits)
  const calculateEntropy = () => {
    let poolSize = 0;
    if (options.uppercase) poolSize += options.excludeAmbiguous ? 25 : 26; // 排除 O, I
    if (options.lowercase) poolSize += options.excludeAmbiguous ? 24 : 26; // 排除 l
    if (options.numbers) poolSize += options.excludeAmbiguous ? 8 : 10;   // 排除 0, 1
    if (options.symbols) poolSize += 32;

    if (poolSize === 0) poolSize = 26; // fallback

    const entropy = Math.floor(options.length * Math.log2(poolSize));
    return entropy;
  };

  const entropy = calculateEntropy();

  // 复制密码
  const copyPassword = async (pwd = password) => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // 30秒后清除剪贴板
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, 30000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 使用密码
  const usePassword = () => {
    saveToHistory(password);
    if (onSelect) {
      onSelect(password);
    }
    if (onClose) {
      onClose();
    }
  };

  // 使用历史密码
  const useHistoryPassword = (pwd) => {
    setPassword(pwd);
    setShowHistory(false);
  };

  // 清除历史记录
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // 更新选项
  const updateOption = (key, value) => {
    setOptions(prev => {
      const newOptions = { ...prev, [key]: value };
      // 确保至少选择一种字符类型
      const hasAnyType = newOptions.uppercase || newOptions.lowercase ||
                         newOptions.numbers || newOptions.symbols;
      if (!hasAnyType) {
        newOptions.lowercase = true;
      }
      return newOptions;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 safe-bottom animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">密码生成器</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:bg-gray-100'}`}
              title="历史记录"
            >
              📜
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        {/* 历史记录面板 */}
        {showHistory && (
          <div className="mb-6 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700">最近生成 ({history.length})</h4>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  清除全部
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">暂无历史记录</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => useHistoryPassword(item.password)}
                  >
                    <span className="font-mono text-sm text-gray-700 truncate flex-1 mr-2">
                      {item.password}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 生成的密码展示 */}
        <div className="bg-gray-100 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-lg font-bold text-primary-600 break-all flex-1 mr-2">
              {password}
            </p>
            <button
              onClick={() => copyPassword()}
              className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'hover:bg-gray-200 text-gray-500'}`}
              title={copied ? '已复制' : '复制'}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>

          {/* 密码强度条 */}
          <div className="flex gap-1 mb-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: i <= strength - 1 ? strengthColor : '#e5e7eb'
                }}
              />
            ))}
          </div>

          {/* 强度和熵值 */}
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: strengthColor }}>
              密码强度：{strengthLabel}
            </span>
            <span className="text-gray-500">
              熵值：{entropy} bits
            </span>
          </div>
        </div>

        {/* 密码长度滑块 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">密码长度</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateOption('length', Math.max(8, options.length - 1))}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                -
              </button>
              <span className="w-10 text-center font-bold text-primary-600">{options.length}</span>
              <button
                onClick={() => updateOption('length', Math.min(64, options.length + 1))}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={8}
            max={64}
            value={options.length}
            onChange={(e) => updateOption('length', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>8</span>
            <span>64</span>
          </div>
        </div>

        {/* 字符类型选择 */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">字符类型</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'uppercase', label: '大写字母', desc: 'A-Z' },
              { key: 'lowercase', label: '小写字母', desc: 'a-z' },
              { key: 'numbers', label: '数字', desc: '0-9' },
              { key: 'symbols', label: '特殊符号', desc: '!@#$%^&*' }
            ].map(({ key, label, desc }) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  options[key]
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => updateOption(key, e.target.checked)}
                  className="w-4 h-4 text-primary-500 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 高级选项 */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">高级选项</label>
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
              options.excludeAmbiguous
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={options.excludeAmbiguous}
              onChange={(e) => updateOption('excludeAmbiguous', e.target.checked)}
              className="w-4 h-4 text-primary-500 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">避免易混淆字符</p>
              <p className="text-xs text-gray-500">排除 0/O, 1/l/I 等相似字符</p>
            </div>
          </label>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={generate}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>重新生成</span>
          </button>
          <button
            onClick={usePassword}
            className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
          >
            使用此密码
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
