/**
 * 附件管理路由
 * 支持上传加密文件、文件预览
 * 限制：10MB，支持 PDF/PNG/JPG/JPEG
 */

const express = require('express');
const { getDb } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 允许的文件类型
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 上传附件
 * POST /api/attachments
 */
router.post('/', authMiddleware, express.json({ limit: '15mb' }), (req, res) => {
  try {
    const { itemId, filename, mimeType, encryptedData, iv } = req.body;
    const userId = req.user.id;

    if (!itemId || !filename || !mimeType || !encryptedData || !iv) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: '不支持的文件类型，仅支持 PDF、PNG、JPG' });
    }

    // 估算加密后数据大小（base64编码约增加33%）
    const estimatedSize = Math.ceil(encryptedData.length * 0.75);
    if (estimatedSize > MAX_FILE_SIZE) {
      return res.status(400).json({ error: '文件大小超过10MB限制' });
    }

    const db = getDb();

    // 验证该条目属于当前用户
    const item = db.prepare('SELECT id FROM vault_items WHERE id = ? AND user_id = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ error: '条目不存在' });
    }

    // 生成唯一文件名
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 保存附件
    const stmt = db.prepare(`
      INSERT INTO attachments (user_id, item_id, filename, original_name, mime_type, size, encrypted_data, iv)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      itemId,
      uniqueFilename,
      filename,
      mimeType,
      estimatedSize,
      encryptedData,
      iv
    );

    res.json({
      id: result.lastInsertRowid,
      filename: uniqueFilename,
      originalName: filename,
      mimeType,
      size: estimatedSize
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: '上传附件失败' });
  }
});

/**
 * 获取条目的附件列表
 * GET /api/attachments/item/:itemId
 */
router.get('/item/:itemId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { itemId } = req.params;

    // 验证该条目属于当前用户
    const item = db.prepare('SELECT id FROM vault_items WHERE id = ? AND user_id = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ error: '条目不存在' });
    }

    const attachments = db.prepare(`
      SELECT id, filename, original_name, mime_type, size, created_at
      FROM attachments
      WHERE item_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `).all(itemId, userId);

    res.json({
      attachments: attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        originalName: att.original_name,
        mimeType: att.mime_type,
        size: att.size,
        createdAt: att.created_at
      }))
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: '获取附件列表失败' });
  }
});

/**
 * 获取附件详情（包含加密数据）
 * GET /api/attachments/:id
 */
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const attachment = db.prepare(`
      SELECT * FROM attachments WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }

    res.json({
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.original_name,
      mimeType: attachment.mime_type,
      size: attachment.size,
      encryptedData: attachment.encrypted_data,
      iv: attachment.iv,
      createdAt: attachment.created_at
    });
  } catch (error) {
    console.error('Get attachment error:', error);
    res.status(500).json({ error: '获取附件失败' });
  }
});

/**
 * 删除附件
 * DELETE /api/attachments/:id
 */
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const result = db.prepare(`
      DELETE FROM attachments WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '附件不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: '删除附件失败' });
  }
});

/**
 * 获取用户所有附件统计
 * GET /api/attachments/stats
 */
router.get('/stats/summary', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const stats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as totalSize
      FROM attachments
      WHERE user_id = ?
    `).get(userId);

    res.json({
      count: stats.count,
      totalSize: stats.totalSize
    });
  } catch (error) {
    console.error('Get attachment stats error:', error);
    res.status(500).json({ error: '获取附件统计失败' });
  }
});

module.exports = router;
