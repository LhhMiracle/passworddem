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

  getStats: () => request('/vault/stats')
};

export { ApiError };
