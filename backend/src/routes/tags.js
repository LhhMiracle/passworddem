/**
 * 标签管理路由
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

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

// 获取所有标签
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const tags = db.prepare(`
      SELECT t.*, COUNT(it.item_id) as item_count
      FROM tags t
      LEFT JOIN item_tags it ON t.id = it.tag_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.name ASC
    `).all(req.user.userId);

    res.json({ tags, presetColors: PRESET_COLORS });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: '获取标签列表失败' });
  }
});

// 创建标签
const createTagValidation = [
  body('name').notEmpty().withMessage('标签名称不能为空').trim(),
  body('color').optional().isString()
];

router.post('/', createTagValidation, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, color = '#3b82f6' } = req.body;
    const db = getDb();

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?')
      .get(req.user.userId, name);

    if (existing) {
      return res.status(400).json({ error: '标签已存在' });
    }

    const result = db.prepare(`
      INSERT INTO tags (user_id, name, color)
      VALUES (?, ?, ?)
    `).run(req.user.userId, name, color);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '创建成功',
      tag: { ...tag, item_count: 0 }
    });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: '创建标签失败' });
  }
});

// 更新标签
router.put('/:id', (req, res) => {
  try {
    const { name, color } = req.body;
    const db = getDb();

    // 检查是否存在且属于当前用户
    const existing = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.userId);

    if (!existing) {
      return res.status(404).json({ error: '标签不存在' });
    }

    // 检查名称是否冲突
    if (name) {
      const conflict = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?')
        .get(req.user.userId, name, req.params.id);
      if (conflict) {
        return res.status(400).json({ error: '标签名称已存在' });
      }
    }

    // 构建更新语句
    const updates = [];
    const values = [];
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (color) {
      updates.push('color = ?');
      values.push(color);
    }

    if (updates.length > 0) {
      values.push(req.params.id, req.user.userId);
      db.prepare(`
        UPDATE tags SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ?
      `).run(...values);
    }

    const tag = db.prepare(`
      SELECT t.*, COUNT(it.item_id) as item_count
      FROM tags t
      LEFT JOIN item_tags it ON t.id = it.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(req.params.id);

    res.json({ message: '更新成功', tag });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: '更新标签失败' });
  }
});

// 删除标签
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();

    const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: '删除标签失败' });
  }
});

// 获取标签下的所有密码条目
router.get('/:id/items', (req, res) => {
  try {
    const db = getDb();

    // 验证标签属于当前用户
    const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.userId);

    if (!tag) {
      return res.status(404).json({ error: '标签不存在' });
    }

    const items = db.prepare(`
      SELECT vi.id, vi.encrypted_data, vi.iv, vi.category, vi.is_favorite, vi.created_at, vi.updated_at
      FROM vault_items vi
      INNER JOIN item_tags it ON vi.id = it.item_id
      WHERE it.tag_id = ? AND vi.user_id = ?
      ORDER BY vi.updated_at DESC
    `).all(req.params.id, req.user.userId);

    res.json({ items });
  } catch (error) {
    console.error('Get tag items error:', error);
    res.status(500).json({ error: '获取标签条目失败' });
  }
});

// 为密码条目添加标签
router.post('/items/:itemId/tags', (req, res) => {
  try {
    const { tagIds } = req.body;

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: '标签ID列表格式错误' });
    }

    const db = getDb();

    // 验证密码条目属于当前用户
    const item = db.prepare('SELECT id FROM vault_items WHERE id = ? AND user_id = ?')
      .get(req.params.itemId, req.user.userId);

    if (!item) {
      return res.status(404).json({ error: '密码条目不存在' });
    }

    // 删除现有标签关联
    db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(req.params.itemId);

    // 添加新的标签关联
    if (tagIds.length > 0) {
      const insertStmt = db.prepare('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)');
      const insertMany = db.transaction((ids) => {
        for (const tagId of ids) {
          // 验证标签属于当前用户
          const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?')
            .get(tagId, req.user.userId);
          if (tag) {
            insertStmt.run(req.params.itemId, tagId);
          }
        }
      });
      insertMany(tagIds);
    }

    // 获取更新后的标签列表
    const itemTags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN item_tags it ON t.id = it.tag_id
      WHERE it.item_id = ?
    `).all(req.params.itemId);

    res.json({ message: '标签更新成功', tags: itemTags });
  } catch (error) {
    console.error('Update item tags error:', error);
    res.status(500).json({ error: '更新标签失败' });
  }
});

// 获取密码条目的标签
router.get('/items/:itemId/tags', (req, res) => {
  try {
    const db = getDb();

    // 验证密码条目属于当前用户
    const item = db.prepare('SELECT id FROM vault_items WHERE id = ? AND user_id = ?')
      .get(req.params.itemId, req.user.userId);

    if (!item) {
      return res.status(404).json({ error: '密码条目不存在' });
    }

    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN item_tags it ON t.id = it.tag_id
      WHERE it.item_id = ?
    `).all(req.params.itemId);

    res.json({ tags });
  } catch (error) {
    console.error('Get item tags error:', error);
    res.status(500).json({ error: '获取标签失败' });
  }
});

module.exports = router;
