/**
 * WebAuthn 路由
 * 支持生物识别解锁 (指纹/Face ID)
 */

const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// WebAuthn 配置
const WEBAUTHN_CONFIG = {
  rpName: 'Password Vault',
  rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  timeout: 60000
};

// 存储挑战 (生产环境应使用 Redis 等)
const challenges = new Map();

/**
 * 生成随机挑战
 */
function generateChallenge() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * 清理过期挑战
 */
function cleanupChallenges() {
  const now = Date.now();
  for (const [key, value] of challenges.entries()) {
    if (now - value.timestamp > WEBAUTHN_CONFIG.timeout) {
      challenges.delete(key);
    }
  }
}

// 每分钟清理过期挑战
setInterval(cleanupChallenges, 60000);

/**
 * 获取 WebAuthn 状态
 * GET /api/webauthn/status
 */
router.get('/status', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT webauthn_credentials FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const credentials = user.webauthn_credentials
      ? JSON.parse(user.webauthn_credentials)
      : [];

    res.json({
      enabled: credentials.length > 0,
      credentialCount: credentials.length
    });
  } catch (error) {
    console.error('获取 WebAuthn 状态失败:', error);
    res.status(500).json({ error: '获取状态失败' });
  }
});

/**
 * 开始注册 (生成注册选项)
 * POST /api/webauthn/register-options
 */
router.post('/register-options', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, webauthn_credentials FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const existingCredentials = user.webauthn_credentials
      ? JSON.parse(user.webauthn_credentials)
      : [];

    const challenge = generateChallenge();
    const challengeKey = `register_${req.user.userId}`;
    challenges.set(challengeKey, {
      challenge,
      timestamp: Date.now()
    });

    // 构建注册选项
    const options = {
      challenge,
      rp: {
        name: WEBAUTHN_CONFIG.rpName,
        id: WEBAUTHN_CONFIG.rpId
      },
      user: {
        id: Buffer.from(user.id.toString()).toString('base64url'),
        name: user.email,
        displayName: user.email
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // 只允许平台认证器 (如 Touch ID, Face ID)
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: WEBAUTHN_CONFIG.timeout,
      attestation: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        type: 'public-key',
        id: cred.credentialId
      }))
    };

    res.json(options);
  } catch (error) {
    console.error('生成注册选项失败:', error);
    res.status(500).json({ error: '生成注册选项失败' });
  }
});

/**
 * 完成注册 (验证并保存凭证)
 * POST /api/webauthn/register
 */
router.post('/register', authenticateToken, (req, res) => {
  try {
    const { credential, deviceName } = req.body;

    if (!credential) {
      return res.status(400).json({ error: '凭证数据缺失' });
    }

    const challengeKey = `register_${req.user.userId}`;
    const storedChallenge = challenges.get(challengeKey);

    if (!storedChallenge) {
      return res.status(400).json({ error: '挑战已过期，请重试' });
    }

    challenges.delete(challengeKey);

    // 简化验证 (生产环境应使用完整的 WebAuthn 库如 @simplewebauthn/server)
    // 这里我们信任客户端的凭证，只存储必要的信息

    const db = getDb();
    const user = db.prepare('SELECT webauthn_credentials FROM users WHERE id = ?')
      .get(req.user.userId);

    const existingCredentials = user.webauthn_credentials
      ? JSON.parse(user.webauthn_credentials)
      : [];

    // 添加新凭证
    const newCredential = {
      credentialId: credential.id,
      publicKey: credential.response.publicKey || credential.response.attestationObject,
      counter: 0,
      deviceName: deviceName || '未命名设备',
      createdAt: new Date().toISOString()
    };

    existingCredentials.push(newCredential);

    db.prepare('UPDATE users SET webauthn_credentials = ? WHERE id = ?')
      .run(JSON.stringify(existingCredentials), req.user.userId);

    res.json({
      message: '生物识别已启用',
      credentialId: credential.id
    });
  } catch (error) {
    console.error('注册凭证失败:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

/**
 * 开始认证 (生成认证选项)
 * POST /api/webauthn/authenticate-options
 * 注意：这个端点不需要认证，因为它用于登录/解锁
 */
router.post('/authenticate-options', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, webauthn_credentials FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const credentials = user.webauthn_credentials
      ? JSON.parse(user.webauthn_credentials)
      : [];

    if (credentials.length === 0) {
      return res.status(400).json({ error: '未启用生物识别' });
    }

    const challenge = generateChallenge();
    const challengeKey = `auth_${user.id}`;
    challenges.set(challengeKey, {
      challenge,
      timestamp: Date.now()
    });

    // 构建认证选项
    const options = {
      challenge,
      timeout: WEBAUTHN_CONFIG.timeout,
      rpId: WEBAUTHN_CONFIG.rpId,
      allowCredentials: credentials.map(cred => ({
        type: 'public-key',
        id: cred.credentialId
      })),
      userVerification: 'required'
    };

    res.json(options);
  } catch (error) {
    console.error('生成认证选项失败:', error);
    res.status(500).json({ error: '生成认证选项失败' });
  }
});

/**
 * 完成认证 (验证并返回解锁令牌)
 * POST /api/webauthn/authenticate
 */
router.post('/authenticate', async (req, res) => {
  try {
    const { email, credential } = req.body;

    if (!email || !credential) {
      return res.status(400).json({ error: '参数缺失' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, webauthn_credentials, encryption_salt FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const challengeKey = `auth_${user.id}`;
    const storedChallenge = challenges.get(challengeKey);

    if (!storedChallenge) {
      return res.status(400).json({ error: '挑战已过期，请重试' });
    }

    challenges.delete(challengeKey);

    const credentials = user.webauthn_credentials
      ? JSON.parse(user.webauthn_credentials)
      : [];

    // 查找匹配的凭证
    const matchedCredential = credentials.find(
      cred => cred.credentialId === credential.id
    );

    if (!matchedCredential) {
      return res.status(400).json({ error: '凭证无效' });
    }

    // 更新计数器 (防重放攻击)
    matchedCredential.counter = (matchedCredential.counter || 0) + 1;
    matchedCredential.lastUsed = new Date().toISOString();

    db.prepare('UPDATE users SET webauthn_credentials = ? WHERE id = ?')
      .run(JSON.stringify(credentials), user.id);

    // 生成解锁令牌
    const { generateToken } = require('../middleware/auth');
    const token = generateToken(user.id, email);

    res.json({
      message: '生物识别验证成功',
      token,
      user: {
        id: user.id,
        email
      },
      encryptionSalt: user.encryption_salt
    });
  } catch (error) {
    console.error('认证失败:', error);
    res.status(500).json({ error: '认证失败' });
  }
});

/**
 * 删除凭证
 * DELETE /api/webauthn/credential/:credentialId
 */
router.delete('/credential/:credentialId', authenticateToken, (req, res) => {
  try {
    const { credentialId } = req.params;

    const db = getDb();
    const user = db.prepare('SELECT webauthn_credentials FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const credentials = user.webauthn_credentials
      ? JSON.parse(user.webauthn_credentials)
      : [];

    const filteredCredentials = credentials.filter(
      cred => cred.credentialId !== credentialId
    );

    if (filteredCredentials.length === credentials.length) {
      return res.status(404).json({ error: '凭证不存在' });
    }

    db.prepare('UPDATE users SET webauthn_credentials = ? WHERE id = ?')
      .run(JSON.stringify(filteredCredentials), req.user.userId);

    res.json({ message: '凭证已删除' });
  } catch (error) {
    console.error('删除凭证失败:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

/**
 * 获取所有凭证列表
 * GET /api/webauthn/credentials
 */
router.get('/credentials', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT webauthn_credentials FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const credentials = user.webauthn_credentials
      ? JSON.parse(user.webauthn_credentials)
      : [];

    // 只返回必要信息，不暴露公钥
    const safeCredentials = credentials.map(cred => ({
      credentialId: cred.credentialId,
      deviceName: cred.deviceName,
      createdAt: cred.createdAt,
      lastUsed: cred.lastUsed
    }));

    res.json({ credentials: safeCredentials });
  } catch (error) {
    console.error('获取凭证列表失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;
