import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVault, CATEGORIES } from '../context/VaultContext';
import { useAuth } from '../context/AuthContext';

export default function Vault() {
  const navigate = useNavigate();
  const { items, loading, loadItems, categories, getStats } = useVault();
  const { lock } = useAuth();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentCategory, setCurrentCategory] = useState('all');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadItems().catch(console.error);
  }, [loadItems]);

  const stats = getStats();

  // 过滤条目
  const filteredItems = items.filter(item => {
    // 分类过滤
    if (currentCategory !== 'all' && item.category !== currentCategory) {
      return false;
    }
    // 搜索过滤
    if (searchKeyword) {
      const lower = searchKeyword.toLowerCase();
      return (
        item.title?.toLowerCase().includes(lower) ||
        item.username?.toLowerCase().includes(lower) ||
        item.website?.toLowerCase().includes(lower)
      );
    }
    return true;
  });

  // 复制密码
  const copyPassword = async (item, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.password);
      setCopied(item.id);
      setTimeout(() => setCopied(null), 2000);

      // 30秒后清除剪贴板
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, 30000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 获取分类信息
  const getCategoryInfo = (categoryId) => {
    return categories.find(c => c.id === categoryId) || categories[4];
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-primary-500 text-white px-4 pt-4 pb-6 safe-top">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">密码保险箱</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => lock()}
              className="p-2 hover:bg-white/10 rounded-lg"
              title="锁定"
            >
              🔒
            </button>
            <Link
              to="/settings"
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              ⚙️
            </Link>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索密码..."
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 分类标签 */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex px-4 py-3 gap-2">
          <button
            onClick={() => setCurrentCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              currentCategory === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部 ({stats.total})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCurrentCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                currentCategory === cat.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={currentCategory === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.icon} {cat.name} ({stats.byCategory[cat.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* 密码列表 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full loading"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔐</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {searchKeyword ? '没有找到匹配的密码' : '还没有保存的密码'}
            </h3>
            {!searchKeyword && (
              <p className="text-gray-500 mb-6">点击下方按钮添加您的第一个密码</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const catInfo = getCategoryInfo(item.category);
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="bg-white rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: catInfo.color }}
                  >
                    {item.title?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{item.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{item.username}</p>
                  </div>
                  <button
                    onClick={(e) => copyPassword(item, e)}
                    className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
                    title="复制密码"
                  >
                    {copied === item.id ? '✓' : '📋'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加按钮 */}
      <Link
        to="/add"
        className="fixed right-6 bottom-6 w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:bg-primary-600 transition-colors safe-bottom"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        +
      </Link>
    </div>
  );
}
