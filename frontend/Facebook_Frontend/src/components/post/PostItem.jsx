import { useAuth } from "../../contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, Edit3, Trash2, X } from "lucide-react";
import Avatar from "../common/Avatar";
import MediaViewerModal from "./MediaViewerModal";
import CommentSection from "./CommentSection";
import SharePostModal from "./SharePostModal";
import { getImageUrl } from "../../utils/formatUrl";
import postService from "../../services/postService";
import toast from "react-hot-toast";
import "./PostItem.css";

// Danh sách Cảm xúc chuẩn Facebook
const REACTIONS = [
  { id: 1, icon: '👍', name: 'Thích', colorClass: 'reacted-like' },
  { id: 2, icon: '❤️', name: 'Yêu thích', colorClass: 'reacted-love' },
  { id: 3, icon: '😂', name: 'Haha', colorClass: 'reacted-haha' },
  { id: 4, icon: '😮', name: 'Wow', colorClass: 'reacted-wow' },
  { id: 5, icon: '😢', name: 'Buồn', colorClass: 'reacted-sad' },
  { id: 6, icon: '😡', name: 'Phẫn nộ', colorClass: 'reacted-angry' },
];

const PostItem = ({ post, onPostUpdated }) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, index: 0 });

  // Permission check: chỉ hiển thị Edit/Delete nếu user là chủ post
  const isOwner = user?.id === post.author?.id;

  // --- STATE MENU 3 CHẤM ---
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // --- STATE EDIT POST MODAL ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // --- STATE DELETE POST MODAL ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- STATE COMMENT SECTION ---
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || 0);

  // --- STATE SHARE POST MODAL ---
  const [showShareModal, setShowShareModal] = useState(false);

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
    setEditContent(post.content || "");
    setEditError("");
    setShowEditModal(true);
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      setEditError("Nội dung không được để trống");
      return;
    }
    setEditLoading(true);
    try {
      await postService.updatePost(post.id, { content: editContent });
      toast.success("Cập nhật bài viết thành công!");
      setShowEditModal(false);
      onPostUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại!");
    } finally {
      setEditLoading(false);
    }
  };

  // --- HANDLERS DELETE POST ---
  const handleOpenDelete = () => {
    setShowDeleteModal(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await postService.deletePost(post.id);
      toast.success("Đã xóa bài viết!");
      setShowDeleteModal(false);
      onPostUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa bài viết thất bại!");
    } finally {
      setDeleteLoading(false);
    }
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
            <span className="post-time hover:underline cursor-pointer">{new Date(post.createdAt).toLocaleString('vi-VN')} • 🌎</span>
          </div>
        </div>
        <button className="post-header-more-btn" onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={20} /></button>
        {/* Dropdown menu cho Edit/Delete */}
        {showMenu && isOwner && (
          <div className="post-dropdown-menu" ref={menuRef}>
            <button className="post-dropdown-item" onClick={handleOpenEdit}>
              <Edit3 size={16} /> Chỉnh sửa bài viết
            </button>
            <button className="post-dropdown-item post-dropdown-danger" onClick={handleOpenDelete}>
              <Trash2 size={16} /> Xóa bài viết
            </button>
          </div>
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
        <div className="post-modal-overlay" onMouseDown={() => setShowEditModal(false)}>
          <div className="post-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="post-modal-header">
              <h3>Chỉnh sửa bài viết</h3>
              <button className="post-modal-close" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <div className="post-modal-body">
              <textarea
                className="post-modal-textarea"
                value={editContent}
                onChange={(e) => { setEditContent(e.target.value); setEditError(""); }}
                placeholder="Bạn đang nghĩ gì?"
                rows={5}
              />
              {editError && <p className="post-modal-error">{editError}</p>}
            </div>
            <div className="post-modal-footer">
              <button className="post-modal-btn post-modal-btn-cancel" onClick={() => setShowEditModal(false)}>Hủy</button>
              <button className="post-modal-btn post-modal-btn-save" onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA BÀI VIẾT */}
      {showDeleteModal && (
        <div className="post-modal-overlay" onMouseDown={() => setShowDeleteModal(false)}>
          <div className="post-modal post-modal-sm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="post-modal-header">
              <h3>Xóa bài viết</h3>
              <button className="post-modal-close" onClick={() => setShowDeleteModal(false)}><X size={20} /></button>
            </div>
            <div className="post-modal-body">
              <p>Bạn chắc chắn muốn xóa bài post này? Hành động này không thể hoàn tác.</p>
            </div>
            <div className="post-modal-footer">
              <button className="post-modal-btn post-modal-btn-cancel" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="post-modal-btn post-modal-btn-delete" onClick={handleConfirmDelete} disabled={deleteLoading}>
                {deleteLoading ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostItem;