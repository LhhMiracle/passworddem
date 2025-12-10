import { createContext, useContext, useState, useCallback } from 'react';
import { vault as vaultApi } from '../utils/api';
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

export function VaultProvider({ children }) {
  const { encryptionKey } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载所有密码
  const loadItems = useCallback(async () => {
    if (!encryptionKey) return;

    setLoading(true);
    try {
      const { items: encryptedItems } = await vaultApi.getItems();

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
      byCategory: CATEGORIES.reduce((acc, cat) => {
        acc[cat.id] = items.filter(i => i.category === cat.id).length;
        return acc;
      }, {})
    };
  };

  const value = {
    items,
    loading,
    loadItems,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    filterByCategory,
    getStats,
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
