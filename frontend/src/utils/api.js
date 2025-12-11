/**
 * API 请求模块
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || '请求失败', response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('网络错误，请检查连接', 0);
  }
}

// 认证相关
export const auth = {
  register: (email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getMe: () => request('/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    })
};

// 密码库相关
export const vault = {
  getItems: () => request('/vault/items'),

  getItem: (id) => request(`/vault/items/${id}`),

  createItem: (encryptedData, iv, category) =>
    request('/vault/items', {
      method: 'POST',
      body: JSON.stringify({ encryptedData, iv, category })
    }),

  updateItem: (id, encryptedData, iv, category) =>
    request(`/vault/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ encryptedData, iv, category })
    }),

  deleteItem: (id) =>
    request(`/vault/items/${id}`, { method: 'DELETE' }),

  sync: (items, lastSyncTime) =>
    request('/vault/sync', {
      method: 'POST',
      body: JSON.stringify({ items, lastSyncTime })
    }),

  getStats: () => request('/vault/stats'),

  exportData: () => request('/vault/export'),

  importData: (items, mode = 'merge') =>
    request('/vault/import', {
      method: 'POST',
      body: JSON.stringify({ items, mode })
    }),

  // 收藏相关
  getFavorites: () => request('/vault/favorites'),

  toggleFavorite: (id) =>
    request(`/vault/items/${id}/favorite`, { method: 'POST' }),

  reorderFavorites: (items) =>
    request('/vault/favorites/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items })
    })
};

// 标签相关
export const tags = {
  getAll: () => request('/tags'),

  create: (name, color) =>
    request('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color })
    }),

  update: (id, name, color) =>
    request(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color })
    }),

  delete: (id) =>
    request(`/tags/${id}`, { method: 'DELETE' }),

  getItemsByTag: (tagId) => request(`/tags/${tagId}/items`),

  // 密码条目标签
  getItemTags: (itemId) => request(`/tags/items/${itemId}/tags`),

  setItemTags: (itemId, tagIds) =>
    request(`/tags/items/${itemId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds })
    })
};

export { ApiError };
