/**
 * 密码保险箱路由 - CRUD操作
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取所有密码条目
router.get('/items', (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT id, encrypted_data, iv, category, created_at, updated_at
      FROM vault_items
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.user.userId);

    res.json({ items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: '获取密码列表失败' });
  }
});

// 获取单个密码条目
router.get('/items/:id', (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare(`
      SELECT id, encrypted_data, iv, category, created_at, updated_at
      FROM vault_items
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.userId);

    if (!item) {
      return res.status(404).json({ error: '密码条目不存在' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: '获取密码详情失败' });
  }
});

// 添加密码条目验证
const createItemValidation = [
  body('encryptedData').notEmpty().withMessage('加密数据不能为空'),
  body('iv').notEmpty().withMessage('IV不能为空'),
  body('category').optional().isString()
];

// 添加密码条目
router.post('/items', createItemValidation, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { encryptedData, iv, category = 'login' } = req.body;
    const db = getDb();

    const result = db.prepare(`
      INSERT INTO vault_items (user_id, encrypted_data, iv, category)
      VALUES (?, ?, ?, ?)
    `).run(req.user.userId, encryptedData, iv, category);

    const item = db.prepare('SELECT * FROM vault_items WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '添加成功',
      item: {
        id: item.id,
        encrypted_data: item.encrypted_data,
        iv: item.iv,
        category: item.category,
        created_at: item.created_at,
        updated_at: item.updated_at
      }
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: '添加密码失败' });
  }
});

// 更新密码条目
router.put('/items/:id', (req, res) => {
  try {
    const { encryptedData, iv, category } = req.body;
    const db = getDb();

    // 检查是否存在且属于当前用户
    const existing = db.prepare('SELECT id FROM vault_items WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.userId);

    if (!existing) {
      return res.status(404).json({ error: '密码条目不存在' });
    }

    db.prepare(`
      UPDATE vault_items
      SET encrypted_data = ?, iv = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(encryptedData, iv, category, req.params.id, req.user.userId);

    const item = db.prepare('SELECT * FROM vault_items WHERE id = ?').get(req.params.id);

    res.json({
      message: '更新成功',
      item: {
        id: item.id,
        encrypted_data: item.encrypted_data,
        iv: item.iv,
        category: item.category,
        created_at: item.created_at,
        updated_at: item.updated_at
      }
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: '更新密码失败' });
  }
});

// 删除密码条目
router.delete('/items/:id', (req, res) => {
  try {
    const db = getDb();

    const result = db.prepare('DELETE FROM vault_items WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '密码条目不存在' });
    }

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: '删除密码失败' });
  }
});

// 批量同步（用于离线同步）
router.post('/sync', (req, res) => {
  try {
    const { items, lastSyncTime } = req.body;
    const db = getDb();

    // 获取服务器上更新的条目
    let serverItems = [];
    if (lastSyncTime) {
      serverItems = db.prepare(`
        SELECT id, encrypted_data, iv, category, created_at, updated_at
        FROM vault_items
        WHERE user_id = ? AND updated_at > ?
      `).all(req.user.userId, lastSyncTime);
    } else {
      serverItems = db.prepare(`
        SELECT id, encrypted_data, iv, category, created_at, updated_at
        FROM vault_items
        WHERE user_id = ?
      `).all(req.user.userId);
    }

    // 处理客户端提交的更新
    if (items && items.length > 0) {
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO vault_items (id, user_id, encrypted_data, iv, category, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const insertMany = db.transaction((items) => {
        for (const item of items) {
          insertStmt.run(item.id || null, req.user.userId, item.encryptedData, item.iv, item.category);
        }
      });

      insertMany(items);
    }

    res.json({
      serverItems,
      syncTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: '同步失败' });
  }
});

// 获取统计信息
router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    const total = db.prepare('SELECT COUNT(*) as count FROM vault_items WHERE user_id = ?')
      .get(req.user.userId).count;

    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM vault_items
      WHERE user_id = ?
      GROUP BY category
    `).all(req.user.userId);

    res.json({
      total,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

module.exports = router;
