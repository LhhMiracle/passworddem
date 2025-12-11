import { createContext, useContext, useState, useCallback } from 'react';
import { vault as vaultApi, tags as tagsApi } from '../utils/api';
import { encryptData, decryptData } from '../utils/crypto';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';

const VaultContext = createContext(null);

// 分类定义
export const CATEGORIES = [
  { id: 'login', name: '登录账号', icon: '👤', color: '#0052CC' },
  { id: 'card', name: '银行卡', icon: '💳', color: '#22c55e' },
  { id: 'note', name: '安全笔记', icon: '📝', color: '#f59e0b' },
  { id: 'wifi', name: 'WiFi密码', icon: '📶', color: '#8b5cf6' },
  { id: 'other', name: '其他', icon: '📦', color: '#6b7280' }
];

// 特殊筛选项
export const SPECIAL_FILTERS = [
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'favorites', name: '收藏', icon: '⭐' }
];

export function VaultProvider({ children }) {
  const { encryptionKey } = useAuth();
  const [items, setItems] = useState([]);
  const [rawItems, setRawItems] = useState({}); // 存储原始加密数据
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载所有密码
  const loadItems = useCallback(async () => {
    if (!encryptionKey) return;

    setLoading(true);
    try {
      const { items: encryptedItems } = await vaultApi.getItems();

      // 存储原始加密数据
      const rawMap = {};
      encryptedItems.forEach(item => {
        rawMap[item.id] = {
          encryptedData: item.encrypted_data,
          iv: item.iv
        };
      });
      setRawItems(rawMap);

      // 解密所有条目
      const decryptedItems = await Promise.all(
        encryptedItems.map(async (item) => {
          try {
            const decrypted = await decryptData(
              item.encrypted_data,
              item.iv,
              encryptionKey
            );
            return {
              id: item.id,
              ...decrypted,
              category: item.category,
              isFavorite: !!item.is_favorite,
              favoriteOrder: item.favorite_order,
              tags: item.tags || [],
              createdAt: item.created_at,
              updatedAt: item.updated_at
            };
          } catch (error) {
            console.error('解密失败:', error);
            return null;
          }
        })
      );

      const validItems = decryptedItems.filter(Boolean);
      setItems(validItems);
      storage.setCachedItems(validItems);
    } catch (error) {
      // 离线时使用缓存
      const cached = storage.getCachedItems();
      if (cached.length > 0) {
        setItems(cached);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [encryptionKey]);

  // 加载所有标签
  const loadTags = useCallback(async () => {
    try {
      const { tags: tagList } = await tagsApi.getAll();
      setTags(tagList);
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  }, []);

  // 添加密码
  const addItem = async (itemData) => {
    if (!encryptionKey) throw new Error('未解锁');

    const { encryptedData, iv } = await encryptData(itemData, encryptionKey);
    const { item } = await vaultApi.createItem(encryptedData, iv, itemData.category);

    const newItem = {
      id: item.id,
      ...itemData,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };

    setItems(prev => [newItem, ...prev]);
    return newItem;
  };

  // 更新密码
  const updateItem = async (id, itemData) => {
    if (!encryptionKey) throw new Error('未解锁');

    const { encryptedData, iv } = await encryptData(itemData, encryptionKey);
    const { item } = await vaultApi.updateItem(id, encryptedData, iv, itemData.category);

    setItems(prev =>
      prev.map(i =>
        i.id === id
          ? { ...itemData, id, createdAt: i.createdAt, updatedAt: item.updated_at }
          : i
      )
    );
  };

  // 删除密码
  const deleteItem = async (id) => {
    await vaultApi.deleteItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // 搜索密码
  const searchItems = (keyword) => {
    if (!keyword) return items;
    const lower = keyword.toLowerCase();
    return items.filter(
      item =>
        item.title?.toLowerCase().includes(lower) ||
        item.username?.toLowerCase().includes(lower) ||
        item.website?.toLowerCase().includes(lower)
    );
  };

  // 按分类筛选
  const filterByCategory = (category) => {
    if (!category || category === 'all') return items;
    return items.filter(item => item.category === category);
  };

  // 获取统计
  const getStats = () => {
    return {
      total: items.length,
      favorites: items.filter(i => i.isFavorite).length,
      byCategory: CATEGORIES.reduce((acc, cat) => {
        acc[cat.id] = items.filter(i => i.category === cat.id).length;
        return acc;
      }, {}),
      byTag: tags.reduce((acc, tag) => {
        acc[tag.id] = items.filter(i => i.tags?.some(t => t.id === tag.id)).length;
        return acc;
      }, {})
    };
  };

  // 切换收藏状态
  const toggleFavorite = async (id) => {
    try {
      const result = await vaultApi.toggleFavorite(id);

      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, isFavorite: !!result.is_favorite, favoriteOrder: result.favorite_order }
            : item
        )
      );

      return result;
    } catch (error) {
      console.error('切换收藏失败:', error);
      throw error;
    }
  };

  // 按标签筛选
  const filterByTag = (tagId) => {
    if (!tagId) return items;
    return items.filter(item => item.tags?.some(t => t.id === tagId));
  };

  // 获取收藏列表
  const getFavorites = () => {
    return items
      .filter(i => i.isFavorite)
      .sort((a, b) => (a.favoriteOrder || 0) - (b.favoriteOrder || 0));
  };

  // 更新条目标签
  const updateItemTags = async (itemId, tagIds) => {
    try {
      const { tags: newTags } = await tagsApi.setItemTags(itemId, tagIds);

      setItems(prev =>
        prev.map(item =>
          item.id === itemId
            ? { ...item, tags: newTags }
            : item
        )
      );

      return newTags;
    } catch (error) {
      console.error('更新标签失败:', error);
      throw error;
    }
  };

  // 获取条目的原始加密数据
  const getItemRaw = (itemId) => {
    return rawItems[itemId] || null;
  };

  // 解密单个条目（用于共享页面）
  const decryptItem = (item) => {
    return items.find(i => i.id === item.id);
  };

  const value = {
    items,
    tags,
    loading,
    loadItems,
    loadTags,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    filterByCategory,
    filterByTag,
    getStats,
    getFavorites,
    toggleFavorite,
    updateItemTags,
    getItemRaw,
    decryptItem,
    categories: CATEGORIES
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within VaultProvider');
  }
  return context;
}
