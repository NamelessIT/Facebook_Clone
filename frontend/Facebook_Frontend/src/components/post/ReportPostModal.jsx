import { useState } from 'react';
import { X } from 'lucide-react';
import toast from '../../shared/appToast';
import postInteractionService from '../../services/postInteractionService';
import './ReportPostModal.css';
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const REASONS = [
  { value: 'Spam', key: 'post.report.spam' },
  { value: 'Bạo lực', key: 'post.report.violence' },
  { value: 'Nội dung khiêu dâm', key: 'post.report.sexual' },
  { value: 'Thông tin sai lệch', key: 'post.report.falseInfo' },
  { value: 'Quấy rối hoặc bắt nạt', key: 'post.report.harassment' },
  { value: 'Khác', key: 'post.report.other' },
];

const ReportPostModal = ({ postId, onClose }) => {
  const { t } = useLocalization();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(translateCatalogKey('ui.components.post.reportpostmodal.vui-long-chon-ly-do-bao-cao.3d8c38fc'));
      return;
    }
    setLoading(true);
    try {
      await postInteractionService.reportPost(postId, reason);
      toast.success(translateCatalogKey('ui.components.post.reportpostmodal.cam-on-chung-toi-se-xem-xet-bao-cao-.df52d773'));
      onClose();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.post.reportpostmodal.gui-bao-cao-that-bai-vui-long-thu-la.33cadb46'), { context: 'posts.report' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rpm-overlay" onMouseDown={onClose}>
      <div className="rpm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rpm-header">
          <h3>{t('post.reportPost')}</h3>
          <button className="rpm-close" onClick={onClose} aria-label={translateCatalogKey('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="rpm-body">
          <p className="rpm-label">{t('post.reportReason')}</p>
          <div className="rpm-options">
            {REASONS.map((item) => (
              <label key={item.value} className={`rpm-option ${reason === item.value ? 'rpm-option--selected' : ''}`}>
                <input
                  type="radio"
                  name="reportReason"
                  value={item.value}
                  checked={reason === item.value}
                  onChange={() => setReason(item.value)}
                />
                <span>{t(item.key)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rpm-footer">
          <button className="rpm-btn rpm-btn--cancel" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button className="rpm-btn rpm-btn--submit" onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? t('common.sending') : t('post.sendReport')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPostModal;
