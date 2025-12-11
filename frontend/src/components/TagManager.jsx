import { useState, useEffect } from 'react';
import { tags as tagsApi } from '../utils/api';

// 预设颜色
const PRESET_COLORS = [
  '#3b82f6', // 蓝色
  '#22c55e', // 绿色
  '#f59e0b', // 橙色
  '#ef4444', // 红色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉色
  '#06b6d4', // 青色
  '#6b7280'  // 灰色
];

/**
 * 标签管理组件
 */
export default function TagManager({ onClose, onTagsChange }) {
  const [tagList, setTagList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 新建/编辑标签
  const [editMode, setEditMode] = useState(null); // null | 'create' | tag.id
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);

  // 删除确认
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 加载标签列表
  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const { tags } = await tagsApi.getAll();
      setTagList(tags);
    } catch (err) {
      setError(err.message || '加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  // 开始创建标签
  const startCreate = () => {
    setEditMode('create');
    setEditName('');
    setEditColor(PRESET_COLORS[0]);
  };

  // 开始编辑标签
  const startEdit = (tag) => {
    setEditMode(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditMode(null);
    setEditName('');
    setEditColor(PRESET_COLORS[0]);
  };

  // 保存标签
  const saveTag = async () => {
    if (!editName.trim()) {
      setError('标签名称不能为空');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (editMode === 'create') {
        const { tag } = await tagsApi.create(editName.trim(), editColor);
        setTagList(prev => [...prev, tag]);
      } else {
        const { tag } = await tagsApi.update(editMode, editName.trim(), editColor);
        setTagList(prev => prev.map(t => t.id === editMode ? tag : t));
      }

      cancelEdit();
      onTagsChange?.();
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除标签
  const deleteTag = async (tagId) => {
    try {
      setLoading(true);
      await tagsApi.delete(tagId);
      setTagList(prev => prev.filter(t => t.id !== tagId));
      setDeleteConfirm(null);
      onTagsChange?.();
    } catch (err) {
      setError(err.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">标签管理</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-4">
          {loading && tagList.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 标签列表 */}
              {tagList.map(tag => (
                <div key={tag.id}>
                  {editMode === tag.id ? (
                    // 编辑模式
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="标签名称"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-transform ${
                              editColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                          取消
                        </button>
                        <button
                          onClick={saveTag}
                          disabled={loading}
                          className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : deleteConfirm === tag.id ? (
                    // 删除确认
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-sm text-red-700 mb-3">
                        确定要删除标签 <strong>{tag.name}</strong> 吗？
                        {tag.item_count > 0 && (
                          <span className="block mt-1">该标签下有 {tag.item_count} 个密码条目</span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => deleteTag(tag.id)}
                          disabled={loading}
                          className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          确认删除
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 正常显示
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-gray-800">{tag.name}</span>
                        <span className="text-xs text-gray-500">({tag.item_count || 0})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(tag)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(tag.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 新建标签 */}
              {editMode === 'create' ? (
                <div className="bg-primary-50 rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="新标签名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          editColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                    >
                      取消
                    </button>
                    <button
                      onClick={saveTag}
                      disabled={loading}
                      className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      创建
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={startCreate}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-lg">+</span>
                  <span>添加新标签</span>
                </button>
              )}

              {/* 空状态 */}
              {tagList.length === 0 && editMode !== 'create' && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏷️</div>
                  <p className="text-gray-500">还没有标签</p>
                  <p className="text-sm text-gray-400">点击上方按钮创建第一个标签</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 标签选择器组件 - 用于为密码条目选择标签
 */
export function TagSelector({ selectedTags = [], onTagsChange, allTags = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTag = (tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    if (isSelected) {
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="relative">
      {/* 已选标签 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] p-2 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 flex flex-wrap gap-2"
      >
        {selectedTags.length === 0 ? (
          <span className="text-gray-400 text-sm py-1">点击选择标签...</span>
        ) : (
          selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTag(tag);
                }}
                className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      {/* 下拉选择 */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-auto">
            {allTags.length === 0 ? (
              <div className="p-3 text-center text-gray-500 text-sm">
                暂无标签
              </div>
            ) : (
              allTags.map(tag => {
                const isSelected = selectedTags.some(t => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag)}
                    className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 ${
                      isSelected ? 'bg-primary-50' : ''
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-left text-sm">{tag.name}</span>
                    {isSelected && <span className="text-primary-500">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
