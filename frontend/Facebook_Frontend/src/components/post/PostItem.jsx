import { useState } from "react";
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import Avatar from "../common/Avatar";
import MediaViewerModal from "./MediaViewerModal";
import { getImageUrl } from "../../utils/formatUrl";
import "./PostItem.css";

const PostItem = ({ post }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, index: 0 });

  // 120 ký tự xấp xỉ 2 dòng trên màn hình PC
  const textLimit = 120;
  const isLongText = post.content && post.content.length > textLimit;
  const displayText = isExpanded ? post.content : post.content?.substring(0, textLimit);

  const openViewer = (index) => setViewerData({ isOpen: true, index });

  const renderMediaGallery = () => {
    if (!post.medias || post.medias.length === 0) return null;

    const count = post.medias.length;
    const m = post.medias;

    const MediaThumb = ({ media, onClick, extraClass = "" }) => (
      <div onClick={onClick} className={`media-thumb ${extraClass}`}>
        {media.mediaType === 1 ? (
          <video src={getImageUrl(media.url, 'videos')} />
        ) : (
          <img src={getImageUrl(media.url, 'posts')} />
        )}
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
          {count > 3 && (
            <div onClick={() => openViewer(2)} className="media-overlay-more">
              <span className="more-count">+{count - 3}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fb-card">
      {/* 1. HEADER */}
      <div className="post-header">
        <div className="post-header-left">
          <Avatar src={post.author?.avatarUrl} className="w-10 h-10" />
          <div className="author-info">
            <h4 className="author-name">{post.author?.fullName}</h4>
            <span className="post-time hover:underline cursor-pointer">
              {new Date(post.createdAt).toLocaleString('vi-VN')} • 🌎
            </span>
          </div>
        </div>
        
        {/* 👇 CHỈ DÙNG CLASS CSS THUẦN, BỎ HẾT TAILWIND Ở ĐÂY ĐỂ TRÁNH LỖI VIỀN */}
        <button className="post-header-more-btn">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* 2. NỘI DUNG CHỮ */}
      {post.content && (
        <div 
          className={`post-text-content ${isExpanded ? 'cursor-pointer' : ''}`}
          onClick={() => {
            // Chỉ thu gọn khi nó đang mở
            if (isExpanded) setIsExpanded(false);
          }}
          title={isExpanded ? "Nhấn để thu gọn" : ""}
        >
          {displayText}
          {isLongText && !isExpanded && (
            <>
              <span>...</span>
              <span 
                onClick={(e) => {
                  e.stopPropagation(); // 👈 Ngăn click truyền lên div cha
                  setIsExpanded(true);
                }} 
                className="see-more-btn"
              >
                Xem thêm
              </span>
            </>
          )}
        </div>
      )}

      {/* 3. KHU VỰC ẢNH/VIDEO */}
      {renderMediaGallery()}

      {/* 4. THỐNG KÊ (Likes/Comments/Shares) */}
      <div className="post-stats">
        {/* Trái: Icon Like và Số lượng */}
        <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
          <span className="bg-[#1877f2] text-white rounded-full p-1"><ThumbsUp size={12} fill="white" /></span>
          {post.reactionsCount || 0}
        </div>
        
        {/* Phải: Bình luận và Chia sẻ */}
        <div className="stats-right">
          <div className="hover:underline cursor-pointer">
            {post.commentsCount || 0} bình luận
          </div>
          {/* Chỉ hiện Chia sẻ nếu > 0. Dùng (post.sharesCount || 0) nếu backend có trả về */}
          {(post.sharesCount > 0) && (
            <div className="hover:underline cursor-pointer">
              {post.sharesCount} chia sẻ
            </div>
          )}
        </div>
      </div>

      {/* 5. NÚT CHỨC NĂNG */}
      <div className="post-actions">
        <button className="action-btn">
          <ThumbsUp size={20} /> Thích
        </button>
        <button className="action-btn">
          <MessageSquare size={20} /> Bình luận
        </button>
        <button className="action-btn">
          <Share2 size={20} /> Chia sẻ
        </button>
      </div>

      {/* NHÚNG MODAL XEM CHI TIẾT */}
      <MediaViewerModal 
        isOpen={viewerData.isOpen} 
        onClose={() => setViewerData({ isOpen: false, index: 0 })}
        medias={post.medias}
        initialIndex={viewerData.index}
      />
    </div>
  );
};

export default PostItem;