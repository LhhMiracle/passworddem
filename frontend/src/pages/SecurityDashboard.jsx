import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault, CATEGORIES } from '../context/VaultContext';
import { evaluatePasswordStrength, getStrengthColor } from '../utils/crypto';

// 密码年龄阈值 (天)
const PASSWORD_AGE_THRESHOLDS = {
  warning: 90,   // 90天警告
  danger: 180    // 180天危险
};

/**
 * 安全仪表盘页面
 * 提供密码健康报告和安全评分
 */
export default function SecurityDashboard() {
  const navigate = useNavigate();
  const { items, loading, loadItems } = useVault();
  const [activeTab, setActiveTab] = useState('overview');
  const [checkingBreach, setCheckingBreach] = useState(false);
  const [breachResults, setBreachResults] = useState(null);

  useEffect(() => {
    loadItems().catch(console.error);
  }, [loadItems]);

  // 分析密码安全状况
  const securityAnalysis = useMemo(() => {
    if (!items.length) {
      return {
        score: 100,
        duplicates: [],
        weakPasswords: [],
        oldPasswords: [],
        reusedPasswords: new Map(),
        stats: { total: 0, strong: 0, medium: 0, weak: 0, duplicated: 0, old: 0 }
      };
    }

    const now = new Date();
    const passwordMap = new Map(); // 密码 -> 条目列表
    const duplicates = [];
    const weakPasswords = [];
    const oldPasswords = [];
    let strongCount = 0;
    let mediumCount = 0;
    let weakCount = 0;

    items.forEach(item => {
      if (!item.password) return;

      // 检测重复密码
      const existing = passwordMap.get(item.password);
      if (existing) {
        existing.push(item);
      } else {
        passwordMap.set(item.password, [item]);
      }

      // 检测弱密码
      const strength = evaluatePasswordStrength(item.password);
      if (strength <= 1) {
        weakPasswords.push({ ...item, strength });
        weakCount++;
      } else if (strength <= 2) {
        mediumCount++;
      } else {
        strongCount++;
      }

      // 检测旧密码
      const updatedAt = new Date(item.updatedAt || item.createdAt);
      const ageInDays = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
      if (ageInDays >= PASSWORD_AGE_THRESHOLDS.warning) {
        oldPasswords.push({
          ...item,
          ageInDays,
          isDanger: ageInDays >= PASSWORD_AGE_THRESHOLDS.danger
        });
      }
    });

    // 提取重复密码
    passwordMap.forEach((itemList, password) => {
      if (itemList.length > 1) {
        duplicates.push({
          password: password.substring(0, 3) + '***',
          items: itemList,
          count: itemList.length
        });
      }
    });

    const duplicatedCount = duplicates.reduce((acc, d) => acc + d.count, 0);

    // 计算安全评分 (0-100)
    let score = 100;

    // 弱密码扣分 (每个扣 15 分，最多扣 40 分)
    score -= Math.min(40, weakPasswords.length * 15);

    // 重复密码扣分 (每组扣 10 分，最多扣 30 分)
    score -= Math.min(30, duplicates.length * 10);

    // 旧密码扣分 (每个扣 5 分，最多扣 20 分)
    score -= Math.min(20, oldPasswords.length * 5);

    // 中等强度密码轻微扣分 (每个扣 2 分，最多扣 10 分)
    score -= Math.min(10, mediumCount * 2);

    score = Math.max(0, score);

    return {
      score,
      duplicates,
      weakPasswords,
      oldPasswords,
      reusedPasswords: passwordMap,
      stats: {
        total: items.length,
        strong: strongCount,
        medium: mediumCount,
        weak: weakCount,
        duplicated: duplicatedCount,
        old: oldPasswords.length
      }
    };
  }, [items]);

  // 获取评分等级
  const getScoreGrade = (score) => {
    if (score >= 90) return { label: '优秀', color: '#22c55e', bg: 'bg-green-50' };
    if (score >= 70) return { label: '良好', color: '#84cc16', bg: 'bg-lime-50' };
    if (score >= 50) return { label: '一般', color: '#eab308', bg: 'bg-yellow-50' };
    if (score >= 30) return { label: '较差', color: '#f97316', bg: 'bg-orange-50' };
    return { label: '危险', color: '#ef4444', bg: 'bg-red-50' };
  };

  const scoreGrade = getScoreGrade(securityAnalysis.score);

  // 检测密码泄露 (HIBP API)
  const checkPasswordBreach = async () => {
    setCheckingBreach(true);
    setBreachResults(null);

    try {
      const results = [];

      for (const item of items) {
        if (!item.password) continue;

        // 使用 k-anonymity 模型调用 HIBP API
        const encoder = new TextEncoder();
        const data = encoder.encode(item.password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = hashHex.substring(0, 5);
        const suffix = hashHex.substring(5);

        try {
          const response = await fetch(`/api/security/hibp/${prefix}`);
          if (response.ok) {
            const text = await response.text();
            const lines = text.split('\n');

            for (const line of lines) {
              const [hashSuffix, count] = line.split(':');
              if (hashSuffix === suffix) {
                results.push({
                  item,
                  breachCount: parseInt(count.trim(), 10)
                });
                break;
              }
            }
          }
        } catch (err) {
          console.error('检查泄露失败:', err);
        }

        // 添加延迟避免 rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setBreachResults(results);
    } catch (error) {
      console.error('泄露检测失败:', error);
      alert('泄露检测失败，请稍后重试');
    } finally {
      setCheckingBreach(false);
    }
  };

  const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[4];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-primary-500 text-white px-4 py-4 flex items-center gap-4 safe-top">
        <button onClick={() => navigate(-1)} className="text-2xl">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1">安全中心</h1>
      </div>

      {/* 安全评分卡片 */}
      <div className={`mx-4 mt-4 rounded-2xl p-6 ${scoreGrade.bg}`}>
        <div className="flex items-center gap-6">
          {/* 圆形评分 */}
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke={scoreGrade.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${securityAnalysis.score * 3.02} 302`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: scoreGrade.color }}>
                {securityAnalysis.score}
              </span>
              <span className="text-xs text-gray-500">分</span>
            </div>
          </div>

          {/* 评分说明 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xl font-bold"
                style={{ color: scoreGrade.color }}
              >
                {scoreGrade.label}
              </span>
              {securityAnalysis.score < 70 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  需要改进
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {securityAnalysis.score >= 90 && '您的密码安全状况非常好！继续保持。'}
              {securityAnalysis.score >= 70 && securityAnalysis.score < 90 && '您的密码安全状况良好，但仍有改进空间。'}
              {securityAnalysis.score >= 50 && securityAnalysis.score < 70 && '您的密码安全存在一些风险，建议尽快处理。'}
              {securityAnalysis.score < 50 && '您的密码安全状况较差，强烈建议立即改进。'}
            </p>
          </div>
        </div>

        {/* 快速统计 */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{securityAnalysis.stats.total}</div>
            <div className="text-xs text-gray-500">总密码数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{securityAnalysis.stats.strong}</div>
            <div className="text-xs text-gray-500">强密码</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{securityAnalysis.stats.weak}</div>
            <div className="text-xs text-gray-500">弱密码</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{securityAnalysis.duplicates.length}</div>
            <div className="text-xs text-gray-500">重复组</div>
          </div>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex px-4 mt-4 gap-2">
        {[
          { id: 'overview', label: '概览' },
          { id: 'weak', label: `弱密码 (${securityAnalysis.weakPasswords.length})` },
          { id: 'duplicate', label: `重复 (${securityAnalysis.duplicates.length})` },
          { id: 'old', label: `过期 (${securityAnalysis.oldPasswords.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-4">
        {/* 概览 */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 安全建议 */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">安全建议</h3>
              <div className="space-y-3">
                {securityAnalysis.weakPasswords.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="font-medium text-red-700">
                        发现 {securityAnalysis.weakPasswords.length} 个弱密码
                      </p>
                      <p className="text-sm text-red-600">
                        弱密码容易被破解，建议立即更换为强密码
                      </p>
                    </div>
                  </div>
                )}

                {securityAnalysis.duplicates.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="text-xl">🔄</span>
                    <div>
                      <p className="font-medium text-orange-700">
                        发现 {securityAnalysis.duplicates.length} 组重复密码
                      </p>
                      <p className="text-sm text-orange-600">
                        重复使用密码会增加安全风险，一旦泄露将影响多个账号
                      </p>
                    </div>
                  </div>
                )}

                {securityAnalysis.oldPasswords.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <span className="text-xl">⏰</span>
                    <div>
                      <p className="font-medium text-yellow-700">
                        发现 {securityAnalysis.oldPasswords.length} 个过期密码
                      </p>
                      <p className="text-sm text-yellow-600">
                        定期更换密码可以降低被盗风险
                      </p>
                    </div>
                  </div>
                )}

                {securityAnalysis.score >= 90 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="font-medium text-green-700">安全状况良好</p>
                      <p className="text-sm text-green-600">
                        继续保持良好的密码习惯
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 泄露检测 */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">密码泄露检测</h3>
              <p className="text-sm text-gray-500 mb-4">
                使用 Have I Been Pwned 服务检测您的密码是否在已知的数据泄露中出现过
              </p>

              <button
                onClick={checkPasswordBreach}
                disabled={checkingBreach || items.length === 0}
                className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingBreach ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    检测中...
                  </span>
                ) : (
                  '开始检测'
                )}
              </button>

              {breachResults !== null && (
                <div className="mt-4">
                  {breachResults.length === 0 ? (
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <span className="text-3xl mb-2 block">🎉</span>
                      <p className="font-medium text-green-700">未发现泄露</p>
                      <p className="text-sm text-green-600">您的密码未在已知的数据泄露中出现</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-red-600 font-medium">
                        ⚠️ 发现 {breachResults.length} 个密码可能已泄露
                      </p>
                      {breachResults.map((result, index) => (
                        <div
                          key={index}
                          className="p-3 bg-red-50 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{result.item.title}</p>
                            <p className="text-sm text-red-600">
                              在 {result.breachCount.toLocaleString()} 次泄露中出现
                            </p>
                          </div>
                          <button
                            onClick={() => navigate(`/edit/${result.item.id}`)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg"
                          >
                            修改
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 密码强度分布 */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">密码强度分布</h3>
              <div className="space-y-3">
                <StrengthBar
                  label="强密码"
                  count={securityAnalysis.stats.strong}
                  total={securityAnalysis.stats.total}
                  color="#22c55e"
                />
                <StrengthBar
                  label="中等强度"
                  count={securityAnalysis.stats.medium}
                  total={securityAnalysis.stats.total}
                  color="#eab308"
                />
                <StrengthBar
                  label="弱密码"
                  count={securityAnalysis.stats.weak}
                  total={securityAnalysis.stats.total}
                  color="#ef4444"
                />
              </div>
            </div>
          </div>
        )}

        {/* 弱密码列表 */}
        {activeTab === 'weak' && (
          <div className="space-y-3">
            {securityAnalysis.weakPasswords.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <span className="text-4xl mb-4 block">💪</span>
                <p className="text-gray-500">没有弱密码，做得好！</p>
              </div>
            ) : (
              securityAnalysis.weakPasswords.map(item => (
                <PasswordItem
                  key={item.id}
                  item={item}
                  category={getCategoryInfo(item.category)}
                  badge={
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                      强度: {item.strength}/4
                    </span>
                  }
                  onEdit={() => navigate(`/edit/${item.id}`)}
                />
              ))
            )}
          </div>
        )}

        {/* 重复密码列表 */}
        {activeTab === 'duplicate' && (
          <div className="space-y-4">
            {securityAnalysis.duplicates.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <span className="text-4xl mb-4 block">✨</span>
                <p className="text-gray-500">没有重复密码，很棒！</p>
              </div>
            ) : (
              securityAnalysis.duplicates.map((group, index) => (
                <div key={index} className="bg-white rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                    <span className="text-orange-700 font-medium">
                      🔄 {group.count} 个账号使用相同密码
                    </span>
                  </div>
                  <div className="divide-y">
                    {group.items.map(item => (
                      <PasswordItem
                        key={item.id}
                        item={item}
                        category={getCategoryInfo(item.category)}
                        compact
                        onEdit={() => navigate(`/edit/${item.id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 过期密码列表 */}
        {activeTab === 'old' && (
          <div className="space-y-3">
            {securityAnalysis.oldPasswords.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <span className="text-4xl mb-4 block">🆕</span>
                <p className="text-gray-500">所有密码都是最新的！</p>
              </div>
            ) : (
              securityAnalysis.oldPasswords.map(item => (
                <PasswordItem
                  key={item.id}
                  item={item}
                  category={getCategoryInfo(item.category)}
                  badge={
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      item.isDanger
                        ? 'bg-red-100 text-red-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.ageInDays} 天前
                    </span>
                  }
                  onEdit={() => navigate(`/edit/${item.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 密码条目组件
function PasswordItem({ item, category, badge, compact, onEdit }) {
  return (
    <div
      className={`bg-white rounded-xl flex items-center gap-3 ${compact ? 'px-4 py-3' : 'p-4'}`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: category.color }}
      >
        {item.title?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{item.title}</p>
        <p className="text-sm text-gray-500 truncate">{item.username}</p>
      </div>
      {badge}
      <button
        onClick={onEdit}
        className="px-3 py-1 text-sm text-primary-500 hover:bg-primary-50 rounded-lg"
      >
        修改
      </button>
    </div>
  );
}

// 强度条组件
function StrengthBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500">{count} 个 ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
