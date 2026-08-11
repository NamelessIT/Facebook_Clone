import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Flag, Loader2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
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

const TYPES = { 1: 'Bài viết', 2: 'Reel', 3: 'Live', 4: 'Mặt hàng', 5: 'Người dùng' };
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
};

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
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setReports((await adminService.getReports()).data.data || []); } catch (error) { toast.apiError(error, "Không thể tải báo cáo.", { context: "admin.reports.list" }); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => reports.filter((report) => {
    const open = report.status === ModerationReportStatus.Pending || report.status === ModerationReportStatus.Reviewing;
    return (status === 'all' || (status === 'open' ? open : String(report.status) === status)) && (type === 'all' || String(report.targetType) === type) &&
      (!search.trim() || `${report.title} ${report.ownerName} ${report.reporter.fullName} ${report.reason}`.toLowerCase().includes(search.trim().toLowerCase()));
  }), [reports, search, status, type]);
  const startReview = async (report) => { try { if (report.status === 1) await adminService.reviewReport(report.id); setSelected({ ...report, status: 2 }); } catch (error) { toast.apiError(error, "Không thể nhận báo cáo.", { context: "admin.reports.review" }); } };
  const resolve = async (dismiss = false) => { if (!dismiss && !action) return; setBusy(true); try { await adminService.resolveReport(selected.id, Number(action || 0), note, dismiss); toast.success(dismiss ? "Đã bác bỏ báo cáo." : "Đã áp dụng hình thức xử lý."); setSelected(null); setAction(''); setNote(''); await load(); } catch (error) { toast.apiError(error, "Không thể xử lý báo cáo.", { context: "admin.reports.resolve" }); } finally { setBusy(false); } };

  return <section className="admin-feature-page admin-reports-page"><header className="admin-feature-header"><div><span className="admin-feature-icon admin-feature-icon--danger"><Flag /></span><div><h1>{translateCatalogKey('ui.pages.admin.adminreports.trung-tam-bao-cao.6bdb50fc')}</h1><p>{translateCatalogKey('ui.pages.admin.adminreports.tap-trung-bao-cao-post-reel-live-mar.cb96e863')}</p></div></div><Button variant="outline" onClick={load}><RefreshCw /> {translateCatalogKey('common.refresh')}</Button></header>
    <div className="admin-report-summary"><div><Flag /><span>{translateCatalogKey('ui.pages.admin.adminreports.bao-cao-ang-mo.48a220de')}</span><strong>{reports.filter((x) => x.status < 3).length}</strong></div><div><AlertTriangle /><span>{translateCatalogKey('ui.pages.admin.adminreports.live-can-giu-bang-chung.651c1210')}</span><strong>{reports.filter((x) => x.targetType === 3 && x.status < 3).length}</strong></div><div><CheckCircle2 /><span>{translateCatalogKey('ui.pages.admin.adminreports.a-xu-ly.dbbff0bf')}</span><strong>{reports.filter((x) => x.status >= 3).length}</strong></div></div>
    <div className="admin-feature-toolbar"><label><Search /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={translateCatalogKey('ui.pages.admin.adminreports.tim-oi-tuong-chu-so-huu-nguoi-bao-ca.a396de2a')} /></label><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">{translateCatalogKey('ui.pages.admin.adminreports.ang-mo.c923e127')}</SelectItem><SelectItem value="all">{translateCatalogKey('ui.pages.admin.adminreports.moi-trang-thai.6193c7a2')}</SelectItem>{Object.entries(STATUSES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select><Select value={type} onValueChange={setType}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{translateCatalogKey('ui.pages.admin.adminreports.moi-noi-dung.ae293757')}</SelectItem>{Object.entries(TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
    {loading ? <div className="admin-empty-state"><Loader2 className="animate-spin" /> {translateCatalogKey('ui.pages.admin.adminlives.ang-tai.1bff877b')}</div> : <div className="admin-report-list">{filtered.map((report) => <article key={report.id}><div className="admin-report-type"><Badge variant="outline">{TYPES[report.targetType]}</Badge><Badge variant={report.status < 3 ? 'destructive' : 'secondary'}>{STATUSES[report.status]}</Badge></div><div className="admin-report-main"><h2>{report.title}</h2><p>{report.reason}{report.details ? translateCatalogKey('ui.pages.admin.adminreports.value0.29e6e12d', { value0: report.details }) : ''}</p><dl><div><dt>{translateCatalogKey('ui.pages.admin.adminreports.chu-so-huu.fba345c9')}</dt><dd>{report.ownerName}</dd></div><div><dt>{translateCatalogKey('ui.pages.admin.adminreports.nguoi-bao-cao.182f7777')}</dt><dd>{report.reporter.fullName} · {report.reporter.email}</dd></div><div><dt>{translateCatalogKey('ui.pages.admin.adminsecurity.thoi-gian.a042613f')}</dt><dd>{new Date(report.createdAt).toLocaleString('vi-VN')}</dd></div></dl></div><div className="admin-report-actions"><Button variant="outline" disabled={!report.exists || !report.adminPath} onClick={() => navigate(report.adminPath)}><ArrowUpRight /> {translateCatalogKey('ui.pages.admin.adminreports.xem-oi-tuong.0f4bc379')}</Button>{report.status < 3 && <Button onClick={() => startReview(report)}><ShieldAlert /> {translateCatalogKey('ui.pages.admin.adminreports.xu-ly.3b24d1d9')}</Button>}</div></article>)}</div>}
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !busy && !open && setSelected(null)}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{translateCatalogKey('ui.pages.admin.adminreports.xu-ly-bao-cao.24cdb85e')} {TYPES[selected?.targetType]}</DialogTitle><DialogDescription>{selected?.title} {translateCatalogKey('ui.pages.admin.adminreports.chu-so-huu.2136a594')} {selected?.ownerName}</DialogDescription></DialogHeader><div className="admin-report-detail"><strong>{translateCatalogKey('post.reportReason')}</strong><p>{selected?.reason}</p>{selected?.details && <p>{selected.details}</p>}</div><div className="grid gap-2"><Label>{translateCatalogKey('ui.pages.admin.adminreports.hinh-thuc-xu-ly.ae65e04f')}</Label><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue placeholder={translateCatalogKey('ui.pages.admin.adminreports.chon-muc-xu-ly.f9f9a4a3')} /></SelectTrigger><SelectContent>{ACTIONS.filter(([value]) => (ACTIONS_BY_TARGET[selected?.targetType] || []).includes(value)).map(([value, label]) => <SelectItem key={value} value={String(value)}>{label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="report-resolution-note">{translateCatalogKey('ui.pages.admin.adminreports.can-cu-va-ghi-chu.e4c166b1')}</Label><Textarea id="report-resolution-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={translateCatalogKey('ui.pages.admin.adminreports.ghi-ro-bang-chung-va-ly-do-ua-ra-quy.65dcd09f')} /></div><div className="admin-report-warning"><AlertTriangle /> {translateCatalogKey('ui.pages.admin.adminreports.khoa-theo-module-chi-vo-hieu-hoa-tin.efd52b34')}</div><DialogFooter><Button variant="outline" onClick={() => resolve(true)} disabled={busy}>{translateCatalogKey('ui.pages.admin.adminreports.khong-vi-pham.d8d633eb')}</Button><Button variant="destructive" onClick={() => resolve(false)} disabled={busy || !action}>{busy && <Loader2 className="animate-spin" />} {translateCatalogKey('ui.pages.admin.adminreports.ap-dung-xu-ly.fc487f68')}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
};

export default AdminReports;
