import { useState, useRef } from "react";
import { X, Globe, Users, Lock, ImagePlus, Trash2 } from "lucide-react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { getImageUrl } from "../../utils/formatUrl";
import postService from "../../services/postService";
import toast from "react-hot-toast";
import "./EditPostModal.css";

const PRIVACY_OPTIONS = [
  { value: 1, label: "Công khai", icon: Globe },
  { value: 2, label: "Bạn bè", icon: Users },
  { value: 3, label: "Chỉ mình tôi", icon: Lock },
];

const MAX_CONTENT_LENGTH = 500;

const EditPostModal = ({ post, onClose, onPostUpdated }) => {
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
    if (!content.trim() && existingMedias.length === 0 && newFiles.length === 0) {
      toast.error("Bài viết phải có nội dung hoặc media.");
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      toast.error(`Nội dung tối đa ${MAX_CONTENT_LENGTH} ký tự.`);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("Content", content);
      formData.append("Privacy", privacy);

      mediasToRemove.forEach((id) => formData.append("MediasToRemove", id));

      newFiles.forEach((f) => {
        if (f.isVideo) formData.append("NewVideos", f.file);
        else formData.append("NewImages", f.file);
      });

      await postService.updatePost(post.id, formData);
      toast.success("Cập nhật bài viết thành công!");
      onPostUpdated?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-post-overlay" onMouseDown={onClose}>
      <div className="edit-post-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-post-header">
          <h3>Chỉnh sửa bài viết</h3>
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
                  {opt.label}
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
            placeholder="Bạn đang nghĩ gì?"
            rows={4}
          />
          <div className="edit-post-char-count">
            <span className={content.length > MAX_CONTENT_LENGTH ? "over-limit" : ""}>
              {content.length}
            </span>
            /{MAX_CONTENT_LENGTH}
          </div>
        </div>

        {/* Existing medias */}
        {existingMedias.length > 0 && (
          <div className="edit-post-media-section">
            <h4 className="edit-post-media-title">Media hiện tại</h4>
            <div className="edit-post-media-grid">
              {existingMedias.map((media) => (
                <div key={media.id} className="edit-post-media-item">
                  {media.mediaType === 1 ? (
                    <video src={getImageUrl(media.url, "videos")} />
                  ) : (
                    <img src={getImageUrl(media.url, "posts")} alt="" />
                  )}
                  <button
                    className="edit-post-media-remove"
                    onClick={() => handleRemoveExistingMedia(media.id)}
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New files preview */}
        {newFiles.length > 0 && (
          <div className="edit-post-media-section">
            <h4 className="edit-post-media-title">Media mới</h4>
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
                    title="Xóa"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add media button */}
        <div className="edit-post-add-media">
          <button onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={20} /> Thêm ảnh/video
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

        {/* Footer */}
        <div className="edit-post-footer">
          <button className="edit-post-btn-cancel" onClick={onClose}>
            Hủy
          </button>
          <button
            className="edit-post-btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
