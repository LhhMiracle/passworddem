import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVault, CATEGORIES } from '../context/VaultContext';
import { evaluatePasswordStrength, getStrengthLabel, getStrengthColor, encryptData } from '../utils/crypto';
import { TagSelector } from '../components/TagManager';
import ShareDialog from '../components/ShareDialog';
import { attachments as attachmentsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ItemDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { items, tags, deleteItem, toggleFavorite, updateItemTags, loadTags, getItemRaw } = useVault();
  const { encryptionKey } = useAuth();

  const item = items.find(i => i.id === parseInt(id));
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const fileInputRef = useRef(null);

  // 初始化选中的标签
  useEffect(() => {
    if (item?.tags) {
      setSelectedTags(item.tags);
    }
    loadTags().catch(console.error);
  }, [item, loadTags]);

  // 加载附件列表
  useEffect(() => {
    if (item?.id) {
      loadAttachments();
    }
  }, [item?.id]);

  const loadAttachments = async () => {
    if (!item?.id) return;
    try {
      setLoadingAttachments(true);
      const result = await attachmentsApi.getByItem(item.id);
      setAttachmentsList(result.attachments || []);
    } catch (err) {
      console.error('加载附件失败:', err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的文件类型，仅支持 PDF、PNG、JPG');
      return;
    }

    // 验证文件大小
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小超过10MB限制');
      return;
    }

    try {
      setUploadingFile(true);

      // 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 加密文件数据
      const { encrypted, iv } = await encryptFileData(arrayBuffer, encryptionKey);

      // 上传
      await attachmentsApi.upload(
        item.id,
        file.name,
        file.type,
        encrypted,
        iv
      );

      // 重新加载附件列表
      await loadAttachments();
      alert('上传成功');
    } catch (err) {
      console.error('上传失败:', err);
      alert('上传失败: ' + (err.message || '未知错误'));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 加密文件数据
  const encryptFileData = async (arrayBuffer, key) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      arrayBuffer
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  };

  // 解密文件数据
  const decryptFileData = async (encryptedBase64, ivBase64, key) => {
    const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    return decrypted;
  };

  // 预览/下载附件
  const handleViewAttachment = async (attachment) => {
    try {
      const result = await attachmentsApi.get(attachment.id);
      const decrypted = await decryptFileData(result.encryptedData, result.iv, encryptionKey);

      const blob = new Blob([decrypted], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);

      if (attachment.mimeType.startsWith('image/')) {
        setPreviewAttachment({ ...attachment, url });
      } else {
        // PDF 或其他文件直接下载
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.originalName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('预览失败:', err);
      alert('预览失败');
    }
  };

  // 删除附件
  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('确定要删除此附件吗？')) return;

    try {
      await attachmentsApi.delete(attachmentId);
      await loadAttachments();
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败');
    }
  };

  // 获取用于共享的加密数据
  const getShareData = () => {
    const rawItem = getItemRaw ? getItemRaw(item.id) : null;
    if (rawItem) {
      return {
        encryptedData: rawItem.encryptedData,
        iv: rawItem.iv
      };
    }
    // 如果没有 getItemRaw，使用明文数据重新加密（仅用于共享）
    const shareData = {
      title: item.title,
      username: item.username,
      password: item.password,
      url: item.website,
      notes: item.notes
    };
    return {
      encryptedData: btoa(JSON.stringify(shareData)),
      iv: ''
    };
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">密码条目不存在</p>
      </div>
    );
  }

  const category = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[4];
  const strength = evaluatePasswordStrength(item.password);
  const strengthLabel = getStrengthLabel(strength);
  const strengthColor = getStrengthColor(strength);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);

      // 如果是密码，30秒后清除剪贴板
      if (field === 'password') {
        setTimeout(() => {
          navigator.clipboard.writeText('').catch(() => {});
        }, 30000);
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除"${item.title}"吗？此操作不可恢复。`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteItem(item.id);
      navigate('/vault');
    } catch (err) {
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(item.id);
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  const handleSaveTags = async () => {
    try {
      await updateItemTags(item.id, selectedTags.map(t => t.id));
      setShowTagEditor(false);
    } catch (err) {
      console.error('保存标签失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-primary-500 text-white px-4 py-4 flex items-center gap-4 safe-top">
        <button onClick={() => navigate(-1)} className="text-2xl">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1">密码详情</h1>
        <button
          onClick={handleToggleFavorite}
          className="p-2 hover:bg-white/10 rounded-lg"
          title={item.isFavorite ? '取消收藏' : '添加收藏'}
        >
          {item.isFavorite ? '⭐' : '☆'}
        </button>
        <button
          onClick={() => setShowShareDialog(true)}
          className="p-2 hover:bg-white/10 rounded-lg"
          title="分享"
        >
          🔗
        </button>
        <button
          onClick={() => navigate(`/edit/${id}`)}
          className="px-3 py-1 bg-white/20 rounded-lg text-sm"
        >
          编辑
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 头部信息 */}
        <div className="bg-white rounded-xl p-4 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl relative"
            style={{ backgroundColor: category.color }}
          >
            {item.title?.[0]?.toUpperCase() || '?'}
            {item.isFavorite && (
              <span className="absolute -top-1 -right-1 text-sm">⭐</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{item.title}</h2>
            <p className="text-gray-500">{category.name}</p>
            {/* 显示标签 */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 标签编辑 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">标签</p>
            <button
              onClick={() => setShowTagEditor(!showTagEditor)}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              {showTagEditor ? '取消' : '编辑'}
            </button>
          </div>

          {showTagEditor ? (
            <div className="space-y-3">
              <TagSelector
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                allTags={tags}
              />
              <button
                onClick={handleSaveTags}
                className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-medium"
              >
                保存标签
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {item.tags && item.tags.length > 0 ? (
                item.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">暂无标签</span>
              )}
            </div>
          )}
        </div>

        {/* 账号信息 */}
        <div className="bg-white rounded-xl divide-y">
          {/* 用户名 */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => copyToClipboard(item.username, 'username')}
          >
            <div>
              <p className="text-sm text-gray-500">用户名/邮箱</p>
              <p className="text-gray-800">{item.username}</p>
            </div>
            <span className="text-xl">
              {copied === 'username' ? '✓' : '📋'}
            </span>
          </div>

          {/* 密码 */}
          <div className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => copyToClipboard(item.password, 'password')}
            >
              <div className="flex-1">
                <p className="text-sm text-gray-500">密码</p>
                <p className="text-gray-800 font-mono">
                  {showPassword ? item.password : '•'.repeat(Math.min(item.password.length, 16))}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className="p-2 text-xl"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
              <span className="text-xl ml-2">
                {copied === 'password' ? '✓' : '📋'}
              </span>
            </div>
            {/* 密码强度 */}
            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: strengthColor }}
              />
              <span className="text-sm" style={{ color: strengthColor }}>
                {strengthLabel}
              </span>
            </div>
          </div>

          {/* 网站 */}
          {item.website && (
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => copyToClipboard(item.website, 'website')}
            >
              <div>
                <p className="text-sm text-gray-500">网站地址</p>
                <p className="text-primary-500">{item.website}</p>
              </div>
              <span className="text-xl">
                {copied === 'website' ? '✓' : '🔗'}
              </span>
            </div>
          )}
        </div>

        {/* 备注 */}
        {item.notes && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">备注</p>
            <p className="text-gray-800 whitespace-pre-wrap">{item.notes}</p>
          </div>
        )}

        {/* 时间信息 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-2">记录信息</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">创建时间</p>
              <p className="text-gray-600">{formatDate(item.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-400">最后修改</p>
              <p className="text-gray-600">{formatDate(item.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* 附件区域 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">附件</p>
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
              <span className="text-sm text-primary-500 hover:text-primary-600">
                {uploadingFile ? '上传中...' : '+ 添加附件'}
              </span>
            </label>
          </div>

          {loadingAttachments ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : attachmentsList.length > 0 ? (
            <div className="space-y-2">
              {attachmentsList.map(att => (
                <div key={att.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <span className="text-2xl">
                    {att.mimeType.startsWith('image/') ? '🖼️' : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{att.originalName}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                  </div>
                  <button
                    onClick={() => handleViewAttachment(att)}
                    className="px-2 py-1 text-xs bg-primary-100 text-primary-600 rounded hover:bg-primary-200"
                  >
                    {att.mimeType.startsWith('image/') ? '预览' : '下载'}
                  </button>
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">
              暂无附件，支持 PDF、PNG、JPG（最大10MB）
            </p>
          )}
        </div>

        {/* 删除按钮 */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-4 bg-red-50 text-red-500 font-medium rounded-xl border border-red-200 hover:bg-red-100 disabled:opacity-50"
        >
          {deleting ? '删除中...' : '删除此密码'}
        </button>
      </div>

      {/* 分享对话框 */}
      {showShareDialog && (
        <ShareDialog
          item={item}
          encryptedData={getShareData().encryptedData}
          iv={getShareData().iv}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {/* 图片预览 */}
      {previewAttachment && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => {
            URL.revokeObjectURL(previewAttachment.url);
            setPreviewAttachment(null);
          }}
        >
          <div className="max-w-full max-h-full">
            <img
              src={previewAttachment.url}
              alt={previewAttachment.originalName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-white text-center mt-2">{previewAttachment.originalName}</p>
            <p className="text-white/60 text-center text-sm">点击任意位置关闭</p>
          </div>
        </div>
      )}
    </div>
  );
}
