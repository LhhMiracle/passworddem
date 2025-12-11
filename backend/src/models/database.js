/**
 * 数据库模块 - SQLite
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/vault.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      encryption_salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 密码条目表（存储加密后的数据）
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      encrypted_data TEXT NOT NULL,
      iv TEXT NOT NULL,
      category TEXT DEFAULT 'login',
      is_favorite INTEGER DEFAULT 0,
      favorite_order INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);

  // 密码条目-标签关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (item_id, tag_id),
      FOREIGN KEY (item_id) REFERENCES vault_items(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
    CREATE INDEX IF NOT EXISTS idx_vault_items_favorite ON vault_items(user_id, is_favorite);
    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
    CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);
  `);

  // 添加新列（如果不存在）- 用于升级现有数据库
  try {
    db.exec(`ALTER TABLE vault_items ADD COLUMN is_favorite INTEGER DEFAULT 0`);
  } catch (e) {
    // 列已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE vault_items ADD COLUMN favorite_order INTEGER`);
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 2FA 相关列
  try {
    db.exec(`ALTER TABLE users ADD COLUMN totp_secret TEXT`);
  } catch (e) {
    // 列已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0`);
  } catch (e) {
    // 列已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN backup_codes TEXT`);
  } catch (e) {
    // 列已存在，忽略错误
  }

  // WebAuthn 相关列
  try {
    db.exec(`ALTER TABLE users ADD COLUMN webauthn_credentials TEXT`);
  } catch (e) {
    // 列已存在，忽略错误
  }

  console.log('✅ Database initialized');
}

module.exports = { getDb, initDatabase };
