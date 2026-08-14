import { useEffect, useRef, useState } from 'react';
import {
  Bookmark, ChevronDown, ChevronUp, Edit2, EyeOff, Flag, Heart, Link2,
  Loader2, MessageCircle, Send, Settings2, Share2, Star, Trash2, X,
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
import VideoPlaybackControls from '../media/VideoPlaybackControls';

const ReelsPlayer = ({ reels, initialIndex = 0, onClose, onReelDeleted, onReelUpdated, onNotInterested }) => {
  const { user: currentUser } = useAuth();
  const { t } = useLocalization();
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const menuRef = useRef(null);
  const lastWheelTime = useRef(0);
  const touchStartY = useRef(0);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSending, setCommentSending] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [reportedComment, setReportedComment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slideDirection, setSlideDirection] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const reel = reels[currentIndex];
  const isOwner = currentUser?.id === reel?.author?.id;

  const publishReelPatch = (patch) => {
    if (reel) onReelUpdated?.({ ...reel, ...patch });
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    setSlideDirection('down');
    setCurrentIndex((index) => index - 1);
  };

  const goNext = () => {
    if (currentIndex >= reels.length - 1) return;
    setSlideDirection('up');
    setCurrentIndex((index) => index + 1);
  };

  useEffect(() => {
    if (!reel) return;
    setLiked(Boolean(reel.isLikedByMe ?? reel.isLikedByCurrentUser ?? reel.isLiked ?? false));
    setLikeCount(reel.likesCount || 0);
    setCommentCount(reel.commentsCount || 0);
    setShowMenu(false);
  }, [reel]);

  useEffect(() => {
    if (!reel?.id) return;
    let active = true;
    setCommentsLoading(true);
    reelService.getComments(reel.id, 1, 50)
      .then((response) => {
        if (!active) return;
        const payload = response.data;
        const items = payload?.data ?? payload?.items ?? [];
        const total = payload?.pagination?.total ?? payload?.totalCount ?? payload?.total ?? items.length;
        setComments([...items].reverse());
        setCommentCount(total);
        publishReelPatch({ commentsCount: total });
      })
      .catch((error) => {
        if (active) toast.apiError(error, 'Không thể tải bình luận Reel.', { context: 'reels.comments.load' });
      })
      .finally(() => active && setCommentsLoading(false));
    return () => { active = false; };
    // The parent patch callback intentionally is not a dependency: loading a comment count must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel?.id]);

  useEffect(() => {
    const handleKey = (event) => {
      const hasNestedDialog = reportOpen || Boolean(reportedComment) || showEditModal || showDeleteConfirm;
      if (event.key === 'Escape') {
        if (!hasNestedDialog && !showMenu) onClose();
        return;
      }
      if (hasNestedDialog) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') goNext();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') goPrev();
      if (event.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => undefined);
        else video.pause();
      }
    };
    const handleWheel = (event) => {
      if (event.target.closest?.('.rp-comments-panel')) return;
      const now = Date.now();
      if (now - lastWheelTime.current < 600) return;
      lastWheelTime.current = now;
      if (event.deltaY > 0) goNext();
      else goPrev();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('wheel', handleWheel);
    };
  });

  useEffect(() => {
    if (!showMenu) return undefined;
    const handler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleTouchStart = (event) => { touchStartY.current = event.touches[0].clientY; };
  const handleTouchEnd = (event) => {
    const deltaY = touchStartY.current - event.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 50) (deltaY > 0 ? goNext() : goPrev());
  };

  const handleToggleLike = async () => {
    if (!reel) return;
    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !previousLiked;
    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setLikeCount(nextCount);
    publishReelPatch({ isLikedByMe: nextLiked, isLikedByCurrentUser: nextLiked, likesCount: nextCount });
    try {
      const response = await reelService.toggleLike(reel.id);
      const data = response?.data;
      if (data && typeof data.isLiked === 'boolean') {
        setLiked(data.isLiked);
        setLikeCount(data.likesCount);
        publishReelPatch({ isLikedByMe: data.isLiked, isLikedByCurrentUser: data.isLiked, likesCount: data.likesCount });
      }
    } catch (error) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      publishReelPatch({ isLikedByMe: previousLiked, isLikedByCurrentUser: previousLiked, likesCount: previousCount });
      toast.apiError(error, t('common.actionFailed'), { context: 'reels.toggleLike' });
    }
  };

  const handleSendComment = async (event) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || commentSending || !reel) return;
    setCommentSending(true);
    try {
      const response = await reelService.createComment(reel.id, content);
      const created = response.data?.data;
      if (!created) throw new Error('Bình luận Reel không có dữ liệu trả về.');
      setComments((items) => [...items, created]);
      setCommentText('');
      setCommentCount((count) => {
        const nextCount = count + 1;
        publishReelPatch({ commentsCount: nextCount });
        return nextCount;
      });
    } catch (error) {
      toast.apiError(error, 'Không thể gửi bình luận Reel.', { context: 'reels.comments.create' });
    } finally {
      setCommentSending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await reelService.deleteReel(reel.id);
      toast.success(t('reels.deleted'));
      onReelDeleted?.(reel.id);
      if (reels.length <= 1) onClose();
      else setCurrentIndex(currentIndex >= reels.length - 1 ? currentIndex - 1 : currentIndex);
    } catch (error) {
      toast.apiError(error, t('reels.deleteFailed'), { context: 'reels.delete' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const closeMenuAfter = (action) => {
    setShowMenu(false);
    action();
  };

  const handleMenuNotInterested = () => closeMenuAfter(() => {
    toast.success(t('reels.hidden'));
    onNotInterested?.(reel.id);
    if (reels.length <= 1) onClose();
    else setCurrentIndex((index) => (index >= reels.length - 1 ? index - 1 : index));
  });

  const handleMenuSave = () => closeMenuAfter(() => {
    setIsSaved((saved) => !saved);
    toast.success(isSaved ? t('reels.unsaved') : t('reels.saved'));
  });

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
    toast.success(t('common.linkCopied'));
    setShowMenu(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/reels/${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title || 'Reel', url });
      else await navigator.clipboard.writeText(url);
      toast.success(t('common.linkCopied'));
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Không thể chia sẻ Reel.');
    }
  };

  if (!reel) return null;

  const authorName = reel.author?.fullName || reel.userFullName || reel.userName || 'Reel';
  const authorAvatar = reel.author?.avatarUrl || reel.userAvatarUrl;
  const timeAgo = reel.createdAt
    ? formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true, locale: vi })
    : '';

  return (
    <div
      className="rp-overlay"
      onClick={() => {
        if (!reportOpen && !reportedComment && !showEditModal && !showDeleteConfirm) onClose();
      }}
    >
      <button type="button" className="rp-close-btn" onClick={onClose} aria-label={translateCatalogKey('common.close')}>
        <X size={24} />
      </button>

      {currentIndex > 0 && (
        <button type="button" className="rp-nav-btn rp-nav-btn--prev" onClick={(event) => { event.stopPropagation(); goPrev(); }} aria-label="Reel trước">
          <ChevronUp size={25} />
        </button>
      )}

      <section
        className={`rp-shell${commentsOpen ? ' rp-shell--comments-open' : ''}${slideDirection ? ` rp-slide-${slideDirection}` : ''}`}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onAnimationEnd={() => setSlideDirection(null)}
      >
        <div className="rp-player" ref={playerRef}>
          <video
            ref={videoRef}
            className="rp-video"
            playsInline
            loop
          >
            <source src={getVideoUrl(reel.videoUrl)} type="video/mp4" />
          </video>

          <div className="rp-video-shade" />

          <div className="rp-info">
            <div className="rp-author">
              <Avatar src={authorAvatar} className="rp-author-avatar" alt={authorName} />
              <div className="rp-author-text">
                <strong className="rp-author-name">{authorName}</strong>
                <span className="rp-time">{timeAgo}</span>
              </div>
            </div>
            {reel.title && <h2 className="rp-title">{reel.title}</h2>}
            {(reel.caption || reel.description) && <p className="rp-description">{reel.caption || reel.description}</p>}
          </div>

          <div className="rp-actions" aria-label="Tương tác Reel">
            <button type="button" className={`rp-action-btn${liked ? ' rp-action-btn--liked' : ''}`} onClick={handleToggleLike} aria-label={translateCatalogKey('post.reaction.like')}>
              <span className="rp-action-icon"><Heart size={23} fill={liked ? 'currentColor' : 'none'} /></span>
              <span>{likeCount}</span>
            </button>
            <button type="button" className={`rp-action-btn${commentsOpen ? ' rp-action-btn--active' : ''}`} onClick={() => setCommentsOpen((open) => !open)} aria-label="Mở bình luận Reel">
              <span className="rp-action-icon"><MessageCircle size={23} /></span>
              <span>{commentCount}</span>
            </button>
            <button type="button" className="rp-action-btn" onClick={handleShare} aria-label="Chia sẻ Reel">
              <span className="rp-action-icon"><Share2 size={22} /></span>
              <span>Chia sẻ</span>
            </button>
            <div className="rp-owner-wrap" ref={menuRef}>
              <button type="button" className="rp-action-btn" onClick={() => setShowMenu((visible) => !visible)} aria-label="Tùy chọn quản lý Reel">
                <span className="rp-action-icon"><Settings2 size={22} /></span>
                <span>Tùy chọn</span>
              </button>
              {showMenu && (
                <div className="rp-owner-menu">
                  {isOwner ? (
                    <>
                      <button type="button" onClick={() => closeMenuAfter(() => setShowEditModal(true))}><Edit2 size={16} /> {t('reels.edit')}</button>
                      <button type="button" className="rp-menu-danger" onClick={() => closeMenuAfter(() => setShowDeleteConfirm(true))}><Trash2 size={16} /> {t('reels.delete')}</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => closeMenuAfter(() => toast.success(t('reels.markedInterested')))}><Star size={16} /> {t('post.interested')}</button>
                      <button type="button" onClick={handleMenuNotInterested}><EyeOff size={16} /> {t('post.notInterested')}</button>
                      <button type="button" onClick={handleMenuSave}><Bookmark size={16} /> {isSaved ? t('reels.unsave') : t('reels.save')}</button>
                      <button type="button" onClick={handleCopyLink}><Link2 size={16} /> {t('post.copyLink')}</button>
                      <hr className="rp-menu-divider" />
                      <button type="button" className="rp-menu-danger" onClick={() => closeMenuAfter(() => setReportOpen(true))}><Flag size={16} /> {t('reels.report')}</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <VideoPlaybackControls videoRef={videoRef} containerRef={playerRef} sourceKey={reel.videoUrl} label="Reel" />
        </div>

        <aside className="rp-comments-panel" aria-label="Bình luận Reel">
          <header className="rp-comments-header">
            <div><MessageCircle size={20} /><strong>Bình luận</strong><span>{commentCount}</span></div>
            <button type="button" onClick={() => setCommentsOpen(false)} aria-label="Đóng bình luận"><X size={19} /></button>
          </header>
          <div className="rp-comments-list">
            {commentsLoading ? (
              <div className="rp-comments-state"><Loader2 className="rp-spin" size={24} /><span>Đang tải bình luận...</span></div>
            ) : comments.length === 0 ? (
              <div className="rp-comments-state"><MessageCircle size={36} /><strong>Chưa có bình luận</strong><span>Hãy bắt đầu cuộc trò chuyện.</span></div>
            ) : comments.map((comment) => (
              <article className="rp-comment" key={comment.id}>
                <Avatar src={comment.author?.avatarUrl} className="rp-comment-avatar" alt={comment.author?.fullName || 'Người dùng'} />
                <div className="rp-comment-main">
                  <div className="rp-comment-bubble">
                    <strong>{comment.author?.fullName || 'Người dùng'}</strong>
                    <p>{comment.content}</p>
                  </div>
                  <div className="rp-comment-meta">
                    <span>{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi }) : ''}</span>
                    {comment.author?.id !== currentUser?.id && <button type="button" onClick={() => setReportedComment(comment)}>Báo cáo</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <form className="rp-comment-form" onSubmit={handleSendComment}>
            <Avatar src={currentUser?.avatarUrl} className="rp-comment-avatar" alt={currentUser?.fullName || 'Bạn'} />
            <div className="rp-comment-input-wrap">
              <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Viết bình luận..." aria-label="Viết bình luận Reel" />
              <button type="submit" disabled={!commentText.trim() || commentSending} aria-label="Gửi bình luận">
                {commentSending ? <Loader2 className="rp-spin" size={19} /> : <Send size={19} />}
              </button>
            </div>
          </form>
        </aside>
      </section>

      {currentIndex < reels.length - 1 && (
        <button type="button" className="rp-nav-btn rp-nav-btn--next" onClick={(event) => { event.stopPropagation(); goNext(); }} aria-label="Reel tiếp theo">
          <ChevronDown size={25} />
        </button>
      )}

      {showDeleteConfirm && (
        <div className="rp-confirm-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="rp-confirm-box">
            <h4>{t('reels.deleteTitle')}</h4>
            <p>{t('reels.irreversible')}</p>
            <div className="rp-confirm-actions">
              <button type="button" className="rp-btn rp-btn--secondary" onClick={() => setShowDeleteConfirm(false)}>{t('common.cancel')}</button>
              <button type="button" className="rp-btn rp-btn--danger" onClick={handleDelete} disabled={deleting}>{deleting ? t('common.deleting') : t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <EditReelModal reel={reel} isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSuccess={(updated) => { onReelUpdated?.(updated); setShowEditModal(false); }} />
      )}
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType={ModerationTargetType.Reel} targetId={reel.id} targetLabel="Reel này" />
      <ReportDialog open={Boolean(reportedComment)} onOpenChange={(open) => !open && setReportedComment(null)} targetType={ModerationTargetType.ReelComment} targetId={reportedComment?.id} targetLabel="bình luận này" />
    </div>
  );
};

export default ReelsPlayer;
