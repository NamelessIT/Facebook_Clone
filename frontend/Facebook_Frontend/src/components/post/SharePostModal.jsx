import { useState } from "react";
import { X } from "lucide-react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import postService from "../../services/postService";
import toast from "react-hot-toast";
import { PostPrivacy } from "../../shared/generated/enums";
import useSingleFlightAction from "../../hooks/useSingleFlightAction";
import "./SharePostModal.css";
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const SharePostModal = ({ post, isOpen, onClose, onShared }) => {
  const { user } = useAuth();
  const { locale, t } = useLocalization();
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState(PostPrivacy.Public);

  // Single-flight guard: blocks double-submit even on very fast double clicks.
  const { run: handleShare, isRunning: loading } = useSingleFlightAction(async () => {
    try {
      await postService.sharePost(post.id, {
        caption: content,
        privacy,
      });
      toast.success(translateCatalogKey('ui.components.post.sharepostmodal.a-chia-se-bai-viet.b84a67ab'));
      setContent("");
      onClose();
      onShared?.();
    } catch (error) {
      toast.error(error.response?.data?.message || translateCatalogKey('ui.components.post.sharepostmodal.chia-se-that-bai.dd30f06b'));
    }
  });

  if (!isOpen || !post) return null;

  return (
    <div className="share-modal-overlay" onMouseDown={onClose}>
      <div className="share-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <h3>{t('post.shareTitle')}</h3>
          <button className="share-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="share-modal-body">
          <div className="share-user-info">
            <Avatar src={user?.avatarUrl} className="w-10 h-10" />
            <div>
              <div className="share-user-name">{user?.fullName}</div>
              <select
                className="share-privacy-select"
                value={privacy}
                onChange={(e) => setPrivacy(Number(e.target.value))}
              >
                <option value={PostPrivacy.Public}>{t('privacy.public')}</option>
                <option value={PostPrivacy.Friends}>{t('privacy.friends')}</option>
                <option value={PostPrivacy.Private}>{t('privacy.onlyMe')}</option>
              </select>
            </div>
          </div>

          <textarea
            className="share-textarea"
            placeholder={t('post.sharePlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />

          {/* Preview bài viết gốc */}
          <div className="share-original-post">
            <div className="share-original-header">
              <Avatar src={post.author?.avatarUrl} className="w-8 h-8" />
              <div>
                <div className="share-original-author">{post.author?.fullName}</div>
                <div className="share-original-time">
                  {new Date(post.createdAt).toLocaleString(locale)}
                </div>
              </div>
            </div>
            {post.content && (
              <p className="share-original-content">{post.content}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="share-modal-footer">
          <button
            className="share-submit-btn"
            onClick={handleShare}
            disabled={loading}
          >
            {loading ? t('post.sharing') : t('post.shareNow')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;
