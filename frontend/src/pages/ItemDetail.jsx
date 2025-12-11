import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVault, CATEGORIES } from '../context/VaultContext';
import { evaluatePasswordStrength, getStrengthLabel, getStrengthColor } from '../utils/crypto';
import { TagSelector } from '../components/TagManager';

export default function ItemDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { items, tags, deleteItem, toggleFavorite, updateItemTags, loadTags } = useVault();

  const item = items.find(i => i.id === parseInt(id));
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  // 初始化选中的标签
  useEffect(() => {
    if (item?.tags) {
      setSelectedTags(item.tags);
    }
    loadTags().catch(console.error);
  }, [item, loadTags]);

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">密码条目不存在</p>
      </div>
    );
  }

  const category = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[4];
  const strength = evaluatePasswordStrength(item.password);
  const strengthLabel = getStrengthLabel(strength);
  const strengthColor = getStrengthColor(strength);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);

      // 如果是密码，30秒后清除剪贴板
      if (field === 'password') {
        setTimeout(() => {
          navigator.clipboard.writeText('').catch(() => {});
        }, 30000);
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除"${item.title}"吗？此操作不可恢复。`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteItem(item.id);
      navigate('/vault');
    } catch (err) {
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(item.id);
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  const handleSaveTags = async () => {
    try {
      await updateItemTags(item.id, selectedTags.map(t => t.id));
      setShowTagEditor(false);
    } catch (err) {
      console.error('保存标签失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-primary-500 text-white px-4 py-4 flex items-center gap-4 safe-top">
        <button onClick={() => navigate(-1)} className="text-2xl">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1">密码详情</h1>
        <button
          onClick={handleToggleFavorite}
          className="p-2 hover:bg-white/10 rounded-lg"
          title={item.isFavorite ? '取消收藏' : '添加收藏'}
        >
          {item.isFavorite ? '⭐' : '☆'}
        </button>
        <button
          onClick={() => navigate(`/edit/${id}`)}
          className="px-3 py-1 bg-white/20 rounded-lg text-sm"
        >
          编辑
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 头部信息 */}
        <div className="bg-white rounded-xl p-4 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl relative"
            style={{ backgroundColor: category.color }}
          >
            {item.title?.[0]?.toUpperCase() || '?'}
            {item.isFavorite && (
              <span className="absolute -top-1 -right-1 text-sm">⭐</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{item.title}</h2>
            <p className="text-gray-500">{category.name}</p>
            {/* 显示标签 */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 标签编辑 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">标签</p>
            <button
              onClick={() => setShowTagEditor(!showTagEditor)}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              {showTagEditor ? '取消' : '编辑'}
            </button>
          </div>

          {showTagEditor ? (
            <div className="space-y-3">
              <TagSelector
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                allTags={tags}
              />
              <button
                onClick={handleSaveTags}
                className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-medium"
              >
                保存标签
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {item.tags && item.tags.length > 0 ? (
                item.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">暂无标签</span>
              )}
            </div>
          )}
        </div>

        {/* 账号信息 */}
        <div className="bg-white rounded-xl divide-y">
          {/* 用户名 */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => copyToClipboard(item.username, 'username')}
          >
            <div>
              <p className="text-sm text-gray-500">用户名/邮箱</p>
              <p className="text-gray-800">{item.username}</p>
            </div>
            <span className="text-xl">
              {copied === 'username' ? '✓' : '📋'}
            </span>
          </div>

          {/* 密码 */}
          <div className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => copyToClipboard(item.password, 'password')}
            >
              <div className="flex-1">
                <p className="text-sm text-gray-500">密码</p>
                <p className="text-gray-800 font-mono">
                  {showPassword ? item.password : '•'.repeat(Math.min(item.password.length, 16))}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className="p-2 text-xl"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
              <span className="text-xl ml-2">
                {copied === 'password' ? '✓' : '📋'}
              </span>
            </div>
            {/* 密码强度 */}
            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: strengthColor }}
              />
              <span className="text-sm" style={{ color: strengthColor }}>
                {strengthLabel}
              </span>
            </div>
          </div>

          {/* 网站 */}
          {item.website && (
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => copyToClipboard(item.website, 'website')}
            >
              <div>
                <p className="text-sm text-gray-500">网站地址</p>
                <p className="text-primary-500">{item.website}</p>
              </div>
              <span className="text-xl">
                {copied === 'website' ? '✓' : '🔗'}
              </span>
            </div>
          )}
        </div>

        {/* 备注 */}
        {item.notes && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">备注</p>
            <p className="text-gray-800 whitespace-pre-wrap">{item.notes}</p>
          </div>
        )}

        {/* 时间信息 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-2">记录信息</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">创建时间</p>
              <p className="text-gray-600">{formatDate(item.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-400">最后修改</p>
              <p className="text-gray-600">{formatDate(item.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-4 bg-red-50 text-red-500 font-medium rounded-xl border border-red-200 hover:bg-red-100 disabled:opacity-50"
        >
          {deleting ? '删除中...' : '删除此密码'}
        </button>
      </div>
    </div>
  );
}
