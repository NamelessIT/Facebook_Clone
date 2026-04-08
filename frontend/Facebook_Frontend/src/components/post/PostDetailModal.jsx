import { useEffect, useRef } from 'react';
import { X, Globe, Users, Lock, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { getImageUrl } from '../../utils/formatUrl';
import './PostDetailModal.css';

const PRIVACY_MAP = {
  1: { icon: Globe, label: 'Công khai' },
  2: { icon: Users, label: 'Bạn bè' },
  3: { icon: Lock, label: 'Chỉ mình tôi' },
};

const PostDetailModal = ({ post, onClose }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const hasMedia = post.medias && post.medias.length > 0;
  const privacyInfo = PRIVACY_MAP[post.privacy] || PRIVACY_MAP[1];
  const PrivacyIcon = privacyInfo.icon;

  const renderMedia = () => {
    if (!hasMedia) return null;
    const first = post.medias[0];
    const isVideo = first.mediaType === 1;
    if (isVideo) {
      return (
        <video
          src={getImageUrl(first.url, 'videos')}
          className="pdm-media-el"
          controls
          autoPlay
          muted
        />
      );
    }
    return (
      <img
        src={getImageUrl(first.url, 'posts')}
        alt="Post media"
        className="pdm-media-el"
      />
    );
  };

  return (
    <div className="pdm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={`pdm-dialog ${!hasMedia ? 'pdm-dialog--no-media' : ''}`}>
        {/* Nút đóng */}
        <button className="pdm-close" onClick={onClose} aria-label="Đóng">
          <X size={20} />
        </button>

        {/* Panel trái: media */}
        {hasMedia && (
          <div className="pdm-media-panel">
            {renderMedia()}
            {post.medias.length > 1 && (
              <div className="pdm-media-count">
                1 / {post.medias.length}
              </div>
            )}
          </div>
        )}

        {/* Panel phải: nội dung */}
        <div className="pdm-content-panel">
          {/* Header */}
          <div className="pdm-header">
            <Link to={`/profile/${post.author?.id}`} onClick={onClose}>
              <Avatar src={post.author?.avatarUrl} className="pdm-avatar" />
            </Link>
            <div className="pdm-author-info">
              <Link
                to={`/profile/${post.author?.id}`}
                className="pdm-author-name"
                onClick={onClose}
              >
                {post.author?.fullName}
              </Link>
              <span className="pdm-meta">
                {new Date(post.createdAt).toLocaleString('vi-VN')} ·{' '}
                <PrivacyIcon size={12} className="pdm-privacy-icon" />
              </span>
            </div>
          </div>

          {/* Nội dung */}
          {post.content && (
            <p className="pdm-text">{post.content}</p>
          )}

          {/* Nếu không có media và không có content */}
          {!post.content && !hasMedia && (
            <p className="pdm-text pdm-text--empty">(Bài viết không có nội dung)</p>
          )}

          {/* Thống kê */}
          <div className="pdm-stats">
            {(post.reactionsCount > 0 || post.likesCount > 0) && (
              <span className="pdm-stat-item">
                <ThumbsUp size={14} />
                {post.reactionsCount ?? post.likesCount ?? 0}
              </span>
            )}
            {post.commentsCount > 0 && (
              <span className="pdm-stat-item">
                <MessageSquare size={14} />
                {post.commentsCount} bình luận
              </span>
            )}
          </div>

          {/* Nút tương tác */}
          <div className="pdm-actions">
            <button className="pdm-action-btn">
              <ThumbsUp size={18} />
              <span>Thích</span>
            </button>
            <button className="pdm-action-btn">
              <MessageSquare size={18} />
              <span>Bình luận</span>
            </button>
            <button className="pdm-action-btn">
              <Share2 size={18} />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;
