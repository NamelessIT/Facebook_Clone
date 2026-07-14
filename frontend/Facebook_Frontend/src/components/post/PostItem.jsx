import { useAuth } from "../../contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, Edit3, Trash2, X, Globe, Users, Lock, Bookmark, FolderPlus } from "lucide-react";
import Avatar from "../common/Avatar";
import MediaViewerModal from "./MediaViewerModal";
import CommentSection from "./CommentSection";
import SharePostModal from "./SharePostModal";
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

const PostItem = ({ post, onPostUpdated, onPostHide }) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, index: 0 });

  // Permission check: chỉ hiển thị Edit/Delete nếu user là chủ post
  const isOwner = user?.id === post.author?.id;
  const isAutoPost = post.postType === PostType.ProfilePicture || post.postType === PostType.CoverPhoto;

  // --- STATE MENU 3 CHẤM ---
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // --- STATE EDIT POST MODAL ---
  const [showEditModal, setShowEditModal] = useState(false);

  // --- STATE DELETE POST ---
  const [deleteLoading, setDeleteLoading] = useState(false);
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
  const [selectedCollections, setSelectedCollections] = useState([]);

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
      // Fetch collections từ API để hiện modal
      try {
        const res = await savedItemsService.getCollections();
        setUserCollections(res.data?.data ?? []);
      } catch { /* ignore */ }
      setShowCollectionModal(true);
      toast.success('Đã lưu bài viết');
    } catch {
      toast.error('Lưu bài viết thất bại');
    }
  };

  const handleSaveToCollection = async (colId, newName) => {
    if (!colId && !newName) {
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
          toast.success(`Đã tạo bộ sưu tập "${newName}" và lưu bài viết`);
        }
      } else if (colId) {
        await savedItemsService.addPostToCollection(colId, post.id);
        const col = userCollections.find((c) => c.id === colId);
        toast.success(`Đã lưu vào bộ sưu tập "${col?.name || 'bộ sưu tập'}"`);
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

    if (myReaction === reactionId) {
      // TRƯỜNG HỢP HỦY:
      setMyReaction(null);
      setReactionCount(prevCount - 1);
      if (prevCount - 1 === 0) newTop = [];
      else newTop = newTop.filter(id => id !== reactionId); // Xóa icon vừa hủy khỏi danh sách

      // Rút tên của mình ra khỏi danh sách hiển thị
      newNames = newNames.filter(name => name !== user?.fullName);
    } else {
      // TRƯỜNG HỢP THẢ MỚI HOẶC ĐỔI CẢM XÚC:
      setMyReaction(reactionId);
      if (!prevReaction){  
        setReactionCount(prevCount + 1);
        newNames.unshift(user?.fullName);
        newNames = newNames.slice(0, 5);
      }

      // Nếu đang Đổi cảm xúc (từ cũ sang mới), ta phải xóa cái cũ đi trước
      if (prevReaction) newTop = newTop.filter(id => id !== prevReaction);
      
      // Thêm cảm xúc mới lên đầu danh sách (nếu chưa có)
      if (!newTop.includes(reactionId)) {
        newTop.unshift(reactionId);
      }
    }
    
    setTopReactions(newTop.slice(0, 3)); // Luôn giữ tối đa 3 icon
    setReactorNames(newNames); // 👇 CẬP NHẬT STATE TÊN

    // 2. Gọi API ngầm ở background
    try {
      await postService.reactPost(post.id, reactionId); 
    } catch (error) {
      console.error("Lỗi thả cảm xúc:", error);
      setMyReaction(prevReaction);
      setReactionCount(prevCount);
      setTopReactions(prevTop);
      setReactorNames(prevNames); // Trả lại mảng tên cũ
    }
  };

  // Xác định icon và text hiện tại của nút Thích
  const currentReactionData = myReaction ? REACTIONS.find(r => r.id === Number(myReaction)) : null;  const ActionIcon = currentReactionData ? null : ThumbsUp;
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
          onClick={() => { if (isExpanded) setIsExpanded(false); }}
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
                  const rData = REACTIONS.find(r => r.id === rId);
                  if (!rData) return null;
                  
                  // Icon Like (ID: 1) phải render nền xanh đặc biệt
                  if (rData.id === 1) {
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

            <span className="text-[#65676b] ml-1">{reactionCount}</span>
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
              onClick={() => handleReact(myReaction || 1)} 
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
        <button className="action-btn" onClick={handleSavePost}><Bookmark size={20} /> Lưu</button>
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
      {showCollectionModal && <PostCollectionModal postId={post.id} onClose={() => setShowCollectionModal(false)} onSaveToCollection={handleSaveToCollection} userCollections={userCollections} />}
    </div>
  );
};

// Modal chọn bộ sưu tập để lưu vào
const PostCollectionModal = ({ postId, onClose, onSaveToCollection, userCollections }) => {
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleConfirm = () => {
    if (selected) {
      onSaveToCollection(selected);
    }
    onClose();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    onSaveToCollection(null, newName.trim());
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
          <button className={`modal-collection-item ${!selected ? 'modal-collection-item--active' : ''}`} onClick={() => setSelected(null)}>
            <span>📌 Tất cả bài viết đã lưu</span>
            {!selected && <span className="modal-collection-check">✓</span>}
          </button>
          {userCollections.map((col) => (
            <button
              key={col.id}
              className={`modal-collection-item ${selected === col.id ? 'modal-collection-item--active' : ''}`}
              onClick={() => setSelected(col.id)}
            >
              <span>📁 {col.name}</span>
              {selected === col.id && <span className="modal-collection-check">✓</span>}
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