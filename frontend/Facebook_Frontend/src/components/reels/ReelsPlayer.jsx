import { useEffect, useRef, useState } from 'react';
import {
  X, ChevronUp, ChevronDown, Heart, Trash2, Edit2, Volume2, VolumeX, MoreVertical,
  Star, EyeOff, Bookmark, Link2, Flag,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from '../../shared/appToast';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/useLocalization';
import reelService from '../../services/reelService';
import Avatar from '../common/Avatar';
import EditReelModal from './EditReelModal';
import { getVideoUrl } from '../../utils/formatUrl';
import './ReelsPlayer.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import ReportDialog from '../moderation/ReportDialog';
import { ModerationTargetType } from '../../shared/generated/enums';

const ReelsPlayer = ({ reels, initialIndex = 0, onClose, onReelDeleted, onReelUpdated, onNotInterested }) => {
  const { user: currentUser } = useAuth();
  const { t } = useLocalization();
  const videoRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slideDirection, setSlideDirection] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const lastWheelTime = useRef(0);
  const touchStartY = useRef(0);
  const menuRef = useRef(null);

  const reel = reels[currentIndex];
  const isOwner = currentUser?.id === reel?.author?.id;

  useEffect(() => {
    if (!reel) return;
    const isLiked = Boolean(reel.isLikedByMe ?? reel.isLikedByCurrentUser ?? reel.isLiked ?? false);
    setLiked(isLiked);
    setLikeCount(reel.likesCount || 0);
  }, [reel]);

  // Restart video when index changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {/* autoplay blocked silently */});
    }
  }, [currentIndex]);

  // Close on Escape, navigate vertically with arrow / wheel
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') goNext();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp'   || e.key === 'PageUp')   goPrev();
    };
    const handleWheel = (e) => {
      const now = Date.now();
      if (now - lastWheelTime.current < 600) return;
      lastWheelTime.current = now;
      if (e.deltaY > 0) goNext();
      else              goPrev();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('wheel', handleWheel);
    };
  });

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const goPrev = () => {
    if (currentIndex > 0) {
      setSlideDirection('down');
      setCurrentIndex((i) => i - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < reels.length - 1) {
      setSlideDirection('up');
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) goNext();
      else goPrev();
    }
  };

  const handleToggleLike = async () => {
    if (!reel) return;
    const prevLiked = liked;
    const prevCount = likeCount;

    // Optimistic UI update (immediate user feedback)
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setLikeCount(nextCount);

    onReelUpdated?.({
      ...reel,
      isLikedByMe: nextLiked,
      isLikedByCurrentUser: nextLiked,
      likesCount: nextCount,
    });

    try {
      // Eventual consistency synchronization with backend
      const res = await reelService.toggleLike(reel.id);
      const data = res?.data;
      if (data && typeof data.isLiked === 'boolean') {
        setLiked(data.isLiked);
        setLikeCount(data.likesCount);
        onReelUpdated?.({
          ...reel,
          isLikedByMe: data.isLiked,
          isLikedByCurrentUser: data.isLiked,
          likesCount: data.likesCount,
        });
      }
    } catch (error) {
      // Rollback optimistic state on API failure
      setLiked(prevLiked);
      setLikeCount(prevCount);
      onReelUpdated?.({
        ...reel,
        isLikedByMe: prevLiked,
        isLikedByCurrentUser: prevLiked,
        likesCount: prevCount,
      });
      toast.apiError(error, t('common.actionFailed'), { context: "reels.toggleLike" });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await reelService.deleteReel(reel.id);
      toast.success(t('reels.deleted'));
      onReelDeleted?.(reel.id);
      if (reels.length <= 1) {
        onClose();
      } else {
        const nextIndex = currentIndex >= reels.length - 1 ? currentIndex - 1 : currentIndex;
        setCurrentIndex(nextIndex);
      }
    } catch (error) {
      toast.apiError(error, t('reels.deleteFailed'), { context: "reels.delete" });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleMenuInterest = () => {
    setShowMenu(false);
    toast.success(t('reels.markedInterested'));
  };

  const handleMenuNotInterested = () => {
    setShowMenu(false);
    toast.success(t('reels.hidden'));
    onNotInterested?.(reel.id);
    if (reels.length <= 1) {
      onClose();
    } else {
      setCurrentIndex((i) => (i >= reels.length - 1 ? i - 1 : i));
    }
  };

  const handleMenuSave = () => {
    setShowMenu(false);
    setIsSaved((prev) => !prev);
    toast.success(isSaved ? t('reels.unsaved') : t('reels.saved'));
  };

  const handleMenuCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
    toast.success(t('common.linkCopied'));
    setShowMenu(false);
  };

  const handleMenuReport = () => {
    setShowMenu(false);
    setReportOpen(true);
  };

  if (!reel) return null;

  const timeAgo = reel.createdAt
    ? formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true, locale: vi })
    : '';

  return (
    <div className="rp-overlay" onClick={onClose}>
      {/* Close */}
      <button className="rp-close-btn" onClick={onClose} aria-label={translateCatalogKey('common.close')}>
        <X size={24} />
      </button>

      {/* Prev */}
      {currentIndex > 0 && (
        <button
          className="rp-nav-btn rp-nav-btn--prev"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label={translateCatalogKey('ui.components.reels.reelsplayer.reels-truoc.c6475326')}
        >
          <ChevronUp size={28} />
        </button>
      )}

      {/* Player */}
      <div
        className={`rp-player${slideDirection ? ` rp-slide-${slideDirection}` : ''}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onAnimationEnd={() => setSlideDirection(null)}
      >
        <video
          ref={videoRef}
          className="rp-video"
          controls
          playsInline
          muted={muted}
          loop
        >
          <source src={getVideoUrl(reel.videoUrl)} type="video/mp4" />
        </video>

        {/* Mute toggle */}
        <button
          className="rp-mute-btn"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? translateCatalogKey('ui.components.reels.reelsplayer.bo-tat-tieng.a1317e24') : translateCatalogKey('ui.components.reels.reelsplayer.tat-tieng.5aa8a225')}
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
            aria-label={translateCatalogKey('post.reaction.like')}
          >
            <Heart size={24} fill={liked ? '#ef4444' : 'none'} />
            <span>{likeCount}</span>
          </button>

          <div className="rp-owner-wrap" ref={menuRef}>
            <button
              className="rp-action-btn"
              onClick={() => setShowMenu((v) => !v)}
              aria-label={translateCatalogKey('ui.components.reels.reelsplayer.tuy-chon.4746d483')}
            >
              <MoreVertical size={22} />
            </button>
            {showMenu && (
              <div className="rp-owner-menu">
                {isOwner ? (
                  <>
                    <button onClick={() => { setShowMenu(false); setShowEditModal(true); }}>
                      <Edit2 size={15} /> {t('reels.edit')}
                    </button>
                    <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}>
                      <Trash2 size={15} /> {t('reels.delete')}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleMenuInterest}>
                      <Star size={15} /> {t('post.interested')}
                    </button>
                    <button onClick={handleMenuNotInterested}>
                      <EyeOff size={15} /> {t('post.notInterested')}
                    </button>
                    <button onClick={handleMenuSave}>
                      <Bookmark size={15} /> {isSaved ? t('reels.unsave') : t('reels.save')}
                    </button>
                    <button onClick={handleMenuCopyLink}>
                      <Link2 size={15} /> {t('post.copyLink')}
                    </button>
                    <hr className="rp-menu-divider" />
                    <button className="rp-menu-danger" onClick={handleMenuReport}>
                      <Flag size={15} /> {t('reels.report')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next */}
      {currentIndex < reels.length - 1 && (
        <button
          className="rp-nav-btn rp-nav-btn--next"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label={translateCatalogKey('ui.components.reels.reelsplayer.reels-tiep-theo.df296c1b')}
        >
          <ChevronDown size={28} />
        </button>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="rp-confirm-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="rp-confirm-box">
            <h4>{t('reels.deleteTitle')}</h4>
            <p>{t('reels.irreversible')}</p>
            <div className="rp-confirm-actions">
              <button
                className="rp-btn rp-btn--secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="rp-btn rp-btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t('common.deleting') : t('common.delete')}
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
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType={ModerationTargetType.Reel}
        targetId={reel.id}
        targetLabel="reel này"
      />
    </div>
  );
};

export default ReelsPlayer;
