import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVault, CATEGORIES } from '../context/VaultContext';
import { generatePassword, evaluatePasswordStrength, getStrengthLabel, getStrengthColor } from '../utils/crypto';

export default function AddItem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { items, addItem, updateItem } = useVault();

  const isEdit = !!id;
  const existingItem = isEdit ? items.find(i => i.id === parseInt(id)) : null;

  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    website: '',
    notes: '',
    category: 'login'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 密码生成器选项
  const [genOptions, setGenOptions] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

  // 加载现有数据
  useEffect(() => {
    if (existingItem) {
      setFormData({
        title: existingItem.title || '',
        username: existingItem.username || '',
        password: existingItem.password || '',
        website: existingItem.website || '',
        notes: existingItem.notes || '',
        category: existingItem.category || 'login'
      });
    }
  }, [existingItem]);

  // 生成密码
  useEffect(() => {
    if (showGenerator) {
      regeneratePassword();
    }
  }, [showGenerator, genOptions]);

  const regeneratePassword = () => {
    const pwd = generatePassword(genOptions.length, genOptions);
    setGeneratedPassword(pwd);
  };

  const useGenerated = () => {
    setFormData(prev => ({ ...prev, password: generatedPassword }));
    setShowGenerator(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const strength = evaluatePasswordStrength(formData.password);
  const strengthLabel = getStrengthLabel(strength);
  const strengthColor = getStrengthColor(strength);

  const canSubmit = formData.title && formData.username && formData.password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await updateItem(parseInt(id), formData);
      } else {
        await addItem(formData);
      }
      navigate('/vault');
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-primary-500 text-white px-4 py-4 flex items-center gap-4 safe-top">
        <button onClick={() => navigate(-1)} className="text-2xl">
          ←
        </button>
        <h1 className="text-lg font-bold">
          {isEdit ? '编辑密码' : '添加密码'}
        </h1>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* 分类选择 */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择分类
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.category === cat.id
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
                style={formData.category === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 基本信息 */}
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-medium text-gray-800">基本信息</h3>

          <div>
            <label className="block text-sm text-gray-600 mb-1">标题 *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="例如：微信账号"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">用户名/邮箱 *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="请输入用户名或邮箱"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">密码 *</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="请输入密码"
                  className="input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerator(true)}
                className="px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200"
                title="生成密码"
              >
                🎲
              </button>
            </div>

            {/* 密码强度 */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor: i <= strength - 1 ? strengthColor : '#e5e7eb'
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strengthColor }}>
                  密码强度：{strengthLabel}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 附加信息 */}
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-medium text-gray-800">附加信息（可选）</h3>

          <div>
            <label className="block text-sm text-gray-600 mb-1">网站地址</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">备注</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="添加备注信息..."
              className="input resize-none"
              rows={3}
            />
          </div>
        </div>
      </form>

      {/* 底部按钮 */}
      <div className="p-4 bg-white border-t flex gap-3 safe-bottom">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex-1 py-4 bg-gray-100 text-gray-600 font-semibold rounded-xl"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="flex-[2] py-4 bg-primary-500 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {loading ? '保存中...' : (isEdit ? '保存修改' : '添加密码')}
        </button>
      </div>

      {/* 密码生成器弹窗 */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 safe-bottom animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">密码生成器</h3>
              <button onClick={() => setShowGenerator(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            {/* 生成的密码 */}
            <div className="bg-gray-100 rounded-xl p-4 mb-6 text-center">
              <p className="font-mono text-lg font-bold text-primary-600 break-all">
                {generatedPassword}
              </p>
            </div>

            {/* 选项 */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  密码长度: {genOptions.length}
                </label>
                <input
                  type="range"
                  min={8}
                  max={32}
                  value={genOptions.length}
                  onChange={(e) => setGenOptions(prev => ({ ...prev, length: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'uppercase', label: '大写字母 (A-Z)' },
                  { key: 'lowercase', label: '小写字母 (a-z)' },
                  { key: 'numbers', label: '数字 (0-9)' },
                  { key: 'symbols', label: '特殊符号 (!@#)' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={genOptions[key]}
                      onChange={(e) => setGenOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 text-primary-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={regeneratePassword}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl"
              >
                🔄 重新生成
              </button>
              <button
                onClick={useGenerated}
                className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl"
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
      )}
    </div>
  );
}
