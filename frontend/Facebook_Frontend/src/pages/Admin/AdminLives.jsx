import { useCallback, useEffect, useMemo, useState } from 'react';
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

const statusLabel = { 1: 'Đang live', 2: 'Đã kết thúc', 3: 'Bị kiểm duyệt' };
const privacyLabel = { 1: 'Công khai', 2: 'Bạn bè', 3: 'Riêng tư' };

const AdminLives = () => {
  const prompt = usePrompt();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [watching, setWatching] = useState(null);

  const load = useCallback(async () => {
    try { setSessions((await adminService.getLives()).data.data || []); }
    catch (error) { toast.apiError(error, 'Không thể tải danh sách live để kiểm duyệt.', { context: 'admin.lives.load' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(load, 10000); return () => window.clearInterval(timer); }, [load]);

  const filtered = useMemo(() => sessions.filter((item) => {
    const matchesSearch = `${item.title} ${item.ownerName} ${item.email}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || item.status === Number(statusFilter));
  }), [search, sessions, statusFilter]);
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
      toast.success('Đã dừng phiên và tạm khóa quyền live của người dùng.');
      setWatching(null);
      load();
    } catch (error) { toast.apiError(error, 'Không thể dừng phiên live.', { context: 'admin.lives.terminate' }); }
  };
  const toggleEvidenceHold = async (session) => {
    try {
      await adminService.setLiveEvidenceHold(session.id, !session.isEvidenceOnHold);
      toast.success(session.isEvidenceOnHold ? 'Đã bỏ giữ bằng chứng; file sẽ theo lịch xóa hiện tại.' : 'Đã giữ bằng chứng cho tới khi có phán quyết.');
      load();
    } catch (error) { toast.apiError(error, 'Không thể cập nhật trạng thái giữ bằng chứng.', { context: 'admin.lives.evidence-hold' }); }
  };
  const restore = async (session) => {
    try {
      await adminService.restoreLiveAccess(session.ownerId);
      toast.success('Đã mở lại quyền live sau khi kiểm duyệt.');
      load();
    } catch (error) { toast.apiError(error, 'Không thể mở lại quyền live.', { context: 'admin.lives.restore' }); }
  };

  return (
    <div className="admin-lives-page">
      <div className="admin-page-heading"><div><h1 className="admin-page-title">Kiểm duyệt Live</h1><p>Xem mọi phiên, kể cả live riêng tư, và xử lý vi phạm theo thời gian thực.</p></div><Button variant="outline" onClick={load}><RefreshCw /> Làm mới</Button></div>
      <div className="admin-live-summary">
        <div><span>Tổng phiên</span><strong>{counts.all}</strong></div>
        <div><span>Đang phát</span><strong>{counts.live}</strong></div>
        <div><span>Đã kết thúc</span><strong>{counts.ended}</strong></div>
        <div><span>Đang khóa quyền live</span><strong>{counts.suspended}</strong></div>
      </div>
      <div className="admin-live-toolbar">
        <label className="admin-search-wrap admin-live-search"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm người phát, email hoặc tiêu đề" /></label>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="admin-live-filter"><SelectValue placeholder="Trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem><SelectItem value="1">Đang live</SelectItem><SelectItem value="2">Đã kết thúc</SelectItem><SelectItem value="3">Bị kiểm duyệt</SelectItem></SelectContent></Select>
      </div>
      {loading ? <div className="admin-loading">Đang tải…</div> : (
        <div className="admin-live-grid">
          {filtered.map((session) => (
            <Card key={session.id} className="admin-live-card">
              <CardHeader><div><Badge variant={session.status === 1 ? 'destructive' : 'secondary'}><Radio /> {statusLabel[session.status]}</Badge><CardTitle>{session.title}</CardTitle></div><Badge variant="outline">{privacyLabel[session.privacy]}</Badge></CardHeader>
              <CardContent>
                <div className="admin-live-info-grid">
                  <div className="admin-live-info"><UserRound /><span><small>Người phát</small><strong>{session.ownerName}</strong></span></div>
                  <div className="admin-live-info"><Mail /><span><small>Email tài khoản</small><strong>{session.email}</strong></span></div>
                  <div className="admin-live-info">{session.isShopping ? <ShoppingBag /> : <Users />}<span><small>Loại nội dung</small><strong>{session.isShopping ? 'Live bán hàng' : 'Live cộng đồng'}</strong></span></div>
                  <div className="admin-live-info"><CalendarClock /><span><small>Bắt đầu lúc</small><strong>{new Date(session.startedAt).toLocaleString('vi-VN')}</strong></span></div>
                  <div className="admin-live-info"><Archive /><span><small>Lưu bằng chứng đến</small><strong>{session.convertedPostId ? 'Đã thành bài viết' : session.isEvidenceOnHold ? 'Đang giữ chờ phán quyết' : session.evidenceExpiresAt ? new Date(session.evidenceExpiresAt).toLocaleString('vi-VN') : 'Không có bản ghi'}</strong></span></div>
                </div>
                {session.isLiveSuspended && <div className="admin-live-warning"><ShieldAlert /> Quyền live đang bị khóa: {session.liveSuspensionReason}</div>}
                {(session.status === 1 || session.status === 2 || session.status === 3 || session.isLiveSuspended) ? <>
                  <div className="admin-live-actions-label">Hành động kiểm duyệt</div>
                  <div className="admin-actions">
                    {(session.status === 1 || session.recordingUrl) && <Button size="sm" variant="outline" onClick={() => setWatching({ ...session, viewerCount: 0, isOwner: false })}><Eye /> {session.status === 1 ? 'Vào xem' : 'Xem bằng chứng'}</Button>}
                    {session.convertedPostId == null && session.status !== 1 && <Button size="sm" variant="outline" onClick={() => toggleEvidenceHold(session)}><Archive /> {session.isEvidenceOnHold ? 'Bỏ giữ' : 'Giữ bằng chứng'}</Button>}
                    {(session.status === 1 || (session.status === 2 && !session.isLiveSuspended)) && <Button size="sm" variant="destructive" onClick={() => terminate(session)}><ShieldAlert /> {session.status === 1 ? 'Dừng live' : 'Xác nhận vi phạm'}</Button>}
                    {session.isLiveSuspended && <Button size="sm" onClick={() => restore(session)}><Unlock /> Mở lại quyền live</Button>}
                  </div>
                </> : <div className="admin-live-no-actions">Phiên đã đóng · không còn hành động realtime</div>}
              </CardContent>
            </Card>
          ))}
          {!filtered.length && <div className="admin-empty">Không có phiên live phù hợp.</div>}
        </div>
      )}
      {watching && <LiveRoom key={watching.id} initialSession={watching} open={Boolean(watching)} onOpenChange={(value) => !value && setWatching(null)} moderationMode />}
    </div>
  );
};

export default AdminLives;
