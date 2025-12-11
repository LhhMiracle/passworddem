/**
 * 双因素认证 (2FA) 路由
 * 支持 TOTP (基于时间的一次性密码)
 */

const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 所有 2FA 路由都需要认证
router.use(authenticateToken);

// TOTP 配置
const TOTP_CONFIG = {
  issuer: 'PasswordVault',
  algorithm: 'SHA1',
  digits: 6,
  period: 30
};

/**
 * 生成 Base32 编码的密钥
 */
function generateBase32Secret(length = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += chars[bytes[i] % 32];
  }
  return secret;
}

/**
 * Base32 解码
 */
function base32Decode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of str.toUpperCase()) {
    const val = chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * 生成 TOTP 码
 */
function generateTOTP(secret, time = Date.now()) {
  const counter = Math.floor(time / 1000 / TOTP_CONFIG.period);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_CONFIG.digits);

  return code.toString().padStart(TOTP_CONFIG.digits, '0');
}

/**
 * 验证 TOTP 码 (允许前后各一个时间窗口的偏差)
 */
function verifyTOTP(secret, token) {
  const now = Date.now();
  const window = TOTP_CONFIG.period * 1000;

  for (let i = -1; i <= 1; i++) {
    const expectedToken = generateTOTP(secret, now + i * window);
    if (expectedToken === token) {
      return true;
    }
  }
  return false;
}

/**
 * 生成备份码
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * 获取 2FA 状态
 * GET /api/2fa/status
 */
router.get('/status', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT totp_enabled FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      enabled: !!user.totp_enabled
    });
  } catch (error) {
    console.error('获取 2FA 状态失败:', error);
    res.status(500).json({ error: '获取状态失败' });
  }
});

/**
 * 开始设置 2FA
 * POST /api/2fa/setup
 * 返回 secret 和 QR 码 URL
 */
router.post('/setup', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT email, totp_enabled FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.totp_enabled) {
      return res.status(400).json({ error: '2FA 已启用' });
    }

    // 生成新的 TOTP 密钥
    const secret = generateBase32Secret(20);

    // 临时保存密钥（尚未启用）
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?')
      .run(secret, req.user.userId);

    // 生成 otpauth URL (用于 QR 码)
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(TOTP_CONFIG.issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(TOTP_CONFIG.issuer)}&algorithm=${TOTP_CONFIG.algorithm}&digits=${TOTP_CONFIG.digits}&period=${TOTP_CONFIG.period}`;

    res.json({
      secret,
      otpauthUrl,
      qrCode: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`
    });
  } catch (error) {
    console.error('设置 2FA 失败:', error);
    res.status(500).json({ error: '设置失败' });
  }
});

/**
 * 验证并启用 2FA
 * POST /api/2fa/enable
 * Body: { token: string }
 */
router.post('/enable', (req, res) => {
  try {
    const { token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: '请输入6位验证码' });
    }

    const db = getDb();
    const user = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.totp_enabled) {
      return res.status(400).json({ error: '2FA 已启用' });
    }

    if (!user.totp_secret) {
      return res.status(400).json({ error: '请先调用 setup 接口' });
    }

    // 验证 TOTP
    if (!verifyTOTP(user.totp_secret, token)) {
      return res.status(400).json({ error: '验证码错误' });
    }

    // 生成备份码
    const backupCodes = generateBackupCodes(10);

    // 启用 2FA
    db.prepare('UPDATE users SET totp_enabled = 1, backup_codes = ? WHERE id = ?')
      .run(JSON.stringify(backupCodes), req.user.userId);

    res.json({
      message: '2FA 已启用',
      backupCodes
    });
  } catch (error) {
    console.error('启用 2FA 失败:', error);
    res.status(500).json({ error: '启用失败' });
  }
});

/**
 * 禁用 2FA
 * POST /api/2fa/disable
 * Body: { token: string }
 */
router.post('/disable', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: '请输入验证码' });
    }

    const db = getDb();
    const user = db.prepare('SELECT totp_secret, totp_enabled, backup_codes FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (!user.totp_enabled) {
      return res.status(400).json({ error: '2FA 未启用' });
    }

    // 验证 TOTP 或备份码
    let verified = false;

    if (token.length === 6) {
      verified = verifyTOTP(user.totp_secret, token);
    } else if (token.length === 9 && token.includes('-')) {
      // 备份码验证
      const backupCodes = JSON.parse(user.backup_codes || '[]');
      const index = backupCodes.indexOf(token.toUpperCase());
      if (index !== -1) {
        verified = true;
        // 移除已使用的备份码
        backupCodes.splice(index, 1);
        db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?')
          .run(JSON.stringify(backupCodes), req.user.userId);
      }
    }

    if (!verified) {
      return res.status(400).json({ error: '验证码错误' });
    }

    // 禁用 2FA
    db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL, backup_codes = NULL WHERE id = ?')
      .run(req.user.userId);

    res.json({ message: '2FA 已禁用' });
  } catch (error) {
    console.error('禁用 2FA 失败:', error);
    res.status(500).json({ error: '禁用失败' });
  }
});

/**
 * 重新生成备份码
 * POST /api/2fa/regenerate-backup
 * Body: { token: string }
 */
router.post('/regenerate-backup', (req, res) => {
  try {
    const { token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: '请输入6位验证码' });
    }

    const db = getDb();
    const user = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user || !user.totp_enabled) {
      return res.status(400).json({ error: '2FA 未启用' });
    }

    // 验证 TOTP
    if (!verifyTOTP(user.totp_secret, token)) {
      return res.status(400).json({ error: '验证码错误' });
    }

    // 生成新的备份码
    const backupCodes = generateBackupCodes(10);

    db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?')
      .run(JSON.stringify(backupCodes), req.user.userId);

    res.json({
      message: '备份码已重新生成',
      backupCodes
    });
  } catch (error) {
    console.error('重新生成备份码失败:', error);
    res.status(500).json({ error: '重新生成失败' });
  }
});

// 导出 TOTP 验证函数供登录路由使用
module.exports = router;
module.exports.verifyTOTP = verifyTOTP;
