import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { getImageUrl } from "../../utils/formatUrl";
import "./PostMedia.css";
import { translateCatalogKey } from '../../shared/localizationRuntime'; // Gọi CSS

const PostMedia = ({ url, isVideo }) => {
  const [hasError, setHasError] = useState(false);
  
  // Nếu là video thì type='videos', ảnh thì type='images' (hoặc posts)
  const mediaSrc = getImageUrl(url, isVideo ? 'videos' : 'posts');

  if (hasError) {
    return (
      <div className="post-media-container post-media-error">
        <button className="btn-refresh" onClick={() => setHasError(false)} title={translateCatalogKey('ui.components.common.postmedia.thu-tai-lai.ed0a7f86')}>
          <RefreshCw className="text-white w-6 h-6" />
        </button>
        <span className="error-text">{translateCatalogKey('ui.components.common.postmedia.khong-tai-uoc-noi-dung-vui-long-thu-.b369ad62')}</span>
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
          alt={translateCatalogKey('ui.components.common.postmedia.post-content.95aeebef')}
          className="post-media-content"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};

export default PostMedia;