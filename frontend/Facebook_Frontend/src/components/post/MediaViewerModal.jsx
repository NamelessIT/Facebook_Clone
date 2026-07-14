import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // 👈 1. IMPORT CÁI NÀY
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getImageUrl } from "../../utils/formatUrl";
import "./MediaViewerModal.css";

const MediaViewerModal = ({ isOpen, onClose, medias, initialIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  // Cập nhật index khi props thay đổi
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentIndex(initialIndex || 0);
  }, [initialIndex, isOpen]);

  if (!isOpen || !medias || medias.length === 0) return null;

  const currentMedia = medias[currentIndex];
  const isVideo = currentMedia.mediaType === 1; 

  const handlePrev = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentIndex < medias.length - 1) setCurrentIndex(currentIndex + 1);
  };

  // 👇 2. DÙNG CREATE PORTAL ĐỂ RENDER RA THẲNG DOCUMENT BODY
  return createPortal(
    <div className="media-viewer-overlay" onClick={onClose}>
      <button onClick={onClose} className="close-viewer-btn">
        <X size={24} />
      </button>

      <div className="media-viewer-left" onClick={(e) => e.stopPropagation()}>
        {currentIndex > 0 && (
          <button onClick={handlePrev} className="nav-btn left">
            <ChevronLeft size={32} />
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center p-4">
          {isVideo ? (
            <video src={getImageUrl(currentMedia.url, 'videos')} controls autoPlay className="media-content-full" />
          ) : (
            <img src={getImageUrl(currentMedia.url, 'posts')} alt="Media" className="media-content-full" />
          )}
        </div>

        {currentIndex < medias.length - 1 && (
          <button onClick={handleNext} className="nav-btn right">
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      <div className="media-viewer-right" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b text-center font-semibold text-gray-500">
          Khu vực hiển thị Bình luận (Sắp ra mắt)
        </div>
      </div>
    </div>,
    document.body // 👈 Gắn thẳng vào Body, đè lên mọi thứ!
  );
};

export default MediaViewerModal;