import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Eye, Play, Radio, Search, ShoppingBag, Users, Video } from 'lucide-react';
import toast from '../../shared/appToast';
import liveService from '../../services/liveService';
import LiveRoom from '../../components/live/LiveRoom';
import { getImageUrl } from '../../utils/formatUrl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import './DiscoveryPages.css';

const categories = ['Tất cả', 'Đang live', 'Bán hàng', 'Bản phát lại'];
const privacyOptions = [
  { value: '1', label: 'Công khai' },
  { value: '2', label: 'Bạn bè' },
  { value: '3', label: 'Chỉ mình tôi' },
];

const LivePage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [selected, setSelected] = useState(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', privacy: '1', isShopping: false });

  const load = useCallback(async () => {
    try { setSessions((await liveService.list(true)).data.data || []); }
    catch (error) { toast.apiError(error, 'Không thể tải danh sách live.', { context: 'live.list' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(load, 15000); return () => window.clearInterval(timer); }, [load]);

  const filtered = useMemo(() => sessions.filter((item) => {
    const matchesText = `${item.title} ${item.ownerName}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = category === 'Tất cả' ||
      (category === 'Đang live' && item.status === 1) ||
      (category === 'Bán hàng' && item.isShopping) ||
      (category === 'Bản phát lại' && item.status === 2);
    return matchesText && matchesCategory;
  }), [category, search, sessions]);

  const createLive = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const session = (await liveService.start({ ...form, privacy: Number(form.privacy) })).data.data;
      setSessions((current) => [session, ...current]);
      setCreatorOpen(false);
      setSelected(session);
    } catch (error) {
      toast.apiError(error, 'Không thể tạo phiên live. Quyền live của bạn có thể đang bị tạm khóa.', { context: 'live.start' });
    } finally { setCreating(false); }
  };

  const updateSession = (updated) => {
    setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  };

  return (
    <section className="discovery-page discovery-page--wide live-page">
      <div className="discovery-hero live-hero">
        <div><Badge variant="destructive"><Radio /> Trực tiếp</Badge><h1>Video trực tiếp</h1><p>Phát live cộng đồng, bán hàng hoặc xem lại trong 30 phút.</p></div>
        <Button onClick={() => setCreatorOpen(true)}><Video /> Phát trực tiếp</Button>
      </div>

      <label className="discovery-search"><Search size={17} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm live hoặc người phát" /></label>
      <div className="discovery-categories">{categories.map((item) => <Button key={item} size="sm" variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>)}</div>
      <div className="live-results-heading"><div><Radio size={18} /><strong>Phiên live</strong></div><span>{loading ? 'Đang tải…' : `${filtered.length} phiên`}</span></div>

      <div className="live-grid">
        {filtered.map((stream) => (
          <Card className="live-card" key={stream.id} onClick={() => setSelected(stream)}>
            <div className="live-thumbnail">
              {stream.recordingUrl ? <video src={getImageUrl(stream.recordingUrl)} muted preload="metadata" /> : <div className="live-thumbnail-placeholder"><Radio /></div>}
              <Badge variant={stream.status === 1 ? 'destructive' : 'secondary'} className="live-badge">{stream.status === 1 ? 'LIVE' : 'XEM LẠI'}</Badge>
              <span className="live-viewers">{stream.status === 1 ? <><Eye size={14} /> {stream.viewerCount || 0}</> : <><Clock3 size={14} /> 30 phút</>}</span>
              <span className="live-play"><Play fill="currentColor" /></span>
            </div>
            <CardContent className="live-card-content"><div className="live-host-avatar">{stream.ownerName?.charAt(0) || '?'}</div><div><h2>{stream.title}</h2><p>{stream.ownerName}</p><span>{stream.isShopping ? <ShoppingBag size={13} /> : <Users size={13} />} {stream.isShopping ? 'Bán hàng' : 'Cộng đồng'}</span></div></CardContent>
          </Card>
        ))}
      </div>
      {!loading && filtered.length === 0 && <Card className="discovery-empty-card"><CardContent><p>Chưa có phiên live phù hợp.</p></CardContent></Card>}

      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent className="sm:max-w-md"><form onSubmit={createLive} className="live-create-form">
          <DialogHeader><DialogTitle>Tạo phiên livestream</DialogTitle><DialogDescription>Bạn có thể đổi quyền riêng tư ngay cả khi đang phát.</DialogDescription></DialogHeader>
          <div className="live-mode-grid">
            <Button type="button" variant={!form.isShopping ? 'default' : 'outline'} onClick={() => setForm((current) => ({ ...current, isShopping: false }))}><Users /> Cộng đồng</Button>
            <Button type="button" variant={form.isShopping ? 'default' : 'outline'} onClick={() => setForm((current) => ({ ...current, isShopping: true }))}><ShoppingBag /> Bán hàng</Button>
          </div>
          <Input placeholder="Tiêu đề livestream" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required maxLength={180} />
          <Input placeholder="Mô tả (không bắt buộc)" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={2000} />
          <Select value={form.privacy} onValueChange={(privacy) => setForm((current) => ({ ...current, privacy }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Quyền riêng tư" /></SelectTrigger>
            <SelectContent>{privacyOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setCreatorOpen(false)}>Hủy</Button><Button type="submit" disabled={creating}><Video /> {creating ? 'Đang tạo…' : 'Bắt đầu phát'}</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>

      {selected && <LiveRoom key={selected.id} initialSession={selected} open={Boolean(selected)} onOpenChange={(value) => !value && setSelected(null)} onUpdated={updateSession} />}
    </section>
  );
};

export default LivePage;
