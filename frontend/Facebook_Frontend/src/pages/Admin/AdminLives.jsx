import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Radio, RefreshCw, Search, ShieldAlert, Unlock } from 'lucide-react';
import adminService from '../../services/adminService';
import LiveRoom from '../../components/live/LiveRoom';
import toast from '../../shared/appToast';
import { usePrompt } from '../../contexts/useConfirm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const statusLabel = { 1: 'Đang live', 2: 'Đã kết thúc', 3: 'Bị kiểm duyệt' };
const privacyLabel = { 1: 'Công khai', 2: 'Bạn bè', 3: 'Riêng tư' };

const AdminLives = () => {
  const prompt = usePrompt();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [watching, setWatching] = useState(null);

  const load = useCallback(async () => {
    try { setSessions((await adminService.getLives()).data.data || []); }
    catch (error) { toast.apiError(error, 'Không thể tải danh sách live để kiểm duyệt.', { context: 'admin.lives.load' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(load, 10000); return () => window.clearInterval(timer); }, [load]);

  const filtered = useMemo(() => sessions.filter((item) => `${item.title} ${item.ownerName} ${item.email}`.toLowerCase().includes(search.toLowerCase())), [search, sessions]);
  const terminate = async (session) => {
    const reason = await prompt({
      title: 'Dừng live và tạm khóa quyền live',
      message: `Nhập lý do kiểm duyệt đối với ${session.ownerName}. Người phát và tất cả người xem sẽ bị kick realtime.`,
      defaultValue: 'Nội dung live không phù hợp tiêu chuẩn cộng đồng',
      confirmText: 'Dừng và khóa live',
    });
    if (reason === null) return;
    try {
      await adminService.terminateLive(session.id, reason);
      toast.success('Đã dừng phiên và tạm khóa quyền live của người dùng.');
      setWatching(null);
      load();
    } catch (error) { toast.apiError(error, 'Không thể dừng phiên live.', { context: 'admin.lives.terminate' }); }
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
      <div className="admin-search-wrap admin-live-search"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm người phát, email hoặc tiêu đề" /></div>
      {loading ? <div className="admin-loading">Đang tải…</div> : (
        <div className="admin-live-grid">
          {filtered.map((session) => (
            <Card key={session.id} className="admin-live-card">
              <CardHeader><div><Badge variant={session.status === 1 ? 'destructive' : 'secondary'}><Radio /> {statusLabel[session.status]}</Badge><CardTitle>{session.title}</CardTitle></div><Badge variant="outline">{privacyLabel[session.privacy]}</Badge></CardHeader>
              <CardContent>
                <div className="admin-live-owner"><strong>{session.ownerName}</strong><span>{session.email}</span></div>
                <div className="admin-live-meta"><span>{session.isShopping ? 'Live bán hàng' : 'Live cộng đồng'}</span><span>{new Date(session.startedAt).toLocaleString('vi-VN')}</span></div>
                {session.isLiveSuspended && <div className="admin-live-warning"><ShieldAlert /> Quyền live đang bị khóa: {session.liveSuspensionReason}</div>}
                <div className="admin-actions">
                  {session.status === 1 && <Button size="sm" variant="outline" onClick={() => setWatching({ ...session, viewerCount: 0, isOwner: false })}><Eye /> Vào xem</Button>}
                  {session.status === 1 && <Button size="sm" variant="destructive" onClick={() => terminate(session)}><ShieldAlert /> Dừng live</Button>}
                  {session.isLiveSuspended && <Button size="sm" onClick={() => restore(session)}><Unlock /> Mở lại quyền live</Button>}
                </div>
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
