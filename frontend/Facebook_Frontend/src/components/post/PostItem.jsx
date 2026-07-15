import { useAuth } from "../../contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, Edit3, Trash2, X, Globe, Users, Lock, Bookmark, BookmarkCheck } from "lucide-react";
import Avatar from "../common/Avatar";
import MediaViewerModal from "./MediaViewerModal";
import CommentSection from "./CommentSection";
import SharePostModal from "./SharePostModal";
import PostDetailModal from "./PostDetailModal";
import EditPostModal from "./EditPostModal";
import PostActionMenu from "./PostActionMenu";
import DeleteUndoUI from "./DeleteUndoUI";
import NotInterestedItem from "./NotInterestedItem";
import ReportPostModal from "./ReportPostModal";
import { getImageUrl } from "../../utils/formatUrl";
import postService from "../../services/postService";
import savedItemsService from "../../services/savedItemsService";
import toast from "react-hot-toast";
import { PostPrivacy, PostType, ReactionType } from "../../shared/generated/enums";
import "./PostItem.css";

// Danh sách Cảm xúc chuẩn Facebook (id lấy từ shared ReactionType, chỉ giữ phần UI ở đây)
const REACTIONS = [
  { id: ReactionType.Like, icon: '👍', name: 'Thích', colorClass: 'reacted-like' },
  { id: ReactionType.Love, icon: '❤️', name: 'Yêu thích', colorClass: 'reacted-love' },
  { id: ReactionType.Haha, icon: '😂', name: 'Haha', colorClass: 'reacted-haha' },
  { id: ReactionType.Wow, icon: '😮', name: 'Wow', colorClass: 'reacted-wow' },
  { id: ReactionType.Sad, icon: '😢', name: 'Buồn', colorClass: 'reacted-sad' },
  { id: ReactionType.Angry, icon: '😡', name: 'Phẫn nộ', colorClass: 'reacted-angry' },
];

const PRIVACY_MAP = {
  [PostPrivacy.Public]: { icon: Globe, label: "Công khai" },
  [PostPrivacy.Friends]: { icon: Users, label: "Bạn bè" },
  [PostPrivacy.Private]: { icon: Lock, label: "Chỉ mình tôi" },
};

const POST_REACTION_CHANGED_EVENT = 'fbclone:post-reaction-changed';

const emitPostReactionChanged = (postId, nextState) => {
  window.dispatchEvent(new CustomEvent(POST_REACTION_CHANGED_EVENT, {
    detail: { postId, ...nextState },
  }));
};

