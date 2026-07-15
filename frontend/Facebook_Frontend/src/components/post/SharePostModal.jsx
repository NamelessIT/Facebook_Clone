import { useState } from "react";
import { X } from "lucide-react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import postService from "../../services/postService";
import toast from "react-hot-toast";
import { PostPrivacy } from "../../shared/generated/enums";
import useSingleFlightAction from "../../hooks/useSingleFlightAction";
import "./SharePostModal.css";

const SharePostModal = ({ post, isOpen, onClose, onShared }) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState(PostPrivacy.Public);

  // Single-flight guard: blocks double-submit even on very fast double clicks.
  const { run: handleShare, isRunning: loading } = useSingleFlightAction(async () => {
    try {
      await postService.sharePost(post.id, {
        caption: content,
        privacy,
      });
      toast.success("Đã chia sẻ bài viết!");
      setContent("");
      onClose();
      onShared?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Chia sẻ thất bại!");
    }
  });

  if (!isOpen || !post) return null;

  return (
    <div className="share-modal-overlay" onMouseDown={onClose}>
      <div className="share-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <h3>Chia sẻ bài viết</h3>
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
                <option value={PostPrivacy.Public}>Công khai</option>
                <option value={PostPrivacy.Friends}>Bạn bè</option>
                <option value={PostPrivacy.Private}>Chỉ mình tôi</option>
              </select>
            </div>
          </div>

          <textarea
            className="share-textarea"
            placeholder="Hãy nói gì đó về bài viết này..."
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
                  {new Date(post.createdAt).toLocaleString("vi-VN")}
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
            {loading ? "Đang chia sẻ..." : "Chia sẻ ngay"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;
