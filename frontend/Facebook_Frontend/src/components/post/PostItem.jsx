import { useState } from "react";
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import Avatar from "../common/Avatar";
import MediaViewerModal from "./MediaViewerModal";
import { getImageUrl } from "../../utils/formatUrl";
import "./PostItem.css";

const PostItem = ({ post }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, index: 0 });

  const textLimit = 150;
  const isLongText = post.content && post.content.length > textLimit;
  const displayText = isExpanded ? post.content : post.content?.substring(0, textLimit);

  const openViewer = (index) => setViewerData({ isOpen: true, index });

  // LOGIC RENDER GRID MEDIA
  const renderMediaGallery = () => {
    if (!post.medias || post.medias.length === 0) return null;

    const count = post.medias.length;
    const m = post.medias;

    // Component con bọc ảnh/video (Đã dùng class .media-thumb thuần CSS)
    const MediaThumb = ({ media, onClick, extraClass = "" }) => (
      <div onClick={onClick} className={`media-thumb ${extraClass}`}>
        {media.mediaType === 1 ? (
          <video src={getImageUrl(media.url, 'videos')} />
        ) : (
          <img src={getImageUrl(media.url, 'posts')} />
        )}
      </div>
    );

    if (count === 1) {
      return (
        <div className="media-grid-1">
          <MediaThumb media={m[0]} onClick={() => openViewer(0)} />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="media-grid-2">
          <MediaThumb media={m[0]} onClick={() => openViewer(0)} />
          <MediaThumb media={m[1]} onClick={() => openViewer(1)} />
        </div>
      );
    }

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
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Avatar src={post.author?.avatarUrl} className="w-10 h-10" />
          <div>
            <h4 className="font-semibold text-[15px] text-[#050505] leading-4">{post.author?.fullName}</h4>
            <span className="text-[13px] text-[#65676b] hover:underline cursor-pointer">
              {new Date(post.createdAt).toLocaleString('vi-VN')} • 🌎
            </span>
          </div>
        </div>
        <button className="w-9 h-9 rounded-full hover:bg-[#f0f2f5] flex items-center justify-center text-[#65676b] transition cursor-pointer">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* 2. NỘI DUNG CHỮ */}
      {post.content && (
        <div className="post-text-content">
          {displayText}
          {isLongText && !isExpanded && (
            <>
              <span>... </span>
              <span onClick={() => setIsExpanded(true)} className="see-more-text">Xem thêm</span>
            </>
          )}
        </div>
      )}

      {/* 3. KHU VỰC ẢNH/VIDEO */}
      {renderMediaGallery()}

      {/* 4. THỐNG KÊ (Likes/Comments) */}
      <div className="px-4 py-2.5 flex justify-between text-[#65676b] text-[15px] border-b border-[#ced0d4] mx-4 mt-1">
        <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
          <span className="bg-[#1877f2] text-white rounded-full p-1"><ThumbsUp size={12} fill="white" /></span>
          {post.reactionsCount || 0}
        </div>
        <div className="hover:underline cursor-pointer">{post.commentsCount || 0} bình luận</div>
      </div>

      {/* 5. NÚT CHỨC NĂNG */}
      <div className="flex justify-between px-4 py-1">
        <button className="action-btn"><ThumbsUp size={20} /> Thích</button>
        <button className="action-btn"><MessageSquare size={20} /> Bình luận</button>
        <button className="action-btn"><Share2 size={20} /> Chia sẻ</button>
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