const PostItem = ({ post, onPostUpdated, onPostHide }) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, index: 0 });
  const [detailPost, setDetailPost] = useState(null);

  // Permission check: chỉ hiển thị Edit/Delete nếu user là chủ post
  const isOwner = user?.id === post.author?.id;
  const isAutoPost = post.postType === PostType.ProfilePicture || post.postType === PostType.CoverPhoto;

  // --- STATE MENU 3 CHẤM ---
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // --- STATE EDIT POST MODAL ---
  const [showEditModal, setShowEditModal] = useState(false);

  // --- STATE DELETE POST ---
  const [, setDeleteLoading] = useState(false);
  const [isDeletionPending, setIsDeletionPending] = useState(false);
  const [deletionTimeRemaining, setDeletionTimeRemaining] = useState(10);
  const [showReportFromUndo, setShowReportFromUndo] = useState(false);

  // --- STATE NOT INTERESTED ---
  const [isNotInterested, setIsNotInterested] = useState(false);

  // --- STATE COMMENT SECTION ---
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || 0);

  // --- STATE SHARE POST MODAL ---
  const [showShareModal, setShowShareModal] = useState(false);

  // --- STATE COLLECTION MODAL ---
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [userCollections, setUserCollections] = useState([]);
  const [isSaved, setIsSaved] = useState(Boolean(post.isSaved));
  const [savedCollectionIds, setSavedCollectionIds] = useState([]);

  useEffect(() => {
    setIsSaved(Boolean(post.isSaved));
  }, [post.isSaved]);

  // Đóng menu khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS EDIT POST ---
  const handleOpenEdit = () => {
    setShowEditModal(true);
    setShowMenu(false);
  };

  // --- HANDLERS DELETE POST ---
  const handleOpenDelete = () => {
    setShowMenu(false);
    setIsDeletionPending(true);
    setDeletionTimeRemaining(10);
  };

  // Timer: countdown rồi tự xóa khi hết 10s
  useEffect(() => {
    if (!isDeletionPending) return;
    if (deletionTimeRemaining <= 0) {
      executeDelete();
      return;
    }
    const tid = setTimeout(() => setDeletionTimeRemaining((t) => t - 1), 1000);
    return () => clearTimeout(tid);
  }, [isDeletionPending, deletionTimeRemaining]);

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      await postService.deletePost(post.id);
      toast.success('Bài viết đã được xóa');
      onPostUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xóa bài viết thất bại!');
      setIsDeletionPending(false);
      setDeletionTimeRemaining(10);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUndoDelete = () => {
    setIsDeletionPending(false);
    setDeletionTimeRemaining(10);
    toast.success('Bài viết đã được khôi phục');
  };

  const handleDismissDelete = () => {
    setIsDeletionPending(false);
    executeDelete();
  };

  const handleReportFromUndo = () => {
    setIsDeletionPending(false);
    setDeletionTimeRemaining(10);
    setShowReportFromUndo(true);
  };

  // --- HANDLER SAVE POST ---
  const handleSavePost = async () => {
    try {
      await savedItemsService.savePost(post.id);
      setIsSaved(true);

      const [collectionsRes, stateRes] = await Promise.all([
        savedItemsService.getCollections(),
        savedItemsService.getPostCollectionState(post.id),
      ]);

      setUserCollections(collectionsRes.data?.data ?? []);
      setSavedCollectionIds(stateRes.data?.data?.collectionIds ?? []);
      setShowCollectionModal(true);
      toast.success('Đã lưu bài viết');
    } catch {
      toast.error('Lưu bài viết thất bại');
    }
  };

  const handleSaveToCollection = async ({ nextCollectionIds, newName } = {}) => {
    if (!nextCollectionIds && !newName) {
      setShowCollectionModal(false);
      return;
    }

    try {
      if (newName) {
        const res = await savedItemsService.createCollection(newName);
        const newCol = res.data?.data;
        if (newCol) {
          await savedItemsService.addPostToCollection(newCol.id, post.id);
          setUserCollections((prev) => [...prev, newCol]);
          setSavedCollectionIds((prev) => [...new Set([...prev, newCol.id])]);
          setIsSaved(true);
          toast.success(`Đã tạo bộ sưu tập "${newName}" và lưu bài viết`);
        }
      } else if (nextCollectionIds) {
        const previous = new Set(savedCollectionIds);
        const next = new Set(nextCollectionIds);
        const toAdd = [...next].filter((id) => !previous.has(id));
        const toRemove = [...previous].filter((id) => !next.has(id));

        await Promise.all([
          ...toAdd.map((id) => savedItemsService.addPostToCollection(id, post.id)),
          ...toRemove.map((id) => savedItemsService.removePostFromCollection(id, post.id)),
        ]);

        setSavedCollectionIds([...next]);
        setIsSaved(true);
        toast.success('Đã cập nhật bộ sưu tập');
      }
    } catch {
      toast.error('Thao tác thất bại');
    }

    setShowCollectionModal(false);
  };

  // --- STATE CẢM XÚC (Optimistic UI) ---
  // Giả sử backend trả về post.myReaction (ID cảm xúc user đã thả) và post.reactionsCount
  const [myReaction, setMyReaction] = useState(post.myReaction || null);
  const [reactionCount, setReactionCount] = useState(post.reactionsCount || 0);
  const [topReactions, setTopReactions] = useState(post.topReactions || []);

  const [reactorNames, setReactorNames] = useState(post.reactorNames || []);

  useEffect(() => {
    setMyReaction(post.myReaction || null);
    setReactionCount(post.reactionsCount || 0);
    setTopReactions(post.topReactions || []);
    setReactorNames(post.reactorNames || []);
    setLocalCommentsCount(post.commentsCount || 0);
  }, [post.id, post.myReaction, post.reactionsCount, post.topReactions, post.reactorNames, post.commentsCount]);

  useEffect(() => {
    const handlePostReactionChanged = (event) => {
      const { postId, myReaction: nextReaction, reactionCount: nextCount, topReactions: nextTop, reactorNames: nextNames } = event.detail || {};
      if (postId !== post.id) return;

      setMyReaction(nextReaction || null);
      setReactionCount(nextCount || 0);
      setTopReactions(nextTop || []);
      setReactorNames(nextNames || []);
    };

    window.addEventListener(POST_REACTION_CHANGED_EVENT, handlePostReactionChanged);
    return () => window.removeEventListener(POST_REACTION_CHANGED_EVENT, handlePostReactionChanged);
  }, [post.id]);

  const textLimit = 120;
  const isLongText = post.content && post.content.length > textLimit;
  const displayText = isExpanded ? post.content : post.content?.substring(0, textLimit);

  const openViewer = (index) => setViewerData({ isOpen: true, index });

  // 1. SỬA HÀM XỬ LÝ CẢM XÚC
  const handleReact = async (reactionId) => {
    const prevReaction = myReaction;
    const prevCount = reactionCount;
    const prevTop = [...topReactions];
    const prevNames = [...reactorNames]; 

    let newTop = [...topReactions];
    let newNames = [...reactorNames];
    let nextReaction = reactionId;
    let nextCount = prevCount;

    if (Number(myReaction) === Number(reactionId)) {
      // TRƯỜNG HỢP HỦY:
      nextReaction = null;
      nextCount = Math.max(0, prevCount - 1);
      setMyReaction(null);
      setReactionCount(nextCount);
      if (prevCount - 1 <= 0) newTop = [];
      else newTop = newTop.filter(id => Number(id) !== Number(reactionId)); // Xóa icon vừa hủy khỏi danh sách

      // Rút tên của mình ra khỏi danh sách hiển thị
      const currentName = user?.fullName || user?.email;
      if (currentName) newNames = newNames.filter(name => name !== currentName);
    } else {
      // TRƯỜNG HỢP THẢ MỚI HOẶC ĐỔI CẢM XÚC:
      setMyReaction(reactionId);
      if (!prevReaction){  
        nextCount = prevCount + 1;
        setReactionCount(nextCount);
        const currentName = user?.fullName || user?.email || 'Ban';
        newNames = [currentName, ...newNames.filter(name => name !== currentName)].slice(0, 5);
      }

      // Nếu đang Đổi cảm xúc (từ cũ sang mới), ta phải xóa cái cũ đi trước
      if (prevReaction) newTop = newTop.filter(id => Number(id) !== Number(prevReaction));
      
      // Thêm cảm xúc mới lên đầu danh sách (nếu chưa có)
      if (!newTop.some(id => Number(id) === Number(reactionId))) {
        newTop.unshift(reactionId);
      }
    }
    
    const nextTop = newTop.slice(0, 3);
    setTopReactions(nextTop); // Luôn giữ tối đa 3 icon
    setReactorNames(newNames); // 👇 CẬP NHẬT STATE TÊN
    emitPostReactionChanged(post.id, {
      myReaction: nextReaction,
      reactionCount: nextCount,
      topReactions: nextTop,
      reactorNames: newNames,
    });

    // 2. Gọi API ngầm ở background
    try {
      await postService.reactPost(post.id, reactionId); 
    } catch (error) {
      console.error("Lỗi thả cảm xúc:", error);
      setMyReaction(prevReaction);
      setReactionCount(prevCount);
      setTopReactions(prevTop);
      setReactorNames(prevNames); // Trả lại mảng tên cũ
      emitPostReactionChanged(post.id, {
        myReaction: prevReaction,
        reactionCount: prevCount,
        topReactions: prevTop,
        reactorNames: prevNames,
      });
    }
  };

  // Xác định icon và text hiện tại của nút Thích
  const currentReactionData = myReaction ? REACTIONS.find(r => r.id === Number(myReaction)) : null;
  // Lấy dữ liệu ảnh (giữ nguyên logic cũ)
  const renderMediaGallery = () => {
    if (!post.medias || post.medias.length === 0) return null;
    const count = post.medias.length;
    const m = post.medias;

    const MediaThumb = ({ media, onClick, extraClass = "" }) => (
      <div onClick={onClick} className={`media-thumb ${extraClass}`}>
        {media.mediaType === 1 ? <video src={getImageUrl(media.url, 'videos')} /> : <img src={getImageUrl(media.url, 'posts')} />}
      </div>
    );

    if (count === 1) return <div className="media-grid-1"><MediaThumb media={m[0]} onClick={() => openViewer(0)} /></div>;
    if (count === 2) return <div className="media-grid-2"><MediaThumb media={m[0]} onClick={() => openViewer(0)} /><MediaThumb media={m[1]} onClick={() => openViewer(1)} /></div>;
    return (
      <div className="media-grid-3">
        <MediaThumb media={m[0]} onClick={() => openViewer(0)} extraClass="media-item-main" />
        <MediaThumb media={m[1]} onClick={() => openViewer(1)} extraClass="media-item-sub" />
        <div className="media-item-sub">
          <MediaThumb media={m[2]} onClick={() => openViewer(2)} />
          {count > 3 && <div onClick={() => openViewer(2)} className="media-overlay-more"><span className="more-count">+{count - 3}</span></div>}
        </div>
      </div>
    );
  };

  const openPostDetail = (targetPost = post) => {
    setDetailPost(targetPost);
  };

  const handleModalReactionChanged = (postId, nextState) => {
    if (postId === post.id) {
      setMyReaction(nextState.myReaction);
      setReactionCount(nextState.reactionCount);
      setTopReactions(nextState.topReactions || []);
      setReactorNames(nextState.reactorNames || []);
    }

    setDetailPost((current) => {
      if (!current || current.id !== postId) return current;
      return {
        ...current,
        myReaction: nextState.myReaction,
        reactionsCount: nextState.reactionCount,
        topReactions: nextState.topReactions || [],
        reactorNames: nextState.reactorNames || [],
      };
    });
  };

  const handleModalCommentChanged = (postId, nextCount) => {
    if (postId === post.id) {
      setLocalCommentsCount(nextCount);
    }

    setDetailPost((current) => {
      if (!current || current.id !== postId) return current;
      return {
        ...current,
        commentsCount: nextCount,
      };
    });
  };

  const renderSharedPostPreview = (sharedPost) => {
    if (!sharedPost) return null;

    const sharedMedias = sharedPost.medias || [];

    return (
      <div className="shared-post-preview">
        <div className="shared-post-header">
          <Avatar src={sharedPost.author?.avatarUrl} className="w-9 h-9" />
          <div className="shared-post-author-info">
            <Link
              to={`/profile/${sharedPost.author?.id}`}
              className="shared-post-author"
              onClick={(event) => event.stopPropagation()}
            >
              {sharedPost.author?.fullName || 'Nguoi dung'}
            </Link>
            <span className="shared-post-time">
              {new Date(sharedPost.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        {sharedPost.content && (
          <div className="shared-post-content">{sharedPost.content}</div>
        )}

        {sharedMedias.length > 0 && (
          <div className={`shared-post-media shared-post-media--${Math.min(sharedMedias.length, 3)}`}>
            {sharedMedias.slice(0, 3).map((media, index) => (
              <div key={media.id || media.url} className="shared-post-media-item">
                {media.mediaType === 1 ? (
                  <video src={getImageUrl(media.url, 'videos')} />
                ) : (
                  <img src={getImageUrl(media.url, 'posts')} alt="" />
                )}
                {index === 2 && sharedMedias.length > 3 && (
                  <div className="shared-post-media-more">+{sharedMedias.length - 3}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isNotInterested) {
    return (
      <NotInterestedItem
        onUndo={() => setIsNotInterested(false)}
        onDismiss={() => onPostHide?.(post.id)}
      />
    );
  }

  if (isDeletionPending) {
    return (
      <DeleteUndoUI
        timeRemaining={deletionTimeRemaining}
        onUndo={handleUndoDelete}
        onReport={handleReportFromUndo}
        onDismiss={handleDismissDelete}
      />
    );
  }

  return (
    <div className="fb-card">
      <div className="post-header">
        <div className="post-header-left">
          <Link to={`/profile/${post.author?.id}`}>
            <Avatar src={post.author?.avatarUrl} className="w-10 h-10" />
          </Link>
          <div className="author-info">
            <Link to={`/profile/${post.author?.id}`} className="author-name-link">
              <h4 className="author-name">{post.author?.fullName}</h4>
            </Link>
            <span className="post-time hover:underline cursor-pointer">
              {new Date(post.createdAt).toLocaleString('vi-VN')} • 
              {(() => {
                const p = PRIVACY_MAP[post.privacy] || PRIVACY_MAP[1];
                const Icon = p.icon;
                return <Icon size={12} className="post-privacy-icon" title={p.label} />;
              })()}
            </span>
          </div>
        </div>
        {/* Menu button: chỉ hiển thị khi là owner */}
        {isOwner && (
          <>
            <button className="post-header-more-btn" onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={20} /></button>
            {/* Dropdown owner: Edit/Delete — auto posts (ProfilePicture/Cover) không cho phép delete và edit content */}
            {showMenu && (
              <div className="post-dropdown-menu" ref={menuRef}>
                <button className="post-dropdown-item" onClick={handleOpenEdit}>
                  <Edit3 size={16} /> {isAutoPost ? 'Chỉnh sửa chế độ hiển thị' : 'Chỉnh sửa bài viết'}
                </button>
                {!isAutoPost && (
                  <button className="post-dropdown-item post-dropdown-danger" onClick={handleOpenDelete}>
                    <Trash2 size={16} /> Xóa bài viết
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {/* Dropdown non-owner: tương tác bài viết */}
        {!isOwner && (
          <PostActionMenu
            postId={post.id}
            onPostHide={onPostHide}
            onNotInterested={() => setIsNotInterested(true)}
          />
        )}
      </div>

      {post.content && (
        <div 
          className={`post-text-content ${isExpanded ? 'cursor-pointer' : ''}`}
          onClick={() => openPostDetail(post)}
        >
          {displayText}
          {isLongText && !isExpanded && (
            <>
              <span>...</span>
              <span onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} className="see-more-btn">Xem thêm</span>
            </>
          )}
        </div>
      )}

      <div onClick={() => post.sharedPost && openPostDetail(post.sharedPost)}>
        {renderSharedPostPreview(post.sharedPost)}
      </div>

      {renderMediaGallery()}

      {/* THỐNG KÊ (Thay đổi reactionCount và Icon theo state) */}
      <div className="post-stats">
        {/* TRÁI: Hiển thị icon cảm xúc */}
        {reactionCount > 0 ? (
          <div className="flex items-center gap-1.5 cursor-pointer hover:underline"
              title={reactorNames?.length > 0 
              ? reactorNames.join(", ") + (reactionCount > reactorNames.length ? ` và ${reactionCount - reactorNames.length} người khác...` : "") 
              : ""}
              >
            
            {/* 👇 DÙNG VÒNG LẶP ĐỂ VẼ TOP REACTION (Không hardcode Like nữa) 👇 */}
            <div className="flex -space-x-1 items-center z-10">
              {topReactions.length > 0 ? (
                topReactions.map((rId, index) => {
                  const rData = REACTIONS.find(r => r.id === Number(rId));
                  if (!rData) return null;
                  
                  // Icon Like (ID: 1) phải render nền xanh đặc biệt
                  if (rData.id === ReactionType.Like) {
                    return (
                      <span key={rData.id} className="bg-[#1877f2] flex items-center justify-center w-[20px] h-[20px] rounded-full border-2 border-white" style={{ zIndex: 3 - index }}>
                        <ThumbsUp size={11} fill="white" strokeWidth={0} />
                      </span>
                    );
                  }
                  
                  // Các icon còn lại (Tim, Wow, Haha...)
                  return (
                    <span key={rData.id} className="text-[20px] leading-none border-2 border-white rounded-full bg-white" style={{ zIndex: 3 - index }}>
                      {rData.icon}
                    </span>
                  );
                })
              ) : (
                // Lỡ mảng trống (lỗi API) thì mới back up bằng nút Like
                <span className="bg-[#1877f2] flex items-center justify-center w-[20px] h-[20px] rounded-full border-2 border-white z-10">
                  <ThumbsUp size={11} fill="white" strokeWidth={0} />
                </span>
              )}
            </div>

            <span className="post-reaction-count">{reactionCount}</span>
          </div>
        ) : (
          <div></div> 
        )}

        {/* PHẢI: Bình luận và Chia sẻ */}
        <div className="stats-right">
          <div className="hover:underline cursor-pointer" onClick={() => setShowComments(!showComments)}>{localCommentsCount || 0} bình luận</div>
          {(post.sharesCount > 0) && <div className="hover:underline cursor-pointer">{post.sharesCount} chia sẻ</div>}
        </div>
      </div>

      {/* NÚT CHỨC NĂNG CÓ POPOVER CẢM XÚC */}
      <div className="post-actions">
        
          {/* 2. SỬA LẠI SỰ KIỆN CLICK CỦA NÚT THÍCH CHÍNH */}
          <div className="reaction-container">
            <button 
              // 👇 Nếu có myReaction rồi thì gửi chính myReaction đó đi để HỦY. Chưa có thì gửi 1 (Like).
              onClick={() => handleReact(myReaction || ReactionType.Like)} 
              className={`action-btn ${currentReactionData?.colorClass || ''}`}
            >
              {currentReactionData ? (
                <span className="text-[20px] leading-none">{currentReactionData.icon}</span>
              ) : (
                <ThumbsUp size={20} />
              )}
              {currentReactionData ? currentReactionData.name : 'Thích'}
            </button>

          {/* Popover chứa 6 cái Emoji nổi lên */}
          <div className="reaction-popover">
            {REACTIONS.map((reaction) => (
              <span 
                key={reaction.id} 
                className="reaction-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReact(reaction.id);
                }}
                title={reaction.name}
              >
                {reaction.icon}
              </span>
            ))}
          </div>
        </div>

        <button className="action-btn" onClick={() => setShowComments(!showComments)}><MessageSquare size={20} /> Bình luận</button>
        <button className="action-btn" onClick={() => setShowShareModal(true)}><Share2 size={20} /> Chia sẻ</button>
        <button className={`action-btn save-action-btn ${isSaved ? 'saved' : ''}`} onClick={handleSavePost}>
          {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          Lưu
        </button>
      </div>

      <MediaViewerModal isOpen={viewerData.isOpen} onClose={() => setViewerData({ isOpen: false, index: 0 })} medias={post.medias} initialIndex={viewerData.index}/>

      {/* COMMENT SECTION */}
      {showComments && (
        <CommentSection
          postId={post.id}
          onCommentAdded={() => setLocalCommentsCount((c) => c + 1)}
        />
      )}

      {/* SHARE POST MODAL */}
      <SharePostModal
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShared={onPostUpdated}
      />

      {/* MODAL CHỈNH SỬA BÀI VIẾT */}
      {showEditModal && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={onPostUpdated}
          privacyOnly={isAutoPost}
        />
      )}

      {/* REPORT MODAL (từ undo UI) */}
      {showReportFromUndo && (
        <ReportPostModal
          postId={post.id}
          onClose={() => setShowReportFromUndo(false)}
        />
      )}

      {/* COLLECTION MODAL */}
      {showCollectionModal && (
        <PostCollectionModal
          onClose={() => setShowCollectionModal(false)}
          onSaveToCollection={handleSaveToCollection}
          userCollections={userCollections}
          savedCollectionIds={savedCollectionIds}
        />
      )}

      {detailPost && (
        <PostDetailModal
          key={detailPost.id}
          post={detailPost}
          onClose={() => setDetailPost(null)}
          onSelectPost={setDetailPost}
          onReactionChanged={handleModalReactionChanged}
          onCommentChanged={handleModalCommentChanged}
        />
      )}
    </div>
  );
};

// Modal chọn bộ sưu tập để lưu vào
const PostCollectionModal = ({ onClose, onSaveToCollection, userCollections, savedCollectionIds }) => {
  const [selectedIds, setSelectedIds] = useState(() => new Set(savedCollectionIds ?? []));
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const toggleCollection = (collectionId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) next.delete(collectionId);
      else next.add(collectionId);
      return next;
    });
  };

  const handleConfirm = () => {
    onSaveToCollection({ nextCollectionIds: [...selectedIds] });
    onClose();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    onSaveToCollection({ newName: newName.trim() });
    setNewName('');
    setShowCreate(false);
    onClose();
  };

  return (
    <div className="modal-collection-overlay" onClick={onClose}>
      <div className="modal-collection" onClick={(e) => e.stopPropagation()}>
        <div className="modal-collection-header">
          <span>Lưu vào bộ sưu tập</span>
          <button className="modal-collection-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-collection-body">
          <button className="modal-collection-item modal-collection-item--active" type="button">
            <span>📌 Tất cả bài viết đã lưu</span>
            <span className="modal-collection-check">✓</span>
          </button>
          {userCollections.map((col) => (
            <button
              key={col.id}
              className={`modal-collection-item ${selectedIds.has(col.id) ? 'modal-collection-item--active' : ''}`}
              onClick={() => toggleCollection(col.id)}
            >
              <span>📁 {col.name}</span>
              {selectedIds.has(col.id) && <span className="modal-collection-check">✓</span>}
            </button>
          ))}
          {!showCreate ? (
            <button className="modal-collection-create-btn" onClick={() => setShowCreate(true)}>
              + Tạo bộ sưu tập mới
            </button>
          ) : (
            <div className="modal-collection-create-form">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên bộ sưu tập..."
                className="modal-collection-input"
                autoFocus
              />
              <button className="modal-collection-create-confirm" onClick={handleCreate}>Tạo</button>
              <button className="modal-collection-create-cancel" onClick={() => setShowCreate(false)}>Hủy</button>
            </div>
          )}
        </div>
        <div className="modal-collection-footer">
          <button className="modal-collection-confirm" onClick={handleConfirm}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostItem;
