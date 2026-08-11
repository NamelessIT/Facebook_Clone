import { useEffect, useRef, useState } from 'react';
import { X, Globe, Users, Lock, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from '../../shared/appToast';
import Avatar from '../common/Avatar';
import CommentSection from './CommentSection';
import SharePostModal from './SharePostModal';
import { useAuth } from '../../contexts/AuthContext';
import { getImageUrl } from '../../utils/formatUrl';
import { PostPrivacy, ReactionType } from '../../shared/generated/enums';
import postService from '../../services/postService';
import './PostDetailModal.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const PRIVACY_MAP = {
  [PostPrivacy.Public]: { icon: Globe, labelKey: 'privacy.public' },
  [PostPrivacy.Friends]: { icon: Users, labelKey: 'privacy.friends' },
  [PostPrivacy.Private]: { icon: Lock, labelKey: 'privacy.onlyMe' },
};

const REACTIONS = [
  { id: ReactionType.Like, icon: '👍', name: 'Thich', colorClass: 'reacted-like' },
  { id: ReactionType.Love, icon: '❤️', name: 'Yeu thich', colorClass: 'reacted-love' },
  { id: ReactionType.Haha, icon: '😂', name: 'Haha', colorClass: 'reacted-haha' },
  { id: ReactionType.Wow, icon: '😮', name: 'Wow', colorClass: 'reacted-wow' },
  { id: ReactionType.Sad, icon: '😢', name: 'Buon', colorClass: 'reacted-sad' },
  { id: ReactionType.Angry, icon: '😡', name: 'Phan no', colorClass: 'reacted-angry' },
];

const POST_REACTION_CHANGED_EVENT = 'fbclone:post-reaction-changed';

const emitPostReactionChanged = (postId, nextState) => {
  window.dispatchEvent(new CustomEvent(POST_REACTION_CHANGED_EVENT, {
    detail: { postId, ...nextState },
  }));
};

const PostDetailModal = ({ post, onClose, onSelectPost, onReactionChanged, onCommentChanged }) => {
  const { user } = useAuth();
  const overlayRef = useRef(null);
  const [myReaction, setMyReaction] = useState(post.myReaction || null);
  const [reactionCount, setReactionCount] = useState(post.reactionsCount ?? post.likesCount ?? 0);
  const [topReactions, setTopReactions] = useState(post.topReactions || []);
  const [reactorNames, setReactorNames] = useState(post.reactorNames || []);
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    let isActive = true;

    const fetchLatestPostState = async () => {
      try {
        const response = await postService.getById(post.id);
        const freshPost = response.data?.data ?? response.data;
        if (!isActive || !freshPost) return;

        setMyReaction(freshPost.myReaction || null);
        setReactionCount(freshPost.reactionsCount ?? freshPost.likesCount ?? 0);
        setTopReactions(freshPost.topReactions || []);
        setReactorNames(freshPost.reactorNames || []);
        setCommentCount(freshPost.commentsCount || 0);
      } catch (error) {
        toast.apiError(error, translateCatalogKey('post.loadFailed'), { context: "posts.detail.refresh" });
      }
    };

    fetchLatestPostState();
    return () => {
      isActive = false;
    };
  }, [post.id]);

  useEffect(() => {
    const handlePostReactionChanged = (event) => {
      const {
        postId,
        myReaction: nextReaction,
        reactionCount: nextCount,
        topReactions: nextTop,
        reactorNames: nextNames,
      } = event.detail || {};

      if (postId !== post.id) return;
      setMyReaction(nextReaction || null);
      setReactionCount(nextCount || 0);
      setTopReactions(nextTop || []);
      setReactorNames(nextNames || []);
    };

    window.addEventListener(POST_REACTION_CHANGED_EVENT, handlePostReactionChanged);
    return () => window.removeEventListener(POST_REACTION_CHANGED_EVENT, handlePostReactionChanged);
  }, [post.id]);

  const handleOverlayClick = (event) => {
    if (event.target === overlayRef.current) onClose();
  };

  const hasMedia = post.medias && post.medias.length > 0;
  const privacyInfo = PRIVACY_MAP[post.privacy] || PRIVACY_MAP[PostPrivacy.Public];
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
        alt={translateCatalogKey('ui.components.post.cardsavedpost.post-media.981dca15')}
        className="pdm-media-el"
      />
    );
  };

  const renderSharedPostPreview = () => {
    const sharedPost = post.sharedPost;
    if (!sharedPost) return null;

    const sharedMedias = sharedPost.medias || [];

    return (
      <button
        className="pdm-shared-preview"
        type="button"
        onClick={() => onSelectPost?.(sharedPost)}
      >
        <div className="pdm-shared-header">
          <Avatar src={sharedPost.author?.avatarUrl} className="pdm-shared-avatar" />
          <div className="pdm-shared-author-info">
            <span className="pdm-shared-author">{sharedPost.author?.fullName || translateCatalogKey('ui.components.post.postdetailmodal.nguoi-dung.3b81093d')}</span>
            <span className="pdm-shared-time">
              {new Date(sharedPost.createdAt).toLocaleString("vi-VN")}
            </span>
          </div>
        </div>

        {sharedPost.content && (
          <div className="pdm-shared-text">{sharedPost.content}</div>
        )}

        {sharedMedias.length > 0 && (
          <div className={`pdm-shared-media pdm-shared-media--${Math.min(sharedMedias.length, 3)}`}>
            {sharedMedias.slice(0, 3).map((media, index) => (
              <div key={media.id || media.url} className="pdm-shared-media-item">
                {media.mediaType === 1 ? (
                  <video src={getImageUrl(media.url, 'videos')} />
                ) : (
                  <img src={getImageUrl(media.url, 'posts')} alt="" />
                )}
                {index === 2 && sharedMedias.length > 3 && (
                  <span className="pdm-shared-media-more">+{sharedMedias.length - 3}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </button>
    );
  };

  const publishReactionChange = (nextState) => {
    onReactionChanged?.(post.id, nextState);
    emitPostReactionChanged(post.id, nextState);
  };

  const handleReact = async (reactionId) => {
    const prevReaction = myReaction;
    const prevCount = reactionCount;
    const prevTop = [...topReactions];
    const prevNames = [...reactorNames];
    let nextReaction = reactionId;
    let nextCount = prevCount;
    let nextTop = [...topReactions];
    let nextNames = [...reactorNames];

    if (Number(prevReaction) === Number(reactionId)) {
      nextReaction = null;
      nextCount = Math.max(0, prevCount - 1);
      nextTop = nextCount === 0 ? [] : nextTop.filter((id) => Number(id) !== Number(reactionId));
      const currentName = user?.fullName || user?.email;
      nextNames = currentName
        ? nextNames.filter((name) => name !== currentName)
        : nextNames.slice(1);
    } else {
      if (!prevReaction) {
        nextCount = prevCount + 1;
        const currentName = user?.fullName || user?.email || 'Ban';
        nextNames = [currentName, ...nextNames.filter((name) => name !== currentName)].slice(0, 5);
      } else {
        nextTop = nextTop.filter((id) => Number(id) !== Number(prevReaction));
      }
      if (!nextTop.some((id) => Number(id) === Number(reactionId))) nextTop.unshift(reactionId);
    }

    nextTop = nextTop.slice(0, 3);

    setMyReaction(nextReaction);
    setReactionCount(nextCount);
    setTopReactions(nextTop);
    setReactorNames(nextNames);
    publishReactionChange({
      myReaction: nextReaction,
      reactionCount: nextCount,
      topReactions: nextTop,
      reactorNames: nextNames,
    });

    try {
      await postService.reactPost(post.id, reactionId);
    } catch (error) {
      setMyReaction(prevReaction);
      setReactionCount(prevCount);
      setTopReactions(prevTop);
      setReactorNames(prevNames);
      publishReactionChange({
        myReaction: prevReaction,
        reactionCount: prevCount,
        topReactions: prevTop,
        reactorNames: prevNames,
      });
      toast.apiError(error, translateCatalogKey('ui.components.post.postdetailmodal.khong-the-tha-cam-xuc.72436747'), { context: "posts.reaction" });
    }
  };

  const currentReactionData = myReaction
    ? REACTIONS.find((reaction) => reaction.id === Number(myReaction))
    : null;

  return (
    <div className="pdm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={`pdm-dialog ${!hasMedia ? 'pdm-dialog--no-media' : ''}`}>
        <button className="pdm-close" onClick={onClose} aria-label={translateCatalogKey('ui.components.post.postdetailmodal.dong.e6fcdec1')}>
          <X size={20} />
        </button>

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

        <div className="pdm-content-panel">
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
                {new Date(post.createdAt).toLocaleString("vi-VN")} -{' '}
                <PrivacyIcon size={12} className="pdm-privacy-icon" title={translateCatalogKey(privacyInfo.labelKey)} />
              </span>
            </div>
          </div>

          {post.content && (
            <p className="pdm-text">{post.content}</p>
          )}

          {renderSharedPostPreview()}

          {!post.content && !hasMedia && !post.sharedPost && (
            <p className="pdm-text pdm-text--empty">{translateCatalogKey('ui.components.post.postdetailmodal.bai-viet-khong-co-noi-dung.9b1b52ff')}</p>
          )}

          <div className="pdm-stats">
            {reactionCount > 0 && (
              <span className="pdm-stat-item">
                <span className="pdm-top-reactions">
                  {topReactions.length > 0 ? (
                    topReactions.map((reactionId) => {
                      const reaction = REACTIONS.find((item) => item.id === Number(reactionId));
                      return reaction ? <span key={reaction.id}>{reaction.icon}</span> : null;
                    })
                  ) : (
                    <ThumbsUp size={14} />
                  )}
                </span>
                {reactionCount}
              </span>
            )}
            {commentCount > 0 && (
              <span className="pdm-stat-item">
                <MessageSquare size={14} />
                {commentCount} {translateCatalogKey('ui.components.post.postdetailmodal.binh-luan.700ab913')}
              </span>
            )}
          </div>

          <div className="pdm-actions">
            <div className="pdm-reaction-container">
              <button
                className={`pdm-action-btn ${currentReactionData?.colorClass || ''}`}
                type="button"
                onClick={() => handleReact(myReaction || ReactionType.Like)}
              >
                {currentReactionData ? (
                  <span className="pdm-current-reaction-icon">{currentReactionData.icon}</span>
                ) : (
                  <ThumbsUp size={18} />
                )}
                <span>{currentReactionData ? currentReactionData.name : translateCatalogKey('ui.components.post.postdetailmodal.thich.52a71335')}</span>
              </button>

              <div className="pdm-reaction-popover">
                {REACTIONS.map((reaction) => (
                  <button
                    key={reaction.id}
                    className="pdm-reaction-option"
                    type="button"
                    title={reaction.name}
                    onClick={() => handleReact(reaction.id)}
                  >
                    {reaction.icon}
                  </button>
                ))}
              </div>
            </div>
            <button className="pdm-action-btn" type="button" onClick={() => setShowComments((value) => !value)}>
              <MessageSquare size={18} />
              <span>{translateCatalogKey('ui.components.post.postdetailmodal.binh-luan.484811c9')}</span>
            </button>
            <button className="pdm-action-btn" type="button" onClick={() => setShowShareModal(true)}>
              <Share2 size={18} />
              <span>{translateCatalogKey('ui.components.post.postdetailmodal.chia-se.75ec1af8')}</span>
            </button>
          </div>

          {showComments && (
            <CommentSection
              postId={post.id}
              onCommentAdded={() => {
                setCommentCount((count) => {
                  const next = count + 1;
                  onCommentChanged?.(post.id, next);
                  return next;
                });
              }}
            />
          )}
        </div>
      </div>

      <SharePostModal
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};

export default PostDetailModal;
