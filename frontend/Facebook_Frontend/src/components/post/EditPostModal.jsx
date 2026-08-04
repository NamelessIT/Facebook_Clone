import { useState, useRef } from "react";
import { X, Globe, Users, Lock, ImagePlus, Trash2 } from "lucide-react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { getImageUrl } from "../../utils/formatUrl";
import postService from "../../services/postService";
import toast from '../../shared/appToast';
import { LIMITS } from "../../shared/generated/constants";
import "./EditPostModal.css";
import { translateCatalogKey } from '../../shared/localizationRuntime';

const PRIVACY_OPTIONS = [
  { value: 1, labelKey: "privacy.public", icon: Globe },
  { value: 2, labelKey: "privacy.friends", icon: Users },
  { value: 3, labelKey: "privacy.onlyMe", icon: Lock },
];

const MAX_CONTENT_LENGTH = LIMITS.editPostMaxContentLength;

const EditPostModal = ({ post, onClose, onPostUpdated, privacyOnly = false }) => {
  const { user } = useAuth();
  const [content, setContent] = useState(post.content || "");
  const [privacy, setPrivacy] = useState(post.privacy || 1);
  const [existingMedias, setExistingMedias] = useState(post.medias || []);
  const [mediasToRemove, setMediasToRemove] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleRemoveExistingMedia = (mediaId) => {
    setMediasToRemove((prev) => [...prev, mediaId]);
    setExistingMedias((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const handleAddFiles = (e) => {
    const selected = Array.from(e.target.files);
    const mapped = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setNewFiles((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // In privacyOnly mode, only privacy is required to change
    if (privacyOnly) {
      setSaving(true);
      try {
        const formData = new FormData();
        formData.append("content", content);
        formData.append("privacy", String(privacy));

        await postService.updatePost(post.id, formData);
        toast.success(translateCatalogKey('ui.components.post.editpostmodal.cap-nhat-che-o-hien-thi-thanh-cong.7bf3c3f9'));
        onPostUpdated?.();
        onClose();
      } catch (error) {
        toast.apiError(error, translateCatalogKey('settings.updateFailed'), { context: 'posts.privacy.update' });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!content.trim() && existingMedias.length === 0 && newFiles.length === 0) {
      toast.error(translateCatalogKey('ui.components.post.editpostmodal.bai-viet-phai-co-noi-dung-hoac-media.12bd04df'));
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      toast.error(translateCatalogKey('ui.components.post.editpostmodal.noi-dung-toi-a-value0-ky-tu.85f78484', { value0: MAX_CONTENT_LENGTH }));
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("privacy", String(privacy));

      mediasToRemove.forEach((id) => formData.append("MediasToRemove", id));

      newFiles.forEach((f) => {
        if (f.isVideo) formData.append("NewVideos", f.file);
        else formData.append("NewImages", f.file);
      });

      await postService.updatePost(post.id, formData);
      toast.success(translateCatalogKey('ui.components.post.editpostmodal.cap-nhat-bai-viet-thanh-cong.65c30107'));
      onPostUpdated?.();
      onClose();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('settings.updateFailed'), { context: 'posts.update' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-post-overlay" onMouseDown={onClose}>
      <div className="edit-post-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-post-header">
          <h3>{privacyOnly ? translateCatalogKey('post.editPrivacy') : translateCatalogKey('post.editPost')}</h3>
          <button className="edit-post-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Author + Privacy */}
        <div className="edit-post-author">
          <Avatar src={user?.avatarUrl} className="w-10 h-10" />
          <div className="edit-post-author-info">
            <span className="edit-post-author-name">{user?.fullName}</span>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(Number(e.target.value))}
              className="edit-post-privacy-select"
            >
              {PRIVACY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {translateCatalogKey(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="edit-post-body">
          <textarea
            className="edit-post-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={translateCatalogKey('ui.components.post.editpostmodal.ban-ang-nghi-gi.3127ac88')}
            rows={4}
            disabled={privacyOnly}
          />
          <div className="edit-post-char-count">
            <span className={content.length > MAX_CONTENT_LENGTH ? "over-limit" : ""}>
              {content.length}
            </span>
            /{MAX_CONTENT_LENGTH}
          </div>
          {privacyOnly && (
            <p style={{ fontSize: '13px', color: '#65676b', marginTop: '6px', fontStyle: 'italic' }}>
              {translateCatalogKey('ui.components.post.editpostmodal.bai-viet-nay-tu-ong-uoc-tao-ban-chi-.914407b3')}
            </p>
          )}
        </div>

        {/* Bài viết được chia sẻ (chỉ xem, không sửa) */}
        {post.sharedPost && (
          <div className="edit-post-shared">
            <div className="edit-post-shared-header">
              <Avatar src={post.sharedPost.author?.avatarUrl} className="w-8 h-8" />
              <div className="edit-post-shared-info">
                <span className="edit-post-shared-author">
                  {post.sharedPost.author?.fullName || translateCatalogKey('chat.userFallback')}
                </span>
                {post.sharedPost.createdAt && (
                  <span className="edit-post-shared-time">
                    {new Date(post.sharedPost.createdAt).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>
            </div>
            {post.sharedPost.content && (
              <div className="edit-post-shared-text">{post.sharedPost.content}</div>
            )}
            {post.sharedPost.medias?.length > 0 && (
              <div className="edit-post-shared-media">
                {post.sharedPost.medias[0].mediaType === 1 ? (
                  <video src={getImageUrl(post.sharedPost.medias[0].url, 'videos')} />
                ) : (
                  <img src={getImageUrl(post.sharedPost.medias[0].url, 'posts')} alt="" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Existing medias - read-only in privacyOnly mode */}
        {existingMedias.length > 0 && (
          <div className="edit-post-media-section">
            <h4 className="edit-post-media-title">{translateCatalogKey('ui.components.post.editpostmodal.media.8b5254ae')} {privacyOnly ? translateCatalogKey('ui.components.post.editpostmodal.khong-the-chinh-sua.4258ff4f') : translateCatalogKey('ui.components.post.editpostmodal.hien-tai.3e7ba270')}</h4>
            <div className="edit-post-media-grid">
              {existingMedias.map((media) => (
                <div key={media.id} className="edit-post-media-item">
                  {media.mediaType === 1 ? (
                    <video src={getImageUrl(media.url, "videos")} />
                  ) : (
                    <img src={getImageUrl(media.url, "posts")} alt="" />
                  )}
                  {!privacyOnly && (
                    <button
                      className="edit-post-media-remove"
                      onClick={() => handleRemoveExistingMedia(media.id)}
                      title={translateCatalogKey('common.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New files preview - hidden in privacyOnly mode */}
        {!privacyOnly && newFiles.length > 0 && (
          <div className="edit-post-media-section">
            <h4 className="edit-post-media-title">{translateCatalogKey('ui.components.post.editpostmodal.media-moi.deb28f64')}</h4>
            <div className="edit-post-media-grid">
              {newFiles.map((f, idx) => (
                <div key={idx} className="edit-post-media-item">
                  {f.isVideo ? (
                    <video src={f.preview} />
                  ) : (
                    <img src={f.preview} alt="" />
                  )}
                  <button
                    className="edit-post-media-remove"
                    onClick={() => handleRemoveNewFile(idx)}
                    title={translateCatalogKey('common.delete')}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add media button - hidden in privacyOnly mode */}
        {!privacyOnly && (
          <div className="edit-post-add-media">
            <button onClick={() => fileInputRef.current?.click()}>
              <ImagePlus size={20} /> {translateCatalogKey('ui.components.post.editpostmodal.them-anh-video.be243192')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,video/mp4,video/webm"
              multiple
              hidden
              onChange={handleAddFiles}
            />
          </div>
        )}

        {/* Footer */}
        <div className="edit-post-footer">
          <button className="edit-post-btn-cancel" onClick={onClose}>
            {translateCatalogKey('common.cancel')}
          </button>
          <button
            className="edit-post-btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? translateCatalogKey('settings.saving') : translateCatalogKey('post.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
