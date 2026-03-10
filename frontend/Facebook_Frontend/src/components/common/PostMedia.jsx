import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { getImageUrl } from "../../utils/formatUrl";
import "./PostMedia.css"; // Gọi CSS

const PostMedia = ({ url, isVideo }) => {
  const [hasError, setHasError] = useState(false);
  
  // Nếu là video thì type='videos', ảnh thì type='images' (hoặc posts)
  const mediaSrc = getImageUrl(url, isVideo ? 'videos' : 'posts');

  if (hasError) {
    return (
      <div className="post-media-container post-media-error">
        <button className="btn-refresh" onClick={() => setHasError(false)} title="Thử tải lại">
          <RefreshCw className="text-white w-6 h-6" />
        </button>
        <span className="error-text">Không tải được nội dung. Vui lòng thử lại.</span>
      </div>
    );
  }

  return (
    <div className="post-media-container">
      {isVideo ? (
        <video
          src={mediaSrc}
          controls
          className="post-media-content"
          onError={() => setHasError(true)}
        />
      ) : (
        <img
          src={mediaSrc}
          alt="Post content"
          className="post-media-content"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};

export default PostMedia;