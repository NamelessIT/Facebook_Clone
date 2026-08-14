import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getImageUrl } from "../../utils/formatUrl";
import CommentSection from "./CommentSection";
import VideoPlaybackControls from "../media/VideoPlaybackControls";
import "./MediaViewerModal.css";
import { translateCatalogKey } from '../../shared/localizationRuntime';

const MediaViewerModal = ({ isOpen, onClose, medias, initialIndex, postId, commentsCount = 0, onCommentAdded }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const videoRef = useRef(null);
  const videoFrameRef = useRef(null);

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

  return createPortal(
    <div className="media-viewer-overlay" onClick={onClose}>
      <button type="button" onClick={onClose} className="close-viewer-btn" aria-label={translateCatalogKey('common.close')}>
        <X size={24} />
      </button>

      <div className="media-viewer-left" onClick={(e) => e.stopPropagation()}>
        {currentIndex > 0 && (
          <button type="button" onClick={handlePrev} className="nav-btn left">
            <ChevronLeft size={32} />
          </button>
        )}

        <div className="media-viewer-stage">
          {isVideo ? (
            <div className="media-viewer-video-frame" ref={videoFrameRef}>
              <video ref={videoRef} src={getImageUrl(currentMedia.url, 'videos')} playsInline className="media-content-full" />
              <VideoPlaybackControls
                videoRef={videoRef}
                containerRef={videoFrameRef}
                sourceKey={currentMedia.url}
                label="video bài viết"
              />
            </div>
          ) : (
            <img src={getImageUrl(currentMedia.url, 'posts')} alt={translateCatalogKey('ui.components.post.editpostmodal.media.8b5254ae')} className="media-content-full" />
          )}
        </div>

        {currentIndex < medias.length - 1 && (
          <button type="button" onClick={handleNext} className="nav-btn right">
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      <div className="media-viewer-right" onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-comments-header">
          <div>
            <strong>{translateCatalogKey('post.comment')}</strong>
            <span>{commentsCount} {translateCatalogKey('post.comment').toLocaleLowerCase('vi-VN')}</span>
          </div>
        </div>
        <div className="media-viewer-comments-body">
          {postId && <CommentSection postId={postId} onCommentAdded={onCommentAdded} />}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MediaViewerModal;
