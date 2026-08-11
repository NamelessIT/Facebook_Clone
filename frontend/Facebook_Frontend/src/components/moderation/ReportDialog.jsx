import { useState } from 'react';
import { AlertTriangle, Flag, Loader2 } from 'lucide-react';
import reportService from '../../services/reportService';
import toast from '../../shared/appToast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const REASONS = ['Lừa đảo hoặc spam', 'Hàng hóa/nội dung bị cấm', 'Bạo lực hoặc hành vi nguy hiểm', 'Quấy rối hoặc bắt nạt', 'Thông tin sai lệch', 'Khác'];

const ReportDialog = ({ open, onOpenChange, targetType, targetId, targetLabel = 'nội dung này' }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportService.create(targetType, targetId, reason, details);
      toast.success('Báo cáo đã được gửi tới đội ngũ kiểm duyệt.');
      setReason(''); setDetails(''); onOpenChange(false);
    } catch (error) { toast.apiError(error, 'Không thể gửi báo cáo.', { context: 'moderation.report' }); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !submitting && onOpenChange(value)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="moderation-dialog-icon"><Flag /></div>
          <DialogTitle>Báo cáo {targetLabel}</DialogTitle>
          <DialogDescription>Báo cáo không tự động kết luận vi phạm. Kiểm duyệt viên sẽ xem nội dung gốc và lịch sử liên quan.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="grid gap-2 py-2">
          {REASONS.map((item) => <Label key={item} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"><RadioGroupItem value={item} />{item}</Label>)}
        </RadioGroup>
        <div className="grid gap-2"><Label htmlFor="report-details">Thông tin bổ sung</Label><Textarea id="report-details" value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} placeholder="Mô tả thời điểm hoặc dấu hiệu vi phạm để kiểm duyệt viên kiểm tra nhanh hơn…" /></div>
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" /><span>Không gửi báo cáo sai sự thật hoặc lạm dụng hệ thống báo cáo.</span></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Hủy</Button><Button variant="destructive" onClick={submit} disabled={!reason || submitting}>{submitting ? <Loader2 className="animate-spin" /> : <Flag />} Gửi báo cáo</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
