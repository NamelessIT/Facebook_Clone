import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Flag, Loader2, Paperclip, RefreshCw, RotateCcw, Search, ShieldAlert } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from '../../shared/appToast';
import { ModerationAction, ModerationReportStatus, ModerationTargetType } from '../../shared/generated/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const TYPES = {
  [ModerationTargetType.Post]: 'Bài viết',
  [ModerationTargetType.Reel]: 'Reel',
  [ModerationTargetType.Live]: 'Live',
  [ModerationTargetType.MarketplaceListing]: 'Mặt hàng',
  [ModerationTargetType.User]: 'Người dùng',
  [ModerationTargetType.PostComment]: 'Bình luận bài viết',
  [ModerationTargetType.LiveComment]: 'Bình luận live',
  [ModerationTargetType.ReelComment]: 'Bình luận reel',
};
const STATUSES = { 1: 'Chờ xử lý', 2: 'Đang xem xét', 3: 'Đã xử lý', 4: 'Đã bác bỏ' };
const ACTIONS = [
  [ModerationAction.ContentRemoved, 'Gỡ nội dung bị báo cáo'], [ModerationAction.PostSuspended, 'Khóa quyền đăng Post'],
  [ModerationAction.ReelSuspended, 'Khóa quyền đăng Reel'], [ModerationAction.LiveSuspended, 'Khóa quyền Live'],
  [ModerationAction.MarketplaceSuspended, 'Khóa quyền bán hàng'], [ModerationAction.AccountBanned, 'Khóa toàn bộ tài khoản'],
];
const ACTIONS_BY_TARGET = {
  [ModerationTargetType.Post]: [ModerationAction.ContentRemoved, ModerationAction.PostSuspended, ModerationAction.AccountBanned],
  [ModerationTargetType.Reel]: [ModerationAction.ContentRemoved, ModerationAction.ReelSuspended, ModerationAction.AccountBanned],
  [ModerationTargetType.Live]: [ModerationAction.ContentRemoved, ModerationAction.LiveSuspended, ModerationAction.AccountBanned],
  [ModerationTargetType.MarketplaceListing]: [ModerationAction.ContentRemoved, ModerationAction.MarketplaceSuspended, ModerationAction.AccountBanned],
  [ModerationTargetType.User]: [ModerationAction.PostSuspended, ModerationAction.ReelSuspended, ModerationAction.LiveSuspended, ModerationAction.MarketplaceSuspended, ModerationAction.AccountBanned],
  [ModerationTargetType.PostComment]: [ModerationAction.ContentRemoved, ModerationAction.PostSuspended, ModerationAction.AccountBanned],
  [ModerationTargetType.LiveComment]: [ModerationAction.ContentRemoved, ModerationAction.LiveSuspended, ModerationAction.AccountBanned],
  [ModerationTargetType.ReelComment]: [ModerationAction.ContentRemoved, ModerationAction.ReelSuspended, ModerationAction.AccountBanned],
};
const TIMED_ACTIONS = [ModerationAction.PostSuspended, ModerationAction.ReelSuspended, ModerationAction.LiveSuspended, ModerationAction.MarketplaceSuspended, ModerationAction.AccountBanned];
const RESTORABLE_ACTIONS = new Set(TIMED_ACTIONS);
const DURATIONS = [[24, '24 giờ'], [72, '3 ngày'], [168, '7 ngày'], [720, '30 ngày'], ['permanent', 'Vĩnh viễn']];

const AdminReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [durationHours, setDurationHours] = useState('72');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReports((await adminService.getReports()).data.data || []); }
    catch (error) { toast.apiError(error, 'Không thể tải báo cáo.', { context: 'admin.reports.list' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => reports.filter((report) => {
    const open = report.status === ModerationReportStatus.Pending || report.status === ModerationReportStatus.Reviewing;
    return (status === 'all' || (status === 'open' ? open : String(report.status) === status)) &&
      (type === 'all' || String(report.targetType) === type) &&
      (!search.trim() || `${report.title} ${report.ownerName} ${report.reporter.fullName} ${report.reason}`.toLowerCase().includes(search.trim().toLowerCase()));
  }), [reports, search, status, type]);

  const startReview = async (report) => {
    try {
      if (report.status === ModerationReportStatus.Pending) await adminService.reviewReport(report.id);
      setSelected({ ...report, status: ModerationReportStatus.Reviewing });
    } catch (error) { toast.apiError(error, 'Không thể nhận báo cáo.', { context: 'admin.reports.review' }); }
  };

  const resolve = async (dismiss = false) => {
    if (!dismiss && !action) return;
    setBusy(true);
    try {
      await adminService.resolveReport(selected.id, Number(action || 0), note, dismiss,
        TIMED_ACTIONS.includes(Number(action)) && durationHours !== 'permanent' ? Number(durationHours) : null,
        TIMED_ACTIONS.includes(Number(action)) && durationHours === 'permanent');
      toast.success(dismiss ? 'Đã bác bỏ báo cáo.' : 'Đã áp dụng hình thức xử lý.');
      setSelected(null); setAction(''); setNote(''); setDurationHours('72'); await load();
    } catch (error) { toast.apiError(error, 'Không thể xử lý báo cáo.', { context: 'admin.reports.resolve' }); }
    finally { setBusy(false); }
  };

  const restore = async (report) => {
    setBusy(true);
    try { await adminService.restoreReportPenalty(report.id); toast.success('Đã mở lại quyền chức năng.'); await load(); }
    catch (error) { toast.apiError(error, 'Không thể mở lại quyền.', { context: 'admin.reports.restore' }); }
    finally { setBusy(false); }
  };

  const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';

  return <section className="admin-feature-page admin-reports-page">
    <header className="admin-feature-header"><div><span className="admin-feature-icon admin-feature-icon--danger"><Flag /></span><div><h1>{translateCatalogKey('ui.pages.admin.adminreports.trung-tam-bao-cao.6bdb50fc')}</h1><p>Báo cáo có SLA tiếp nhận 24 giờ; hình phạt theo chức năng tự hết hạn và vẫn có thể được mở sớm.</p></div></div><Button variant="outline" onClick={load}><RefreshCw /> {translateCatalogKey('common.refresh')}</Button></header>
    <div className="admin-report-summary"><div><Flag /><span>Báo cáo đang mở</span><strong>{reports.filter((x) => x.status < 3).length}</strong></div><div><AlertTriangle /><span>Đã quá SLA 24 giờ</span><strong>{reports.filter((x) => x.status < 3 && new Date(x.reviewDueAt) < new Date()).length}</strong></div><div><CheckCircle2 /><span>Đã xử lý</span><strong>{reports.filter((x) => x.status >= 3).length}</strong></div></div>
    <div className="admin-feature-toolbar"><label><Search /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm đối tượng, chủ sở hữu hoặc người báo cáo" /></label><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Đang mở</SelectItem><SelectItem value="all">Mọi trạng thái</SelectItem>{Object.entries(STATUSES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={type} onValueChange={setType}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Mọi nội dung</SelectItem>{Object.entries(TYPES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    {loading ? <div className="admin-empty-state"><Loader2 className="animate-spin" /> Đang tải…</div> : <div className="admin-report-list">{filtered.map((report) => <article key={report.id}>
      <div className="admin-report-type"><Badge variant="outline">{TYPES[report.targetType]}</Badge><Badge variant={report.status < 3 ? 'destructive' : 'secondary'}>{STATUSES[report.status]}</Badge></div>
      <div className="admin-report-main"><h2>{report.title}</h2><p>{report.reason}{report.details ? ` · ${report.details}` : ''}</p><dl><div><dt>Chủ sở hữu</dt><dd>{report.ownerName}</dd></div><div><dt>Người báo cáo</dt><dd>{report.reporter.fullName} · {report.reporter.email}</dd></div><div><dt>Gửi lúc / hạn xem</dt><dd>{formatDate(report.createdAt)} / {formatDate(report.reviewDueAt)}</dd></div>{RESTORABLE_ACTIONS.has(report.resolutionAction) && <div><dt>Hình phạt</dt><dd>{report.restoredAt ? `Đã mở sớm ${formatDate(report.restoredAt)}` : report.punishmentEndsAt ? `Đến ${formatDate(report.punishmentEndsAt)}` : 'Vĩnh viễn · chỉ mở thủ công'}</dd></div>}</dl>{report.evidence?.length > 0 && <div className="admin-report-evidence"><strong><Paperclip /> Tệp bằng chứng ({report.evidence.length})</strong><div>{report.evidence.map((item) => <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer">{item.originalFileName}</a>)}</div></div>}</div>
      <div className="admin-report-actions"><Button variant="outline" disabled={!report.exists || !report.adminPath} onClick={() => navigate(report.adminPath)}><ArrowUpRight /> Xem bằng chứng</Button>{report.status < 3 && <Button onClick={() => startReview(report)}><ShieldAlert /> Xử lý</Button>}{report.status === ModerationReportStatus.Resolved && RESTORABLE_ACTIONS.has(report.resolutionAction) && !report.restoredAt && <Button variant="outline" disabled={busy} onClick={() => restore(report)}><RotateCcw /> Mở quyền sớm</Button>}</div>
    </article>)}</div>}

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !busy && !open && setSelected(null)}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Xử lý báo cáo {TYPES[selected?.targetType]}</DialogTitle><DialogDescription>{selected?.title} · Chủ sở hữu {selected?.ownerName}</DialogDescription></DialogHeader>
      <div className="admin-report-detail"><strong>Lý do báo cáo</strong><p>{selected?.reason}</p>{selected?.details && <p>{selected.details}</p>}<Button variant="outline" disabled={!selected?.adminPath} onClick={() => navigate(selected.adminPath)}><ArrowUpRight /> Mở nội dung cần kiểm tra</Button></div>
      <div className="grid gap-2"><Label>Hình thức xử lý</Label><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue placeholder="Chọn mức xử lý" /></SelectTrigger><SelectContent>{ACTIONS.filter(([value]) => (ACTIONS_BY_TARGET[selected?.targetType] || []).includes(value)).map(([value, label]) => <SelectItem key={value} value={String(value)}>{label}</SelectItem>)}</SelectContent></Select></div>
      {TIMED_ACTIONS.includes(Number(action)) && <div className="grid gap-2"><Label><Clock3 /> Thời gian phạt</Label><Select value={durationHours} onValueChange={setDurationHours}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DURATIONS.map(([value, label]) => <SelectItem key={value} value={String(value)}>{label}</SelectItem>)}</SelectContent></Select><small>Hình phạt có hạn được tự động mở; quản trị viên có thể mở sớm. Hình phạt vĩnh viễn chỉ được mở thủ công sau khi xem xét khiếu nại.</small></div>}
      <div className="grid gap-2"><Label htmlFor="report-resolution-note">Căn cứ và ghi chú</Label><Textarea id="report-resolution-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi rõ bằng chứng và lý do đưa ra quyết định" /></div>
      <div className="admin-report-warning"><AlertTriangle /> Gỡ nội dung không tự khôi phục. Mọi án khóa chức năng hoặc tài khoản có thể đặt thời hạn tự mở hoặc vĩnh viễn; quản trị viên luôn có thể mở sớm sau khi xem xét.</div>
      <DialogFooter><Button variant="outline" onClick={() => resolve(true)} disabled={busy}>Không vi phạm</Button><Button variant="destructive" onClick={() => resolve(false)} disabled={busy || !action}>{busy && <Loader2 className="animate-spin" />} Áp dụng xử lý</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>;
};

export default AdminReports;
