import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './NotInterestedItem.css';

const AUTO_DISMISS_SECONDS = 60;

const NotInterestedItem = ({ onUndo, onDismiss }) => {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          onDismiss?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDismiss]);

  const handleUndo = () => {
    onUndo?.();
  };

  return (
    <div className="ni-card">
      <div className="ni-body">
        <div className="ni-icon-wrap">
          <X size={20} />
        </div>
        <div className="ni-text">
          <p className="ni-title">Đã ẩn bài viết</p>
          <p className="ni-desc">
            Việc ẩn bài viết giúp chúng tôi cá nhân hóa nội dung phù hợp hơn với bạn.
          </p>
        </div>
      </div>
      <div className="ni-actions">
        <button className="ni-undo-btn" onClick={handleUndo}>
          Hoàn tác
        </button>
        <span className="ni-timer">{secondsLeft}s</span>
      </div>
    </div>
  );
};

export default NotInterestedItem;
