import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import postInteractionService from '../../services/postInteractionService';
import './ReportPostModal.css';

const REASONS = [
  'Spam',
  'Bạo lực',
  'Nội dung khiêu dâm',
  'Thông tin sai lệch',
  'Quấy rối hoặc bắt nạt',
  'Khác',
];

const ReportPostModal = ({ postId, onClose }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Vui lòng chọn lý do báo cáo');
      return;
    }
    setLoading(true);
    try {
      await postInteractionService.reportPost(postId, reason);
      toast.success('Cảm ơn! Chúng tôi sẽ xem xét báo cáo của bạn');
      onClose();
    } catch {
      toast.error('Gửi báo cáo thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rpm-overlay" onMouseDown={onClose}>
      <div className="rpm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rpm-header">
          <h3>Báo cáo bài viết</h3>
          <button className="rpm-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="rpm-body">
          <p className="rpm-label">Lý do báo cáo</p>
          <div className="rpm-options">
            {REASONS.map((r) => (
              <label key={r} className={`rpm-option ${reason === r ? 'rpm-option--selected' : ''}`}>
                <input
                  type="radio"
                  name="reportReason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rpm-footer">
          <button className="rpm-btn rpm-btn--cancel" onClick={onClose} disabled={loading}>
            Hủy
          </button>
          <button className="rpm-btn rpm-btn--submit" onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPostModal;
