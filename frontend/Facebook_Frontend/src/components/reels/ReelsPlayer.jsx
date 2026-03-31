import { useEffect, useRef, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Heart, Trash2, Edit2, Volume2, VolumeX
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import reelService from '../../services/reelService';
import Avatar from '../common/Avatar';
import EditReelModal from './EditReelModal';
import './ReelsPlayer.css';

const ReelsPlayer = ({ reels, initialIndex = 0, onClose, onReelDeleted, onReelUpdated }) => {
  const { user: currentUser } = useAuth();
  const videoRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reel = reels[currentIndex];
  const isOwner = currentUser?.id === reel?.userId;

  useEffect(() => {
    if (!reel) return;
    setLiked(reel.isLikedByCurrentUser || false);
    setLikeCount(reel.likesCount || 0);
  }, [reel]);

  // Restart video when index changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {/* autoplay blocked silently */});
    }
  }, [currentIndex]);

  // Close on Escape, navigate with arrow keys
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const goNext = () => {
    if (currentIndex < reels.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handleToggleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => (prev ? c - 1 : c + 1));
    try {
      await reelService.toggleLike(reel.id);
    } catch {
      setLiked(prev);
      setLikeCount((c) => (prev ? c + 1 : c - 1));
      toast.error('Không thể thực hiện hành động này');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await reelService.deleteReel(reel.id);
      toast.success('Đã xoá Reel');
      onReelDeleted?.(reel.id);
      if (reels.length <= 1) {
        onClose();
      } else {
        const nextIndex = currentIndex >= reels.length - 1 ? currentIndex - 1 : currentIndex;
        setCurrentIndex(nextIndex);
      }
    } catch {
      toast.error('Xoá Reel thất bại');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!reel) return null;

  const timeAgo = reel.createdAt
    ? formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true, locale: vi })
    : '';

  return (
    <div className="rp-overlay" onClick={onClose}>
      {/* Close */}
      <button className="rp-close-btn" onClick={onClose} aria-label="Đóng">
        <X size={24} />
      </button>

      {/* Prev */}
      {currentIndex > 0 && (
        <button
          className="rp-nav-btn rp-nav-btn--prev"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Reels trước"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Player */}
      <div className="rp-player" onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          className="rp-video"
          controls
          playsInline
          muted={muted}
          loop
        >
          <source src={reel.videoUrl} type="video/mp4" />
        </video>

        {/* Mute toggle */}
        <button
          className="rp-mute-btn"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Bỏ tắt tiếng' : 'Tắt tiếng'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Info overlay */}
        <div className="rp-info">
          <div className="rp-author">
            <Avatar src={reel.userAvatarUrl} className="rp-author-avatar" alt={reel.userName} />
            <div className="rp-author-text">
              <span className="rp-author-name">{reel.userName || reel.userFullName}</span>
              <span className="rp-time">{timeAgo}</span>
            </div>
          </div>
          {reel.title && <p className="rp-title">{reel.title}</p>}
          {reel.description && <p className="rp-description">{reel.description}</p>}
        </div>

        {/* Actions */}
        <div className="rp-actions">
          <button
            className={`rp-action-btn${liked ? ' rp-action-btn--liked' : ''}`}
            onClick={handleToggleLike}
            aria-label="Thích"
          >
            <Heart size={24} fill={liked ? '#ef4444' : 'none'} />
            <span>{likeCount}</span>
          </button>

          {isOwner && (
            <>
              <button
                className="rp-action-btn"
                onClick={() => setShowEditModal(true)}
                aria-label="Chỉnh sửa"
              >
                <Edit2 size={22} />
              </button>
              <button
                className="rp-action-btn rp-action-btn--danger"
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Xoá"
              >
                <Trash2 size={22} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Next */}
      {currentIndex < reels.length - 1 && (
        <button
          className="rp-nav-btn rp-nav-btn--next"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Reels tiếp theo"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="rp-confirm-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="rp-confirm-box">
            <h4>Xoá Reel?</h4>
            <p>Hành động này không thể hoàn tác.</p>
            <div className="rp-confirm-actions">
              <button
                className="rp-btn rp-btn--secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Huỷ
              </button>
              <button
                className="rp-btn rp-btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <EditReelModal
          reel={reel}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            onReelUpdated?.(updated);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ReelsPlayer;
