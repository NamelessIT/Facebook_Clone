import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, CalendarClock, Eye, Mail, Radio, RefreshCw, Search, ShieldAlert, ShoppingBag, Unlock, UserRound, Users } from 'lucide-react';
import adminService from '../../services/adminService';
import LiveRoom from '../../components/live/LiveRoom';
import toast from '../../shared/appToast';
import { usePrompt } from '../../contexts/useConfirm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchParams } from 'react-router-dom';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const statusLabel = { 1: 'Đang live', 2: 'Đã kết thúc', 3: 'Bị kiểm duyệt' };
const privacyLabel = { 1: 'Công khai', 2: 'Bạn bè', 3: 'Riêng tư' };

const AdminLives = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledTargetIdRef = useRef(null);
  const prompt = usePrompt();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [watching, setWatching] = useState(null);

  const load = useCallback(async () => {
    try { setSessions((await adminService.getLives()).data.data || []); }
    catch (error) { toast.apiError(error, "Không thể tải danh sách live để kiểm duyệt.", { context: "admin.lives.load" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(load, 10000); return () => window.clearInterval(timer); }, [load]);

  const filtered = useMemo(() => sessions.filter((item) => {
    const targetId = searchParams.get('targetId');
    const matchesSearch = `${item.title} ${item.ownerName} ${item.email}`.toLowerCase().includes(search.toLowerCase());
    return (!targetId || item.id === targetId) && matchesSearch && (statusFilter === 'all' || item.status === Number(statusFilter));
  }), [search, searchParams, sessions, statusFilter]);
  useEffect(() => {
    const targetId = searchParams.get('targetId');
    if (!targetId || handledTargetIdRef.current === targetId) return;
    const target = sessions.find((item) => item.id === targetId);
    if (target && (target.status === 1 || target.recordingUrl)) {
      handledTargetIdRef.current = targetId;
      setWatching({ ...target, viewerCount: 0, isOwner: false });
    }
  }, [searchParams, sessions]);

  const closeWatching = useCallback(() => {
    setWatching(null);
    if (!searchParams.has('targetId')) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('targetId');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);
  const counts = useMemo(() => ({
    all: sessions.length,
    live: sessions.filter((item) => item.status === 1).length,
    ended: sessions.filter((item) => item.status === 2).length,
    suspended: sessions.filter((item) => item.isLiveSuspended).length,
  }), [sessions]);
  const terminate = async (session) => {
    const isActive = session.status === 1;
    const reason = await prompt({
      title: isActive ? 'Dừng live và tạm khóa quyền live' : 'Khóa quyền live sau khi xem bằng chứng',
      message: isActive
        ? `Nhập lý do kiểm duyệt đối với ${session.ownerName}. Người phát và tất cả người xem sẽ bị kick realtime.`
        : `Nhập kết luận kiểm duyệt đối với ${session.ownerName}. Bản ghi sẽ được giữ để đối soát và quyền live sẽ bị khóa.`,
      defaultValue: 'Nội dung live không phù hợp tiêu chuẩn cộng đồng',
      confirmText: isActive ? 'Dừng và khóa live' : 'Xác nhận vi phạm',
    });
    if (reason === null) return;
    try {
      await adminService.terminateLive(session.id, reason);
      toast.success(translateCatalogKey('ui.pages.admin.adminlives.a-dung-phien-va-tam-khoa-quyen-live-.888a1e1f'));
      setWatching(null);
      load();
    } catch (error) { toast.apiError(error, "Không thể dừng phiên live.", { context: "admin.lives.terminate" }); }
  };
  const toggleEvidenceHold = async (session) => {
    try {
      await adminService.setLiveEvidenceHold(session.id, !session.isEvidenceOnHold);
      toast.success(session.isEvidenceOnHold ? "Đã bỏ giữ bằng chứng; file sẽ theo lịch xóa hiện tại." : "Đã giữ bằng chứng cho tới khi có phán quyết.");
      load();
    } catch (error) { toast.apiError(error, "Không thể cập nhật trạng thái giữ bằng chứng.", { context: "admin.lives.evidence-hold" }); }
  };
  const restore = async (session) => {
    try {
      await adminService.restoreLiveAccess(session.ownerId);
      toast.success(translateCatalogKey('ui.pages.admin.adminlives.a-mo-lai-quyen-live-sau-khi-kiem-duy.b5dda96c'));
      load();
    } catch (error) { toast.apiError(error, "Không thể mở lại quyền live.", { context: "admin.lives.restore" }); }
  };

  return (
    <div className="admin-lives-page">
      <div className="admin-page-heading"><div><h1 className="admin-page-title">{translateCatalogKey('admin.lives.title')}</h1><p>{translateCatalogKey('ui.pages.admin.adminlives.xem-moi-phien-ke-ca-live-rieng-tu-va.093119ec')}</p></div><Button variant="outline" onClick={load}><RefreshCw /> {translateCatalogKey('common.refresh')}</Button></div>
      <div className="admin-live-summary">
        <div><span>{translateCatalogKey('ui.pages.admin.adminlives.tong-phien.d5a15139')}</span><strong>{counts.all}</strong></div>
        <div><span>{translateCatalogKey('ui.pages.admin.adminlives.ang-phat.cf413362')}</span><strong>{counts.live}</strong></div>
        <div><span>{translateCatalogKey('ui.pages.admin.adminlives.a-ket-thuc.991d8611')}</span><strong>{counts.ended}</strong></div>
        <div><span>{translateCatalogKey('ui.pages.admin.adminlives.ang-khoa-quyen-live.2a92d47a')}</span><strong>{counts.suspended}</strong></div>
      </div>
      <div className="admin-live-toolbar">
        <label className="admin-search-wrap admin-live-search"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateCatalogKey('ui.pages.admin.adminlives.tim-nguoi-phat-email-hoac-tieu-e.78aa4dd0')} /></label>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="admin-live-filter"><SelectValue placeholder={translateCatalogKey('ui.pages.admin.adminusers.trang-thai.50048e05')} /></SelectTrigger><SelectContent><SelectItem value="all">{translateCatalogKey('ui.pages.admin.adminlives.tat-ca-trang-thai.f6908bd5')}</SelectItem><SelectItem value="1">{translateCatalogKey('ui.pages.admin.adminlives.ang-live.04aa34ec')}</SelectItem><SelectItem value="2">{translateCatalogKey('ui.pages.admin.adminlives.a-ket-thuc.991d8611')}</SelectItem><SelectItem value="3">{translateCatalogKey('ui.pages.admin.adminlives.bi-kiem-duyet.45777665')}</SelectItem></SelectContent></Select>
      </div>
      {loading ? <div className="admin-loading">{translateCatalogKey('ui.pages.admin.adminlives.ang-tai.1bff877b')}</div> : (
        <div className="admin-live-grid">
          {filtered.map((session) => (
            <Card key={session.id} className={`admin-live-card${searchParams.get('targetId') === session.id ? ' admin-target-highlight' : ''}`}>
              <CardHeader><div><Badge variant={session.status === 1 ? 'destructive' : 'secondary'}><Radio /> {statusLabel[session.status]}</Badge><CardTitle>{session.title}</CardTitle></div><Badge variant="outline">{privacyLabel[session.privacy]}</Badge></CardHeader>
              <CardContent>
                <div className="admin-live-info-grid">
                  <div className="admin-live-info"><UserRound /><span><small>{translateCatalogKey('ui.pages.admin.adminlives.nguoi-phat.c8dd6504')}</small><strong>{session.ownerName}</strong></span></div>
                  <div className="admin-live-info"><Mail /><span><small>{translateCatalogKey('ui.pages.admin.adminlives.email-tai-khoan.62fc12e1')}</small><strong>{session.email}</strong></span></div>
                  <div className="admin-live-info">{session.isShopping ? <ShoppingBag /> : <Users />}<span><small>{translateCatalogKey('ui.pages.admin.adminlives.loai-noi-dung.c293c0ec')}</small><strong>{session.isShopping ? "Live bán hàng" : "Live cộng đồng"}</strong></span></div>
                  <div className="admin-live-info"><CalendarClock /><span><small>{translateCatalogKey('ui.pages.admin.adminlives.bat-au-luc.11b76241')}</small><strong>{new Date(session.startedAt).toLocaleString('vi-VN')}</strong></span></div>
                  <div className="admin-live-info"><Archive /><span><small>{translateCatalogKey('ui.pages.admin.adminlives.luu-bang-chung-en.286cea2d')}</small><strong>{session.convertedPostId ? "Đã thành bài viết" : session.isEvidenceOnHold ? "Đang giữ chờ phán quyết" : session.evidenceExpiresAt ? new Date(session.evidenceExpiresAt).toLocaleString('vi-VN') : "Không có bản ghi"}</strong></span></div>
                </div>
                {session.isLiveSuspended && <div className="admin-live-warning"><ShieldAlert /> {translateCatalogKey('ui.pages.admin.adminlives.quyen-live-ang-bi-khoa.bdba0153')} {session.liveSuspensionReason}</div>}
                {(session.status === 1 || session.status === 2 || session.status === 3 || session.isLiveSuspended) ? <>
                  <div className="admin-live-actions-label">{translateCatalogKey('ui.pages.admin.adminlives.hanh-ong-kiem-duyet.ea8de085')}</div>
                  <div className="admin-actions">
                    {(session.status === 1 || session.recordingUrl) && <Button size="sm" variant="outline" onClick={() => setWatching({ ...session, viewerCount: 0, isOwner: false })}><Eye /> {session.status === 1 ? "Vào xem" : "Xem bằng chứng"}</Button>}
                    {session.convertedPostId == null && session.status !== 1 && <Button size="sm" variant="outline" onClick={() => toggleEvidenceHold(session)}><Archive /> {session.isEvidenceOnHold ? "Bỏ giữ" : "Giữ bằng chứng"}</Button>}
                    {(session.status === 1 || (session.status === 2 && !session.isLiveSuspended)) && <Button size="sm" variant="destructive" onClick={() => terminate(session)}><ShieldAlert /> {session.status === 1 ? "Dừng live" : "Xác nhận vi phạm"}</Button>}
                    {session.isLiveSuspended && <Button size="sm" onClick={() => restore(session)}><Unlock /> {translateCatalogKey('ui.pages.admin.adminlives.mo-lai-quyen-live.607da45b')}</Button>}
                  </div>
                </> : <div className="admin-live-no-actions">{translateCatalogKey('ui.pages.admin.adminlives.phien-a-ong-khong-con-hanh-ong-realt.98ff99d9')}</div>}
              </CardContent>
            </Card>
          ))}
          {!filtered.length && <div className="admin-empty">{translateCatalogKey('ui.pages.admin.adminlives.khong-co-phien-live-phu-hop.084af130')}</div>}
        </div>
      )}
      {watching && <LiveRoom key={watching.id} initialSession={watching} open={Boolean(watching)} onOpenChange={(value) => !value && closeWatching()} moderationMode />}
    </div>
  );
};

export default AdminLives;
