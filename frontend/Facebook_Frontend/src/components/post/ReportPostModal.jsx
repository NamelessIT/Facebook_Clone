import { useState } from 'react';
import toast from '../../shared/appToast';
import reportService from '../../services/reportService';
import { ModerationTargetType } from '../../shared/generated/enums';
import './ReportPostModal.css';
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
      await reportService.create(ModerationTargetType.Post, postId, reason);
      toast.success(translateCatalogKey('ui.components.post.reportpostmodal.cam-on-chung-toi-se-xem-xet-bao-cao-.df52d773'));
      onClose();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.post.reportpostmodal.gui-bao-cao-that-bai-vui-long-thu-la.33cadb46'), { context: "posts.report" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rpm-modal sm:max-w-md">
        <DialogHeader className="rpm-header">
          <DialogTitle>{t('post.reportPost')}</DialogTitle>
          <DialogDescription>{t('post.reportReason')}</DialogDescription>
        </DialogHeader>

        <div className="rpm-body">
          <p className="rpm-label">{t('post.reportReason')}</p>
          <RadioGroup className="rpm-options" value={reason} onValueChange={setReason}>
            {REASONS.map((item) => (
              <Label key={item.value} htmlFor={`report-${item.value}`} className={`rpm-option ${reason === item.value ? 'rpm-option--selected' : ''}`}>
                <RadioGroupItem id={`report-${item.value}`} value={item.value} />
                <span>{t(item.key)}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="rpm-footer">
          <Button variant="outline" className="rpm-btn rpm-btn--cancel" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button className="rpm-btn rpm-btn--submit" onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? t('common.sending') : t('post.sendReport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPostModal;
