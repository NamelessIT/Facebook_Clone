import { Flag, RotateCcw, X } from 'lucide-react';
import './DeleteUndoUI.css';

const DeleteUndoUI = ({ timeRemaining, onUndo, onReport, onDismiss }) => {
  return (
    <div className="duu-card">
      <div className="duu-content">
        <span className="duu-message">Bài viết đã được ẩn.</span>
        <span className="duu-timer">{timeRemaining}s</span>
      </div>

      <div className="duu-actions">
        <button className="duu-btn duu-btn--report" onClick={onReport}>
          <Flag size={15} />
          Báo cáo
        </button>
        <button className="duu-btn duu-btn--undo" onClick={onUndo}>
          <RotateCcw size={15} />
          Hoàn tác
        </button>
        <button className="duu-btn duu-btn--close" onClick={onDismiss} aria-label="Xóa ngay">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default DeleteUndoUI;
