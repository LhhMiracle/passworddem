/**
 * 用户认证路由
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../models/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { verifyTOTP } = require('./twofa');

const router = express.Router();

// 注册验证规则
const registerValidation = [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 8 }).withMessage('密码至少需要8位')
];

// 注册
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const db = getDb();

    // 检查邮箱是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 生成密码哈希和加密盐值
    const passwordHash = await bcrypt.hash(password, 12);
    const encryptionSalt = crypto.randomBytes(32).toString('hex');

    // 创建用户
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, encryption_salt)
      VALUES (?, ?, ?)
    `).run(email, passwordHash, encryptionSalt);

    const token = generateToken(result.lastInsertRowid, email);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: result.lastInsertRowid,
        email
      },
      encryptionSalt
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录验证规则
const loginValidation = [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').notEmpty().withMessage('请输入密码')
];

// 登录
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password, totpToken } = req.body;
    const db = getDb();

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 检查是否启用了 2FA
    if (user.totp_enabled) {
      // 如果没有提供 TOTP 码，返回需要 2FA 的响应
      if (!totpToken) {
        return res.json({
          requiresTwoFactor: true,
          message: '请输入双因素认证码'
        });
      }

      // 验证 TOTP 或备份码
      let verified = false;

      if (totpToken.length === 6) {
        verified = verifyTOTP(user.totp_secret, totpToken);
      } else if (totpToken.length === 9 && totpToken.includes('-')) {
        // 备份码验证
        const backupCodes = JSON.parse(user.backup_codes || '[]');
        const index = backupCodes.indexOf(totpToken.toUpperCase());
        if (index !== -1) {
          verified = true;
          // 移除已使用的备份码
          backupCodes.splice(index, 1);
          db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?')
            .run(JSON.stringify(backupCodes), user.id);
        }
      }

      if (!verified) {
        return res.status(401).json({ error: '验证码错误' });
      }
    }

    const token = generateToken(user.id, email);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        email: user.email
      },
      encryptionSalt: user.encryption_salt
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, encryption_salt, totp_enabled, created_at FROM users WHERE id = ?')
    .get(req.user.userId);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      twoFactorEnabled: !!user.totp_enabled
    },
    encryptionSalt: user.encryption_salt
  });
});

// 修改密码
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '请提供当前密码和新密码' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: '新密码至少需要8位' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    // 验证当前密码
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    // 更新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newPasswordHash, req.user.userId);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '密码修改失败' });
  }
});

module.exports = router;
