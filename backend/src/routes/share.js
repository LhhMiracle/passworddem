/**
 * 密码共享路由
 * 支持生成安全共享链接、设置过期时间、查看次数限制
 */

const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../models/database');
const { authenticate } = require('./auth');

const router = express.Router();

// 生成安全令牌
function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// 哈希共享密码
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 验证共享密码
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/**
 * 创建共享链接
 * POST /api/share
 */
router.post('/', authenticate, (req, res) => {
  try {
    const { itemId, expiresIn, maxViews, password, encryptedData, iv } = req.body;
    const userId = req.user.id;

    if (!itemId || !expiresIn || !encryptedData || !iv) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const db = getDb();

    // 验证该条目属于当前用户
    const item = db.prepare('SELECT id FROM vault_items WHERE id = ? AND user_id = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ error: '条目不存在' });
    }

    // 计算过期时间
    const expiresAt = new Date();
    switch (expiresIn) {
      case '1h':
        expiresAt.setHours(expiresAt.getHours() + 1);
        break;
      case '1d':
        expiresAt.setDate(expiresAt.getDate() + 1);
        break;
      case '7d':
        expiresAt.setDate(expiresAt.getDate() + 7);
        break;
      default:
        return res.status(400).json({ error: '无效的过期时间' });
    }

    // 生成共享令牌
    const token = generateToken();

    // 处理可选密码保护
    const passwordHash = password ? hashPassword(password) : null;

    // 保存共享链接
    const stmt = db.prepare(`
      INSERT INTO shared_links (user_id, item_id, token, encrypted_data, iv, expires_at, max_views, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      itemId,
      token,
      encryptedData,
      iv,
      expiresAt.toISOString(),
      maxViews || null,
      passwordHash
    );

    res.json({
      id: result.lastInsertRowid,
      token,
      expiresAt: expiresAt.toISOString(),
      maxViews: maxViews || null,
      hasPassword: !!password
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: '创建共享链接失败' });
  }
});

/**
 * 获取我的共享链接列表
 * GET /api/share
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const links = db.prepare(`
      SELECT
        sl.id, sl.token, sl.expires_at, sl.max_views, sl.view_count,
        sl.created_at, sl.revoked, sl.password_hash IS NOT NULL as has_password,
        vi.encrypted_data as item_encrypted_data, vi.iv as item_iv
      FROM shared_links sl
      JOIN vault_items vi ON sl.item_id = vi.id
      WHERE sl.user_id = ?
      ORDER BY sl.created_at DESC
    `).all(userId);

    res.json({
      links: links.map(link => ({
        id: link.id,
        token: link.token,
        expiresAt: link.expires_at,
        maxViews: link.max_views,
        viewCount: link.view_count,
        createdAt: link.created_at,
        revoked: !!link.revoked,
        hasPassword: !!link.has_password,
        isExpired: new Date(link.expires_at) < new Date(),
        isExhausted: link.max_views && link.view_count >= link.max_views,
        itemEncryptedData: link.item_encrypted_data,
        itemIv: link.item_iv
      }))
    });
  } catch (error) {
    console.error('Get share links error:', error);
    res.status(500).json({ error: '获取共享链接失败' });
  }
});

/**
 * 撤销共享链接
 * DELETE /api/share/:id
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const linkId = req.params.id;

    const result = db.prepare(`
      UPDATE shared_links SET revoked = 1 WHERE id = ? AND user_id = ?
    `).run(linkId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '链接不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke share link error:', error);
    res.status(500).json({ error: '撤销链接失败' });
  }
});

/**
 * 访问共享链接（公开接口）
 * POST /api/share/access/:token
 */
router.post('/access/:token', (req, res) => {
  try {
    const db = getDb();
    const { token } = req.params;
    const { password } = req.body;

    // 获取共享链接
    const link = db.prepare(`
      SELECT * FROM shared_links WHERE token = ?
    `).get(token);

    if (!link) {
      return res.status(404).json({ error: '链接不存在或已失效' });
    }

    // 检查是否已撤销
    if (link.revoked) {
      return res.status(410).json({ error: '链接已被撤销' });
    }

    // 检查是否过期
    if (new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: '链接已过期' });
    }

    // 检查查看次数
    if (link.max_views && link.view_count >= link.max_views) {
      return res.status(410).json({ error: '链接查看次数已用尽' });
    }

    // 检查密码
    if (link.password_hash) {
      if (!password) {
        return res.status(401).json({ error: '需要密码', requiresPassword: true });
      }
      if (!verifyPassword(password, link.password_hash)) {
        return res.status(401).json({ error: '密码错误' });
      }
    }

    // 更新查看次数
    db.prepare(`
      UPDATE shared_links SET view_count = view_count + 1 WHERE id = ?
    `).run(link.id);

    res.json({
      encryptedData: link.encrypted_data,
      iv: link.iv,
      viewCount: link.view_count + 1,
      maxViews: link.max_views,
      expiresAt: link.expires_at
    });
  } catch (error) {
    console.error('Access share link error:', error);
    res.status(500).json({ error: '访问共享链接失败' });
  }
});

/**
 * 检查共享链接状态（公开接口）
 * GET /api/share/check/:token
 */
router.get('/check/:token', (req, res) => {
  try {
    const db = getDb();
    const { token } = req.params;

    const link = db.prepare(`
      SELECT expires_at, max_views, view_count, revoked, password_hash IS NOT NULL as has_password
      FROM shared_links WHERE token = ?
    `).get(token);

    if (!link) {
      return res.status(404).json({ error: '链接不存在' });
    }

    const isExpired = new Date(link.expires_at) < new Date();
    const isExhausted = link.max_views && link.view_count >= link.max_views;

    res.json({
      valid: !link.revoked && !isExpired && !isExhausted,
      requiresPassword: !!link.has_password,
      expiresAt: link.expires_at,
      isExpired,
      isRevoked: !!link.revoked,
      isExhausted
    });
  } catch (error) {
    console.error('Check share link error:', error);
    res.status(500).json({ error: '检查链接失败' });
  }
});

module.exports = router;
