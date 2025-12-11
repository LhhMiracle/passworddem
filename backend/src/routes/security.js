/**
 * 安全相关 API 路由
 * 包括密码泄露检测等功能
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 所有安全路由都需要认证
router.use(authenticateToken);

/**
 * HIBP (Have I Been Pwned) API 代理
 * 使用 k-anonymity 模型，只发送 SHA-1 哈希的前5位
 * GET /api/security/hibp/:prefix
 */
router.get('/hibp/:prefix', async (req, res) => {
  try {
    const { prefix } = req.params;

    // 验证 prefix 格式 (5位十六进制)
    if (!/^[0-9A-Fa-f]{5}$/.test(prefix)) {
      return res.status(400).json({ error: '无效的哈希前缀' });
    }

    // 调用 HIBP API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'PasswordVault-SecurityCheck'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
      }
      throw new Error(`HIBP API error: ${response.status}`);
    }

    const text = await response.text();
    res.type('text/plain').send(text);
  } catch (error) {
    console.error('HIBP API 请求失败:', error);
    res.status(500).json({ error: '密码泄露检测失败' });
  }
});

/**
 * 检查单个密码是否泄露
 * POST /api/security/check-breach
 * Body: { hashPrefix: string, hashSuffix: string }
 */
router.post('/check-breach', async (req, res) => {
  try {
    const { hashPrefix, hashSuffix } = req.body;

    // 验证输入
    if (!/^[0-9A-Fa-f]{5}$/.test(hashPrefix)) {
      return res.status(400).json({ error: '无效的哈希前缀' });
    }
    if (!/^[0-9A-Fa-f]{35}$/.test(hashSuffix)) {
      return res.status(400).json({ error: '无效的哈希后缀' });
    }

    // 调用 HIBP API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
      headers: {
        'User-Agent': 'PasswordVault-SecurityCheck'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
      }
      throw new Error(`HIBP API error: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [suffix, count] = line.split(':');
      if (suffix.toUpperCase() === hashSuffix.toUpperCase()) {
        return res.json({
          breached: true,
          count: parseInt(count.trim(), 10)
        });
      }
    }

    res.json({ breached: false, count: 0 });
  } catch (error) {
    console.error('泄露检测失败:', error);
    res.status(500).json({ error: '密码泄露检测失败' });
  }
});

module.exports = router;
