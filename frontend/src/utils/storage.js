/**
 * 本地存储模块 - 用于离线支持
 */

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  ENCRYPTION_SALT: 'encryptionSalt',
  CACHED_ITEMS: 'cachedItems',
  LAST_SYNC: 'lastSync',
  MASTER_KEY: 'masterKeyVerifier'
};

export const storage = {
  // Token
  getToken: () => localStorage.getItem(STORAGE_KEYS.TOKEN),
  setToken: (token) => localStorage.setItem(STORAGE_KEYS.TOKEN, token),
  removeToken: () => localStorage.removeItem(STORAGE_KEYS.TOKEN),

  // User
  getUser: () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(STORAGE_KEYS.USER),

  // Encryption Salt
  getSalt: () => localStorage.getItem(STORAGE_KEYS.ENCRYPTION_SALT),
  setSalt: (salt) => localStorage.setItem(STORAGE_KEYS.ENCRYPTION_SALT, salt),

  // Cached Items (for offline)
  getCachedItems: () => {
    const items = localStorage.getItem(STORAGE_KEYS.CACHED_ITEMS);
    return items ? JSON.parse(items) : [];
  },
  setCachedItems: (items) =>
    localStorage.setItem(STORAGE_KEYS.CACHED_ITEMS, JSON.stringify(items)),

  // Last Sync Time
  getLastSync: () => localStorage.getItem(STORAGE_KEYS.LAST_SYNC),
  setLastSync: (time) => localStorage.setItem(STORAGE_KEYS.LAST_SYNC, time),

  // Clear all
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  // Check if logged in
  isLoggedIn: () => !!localStorage.getItem(STORAGE_KEYS.TOKEN)
};

// Session storage for master key (more secure, clears on tab close)
export const session = {
  setMasterKey: (key) => sessionStorage.setItem('mk', key),
  getMasterKey: () => sessionStorage.getItem('mk'),
  clearMasterKey: () => sessionStorage.removeItem('mk'),
  hasMasterKey: () => !!sessionStorage.getItem('mk')
};
