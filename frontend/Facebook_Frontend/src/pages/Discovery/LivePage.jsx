import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { LIVE } from '../../shared/generated/constants';
import { useSearchParams } from 'react-router-dom';
import './DiscoveryPages.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import useNonOverlappingPolling from '../../hooks/useNonOverlappingPolling';

const categories = ['Tất cả', 'Đang live', 'Bán hàng', 'Bản phát lại'];
const privacyOptions = [
  { value: '1', labelKey: 'privacy.public' },
  { value: '2', labelKey: 'privacy.friends' },
  { value: '3', labelKey: 'privacy.onlyMe' },
];

const LivePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [selected, setSelected] = useState(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', privacy: '1', isShopping: false });
  const closingSessionRef = useRef(null);

  const load = useCallback(async () => {
    try { setSessions((await liveService.list(true)).data.data || []); }
    catch (error) { toast.apiError(error, "Không thể tải danh sách live.", { context: "live.list" }); }
    finally { setLoading(false); }
  }, []);

  useNonOverlappingPolling(load, 15000);

  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (!sessionId) {
      closingSessionRef.current = null;
      return;
    }
    if (closingSessionRef.current === sessionId) return;
    if (!sessionId || selected?.id === sessionId) return;
    liveService.get(sessionId)
      .then((response) => setSelected(response.data.data))
      .catch((error) => toast.apiError(error, "Phiên live không còn khả dụng hoặc bạn không có quyền xem.", { context: "live.deep-link", dedupe: true }));
  }, [searchParams, selected?.id]);

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
      toast.apiError(error, "Không thể tạo phiên live. Quyền live của bạn có thể đang bị tạm khóa.", { context: "live.start" });
    } finally { setCreating(false); }
  };

  const updateSession = (updated) => {
    setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  };

  const deleteSession = (id) => {
    setSessions((current) => current.filter((item) => item.id !== id));
    setSelected(null);
    setSearchParams({}, { replace: true });
  };

  const closeSelectedSession = () => {
    closingSessionRef.current = selected?.id || searchParams.get('session');
    setSearchParams({}, { replace: true });
    setSelected(null);
  };

  return (
    <section className="discovery-page discovery-page--wide live-page">
      <div className="discovery-hero live-hero">
        <div><Badge variant="destructive"><Radio /> {translateCatalogKey('ui.pages.discovery.livepage.truc-tiep.4394cf43')}</Badge><h1>{translateCatalogKey('post.liveVideo')}</h1><p>{translateCatalogKey('ui.pages.discovery.livepage.phat-live-cong-ong-ban-hang-hoac-xem.32e2f95e')} {LIVE.replayLifetimeMinutes} {translateCatalogKey('ui.pages.discovery.livepage.phut.dd2b6cfc')}</p></div>
        <Button onClick={() => setCreatorOpen(true)}><Video /> {translateCatalogKey('permissions.modules.lives')}</Button>
      </div>

      <label className="discovery-search"><Search size={17} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateCatalogKey('ui.pages.discovery.livepage.tim-live-hoac-nguoi-phat.09d85a1e')} /></label>
      <div className="discovery-categories">{categories.map((item) => <Button key={item} size="sm" variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>)}</div>
      <div className="live-results-heading"><div><Radio size={18} /><strong>{translateCatalogKey('ui.pages.discovery.livepage.phien-live.d44855e3')}</strong></div><span>{loading ? "Đang tải…" : translateCatalogKey('ui.pages.discovery.livepage.value0-phien.0234bb95', { value0: filtered.length })}</span></div>

      <div className="live-grid">
        {filtered.map((stream) => (
          <Card className="live-card" key={stream.id} onClick={() => { setSelected(stream); setSearchParams({ session: stream.id }); }}>
            <div className="live-thumbnail">
              {stream.recordingUrl ? <video src={getImageUrl(stream.recordingUrl)} muted preload="metadata" /> : <div className="live-thumbnail-placeholder"><Radio /></div>}
              <Badge variant={stream.status === 1 ? 'destructive' : 'secondary'} className="live-badge">{stream.status === 1 ? "LIVE" : "XEM LẠI"}</Badge>
              <span className="live-viewers">{stream.status === 1 ? <><Eye size={14} /> {stream.viewerCount || 0}</> : stream.convertedPostId ? <><Clock3 size={14} /> {translateCatalogKey('ui.pages.discovery.livepage.a-ang.838b811c')}</> : <><Clock3 size={14} /> {LIVE.replayLifetimeMinutes} {translateCatalogKey('ui.pages.discovery.livepage.phut.20b6328e')}</>}</span>
              <span className="live-play"><Play fill="currentColor" /></span>
            </div>
            <CardContent className="live-card-content"><div className="live-host-avatar">{stream.ownerName?.charAt(0) || '?'}</div><div><h2>{stream.title}</h2><p>{stream.ownerName}</p><span>{stream.isShopping ? <ShoppingBag size={13} /> : <Users size={13} />} {stream.isShopping ? "Bán hàng" : "Cộng đồng"}</span></div></CardContent>
          </Card>
        ))}
      </div>
      {!loading && filtered.length === 0 && <Card className="discovery-empty-card"><CardContent><p>{translateCatalogKey('ui.pages.discovery.livepage.chua-co-phien-live-phu-hop.6ae43c23')}</p></CardContent></Card>}

      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent className="sm:max-w-md"><form onSubmit={createLive} className="live-create-form">
          <DialogHeader><DialogTitle>{translateCatalogKey('ui.pages.discovery.livepage.tao-phien-livestream.1a10231a')}</DialogTitle><DialogDescription>{translateCatalogKey('ui.pages.discovery.livepage.ban-co-the-oi-quyen-rieng-tu-ngay-ca.d824b54a')}</DialogDescription></DialogHeader>
          <div className="live-mode-grid">
            <Button type="button" variant={!form.isShopping ? 'default' : 'outline'} onClick={() => setForm((current) => ({ ...current, isShopping: false }))}><Users /> {translateCatalogKey('ui.pages.discovery.livepage.cong-ong.549154d6')}</Button>
            <Button type="button" variant={form.isShopping ? 'default' : 'outline'} onClick={() => setForm((current) => ({ ...current, isShopping: true }))}><ShoppingBag /> {translateCatalogKey('ui.pages.discovery.livepage.ban-hang.7ffa61c5')}</Button>
          </div>
          <Input placeholder={translateCatalogKey('ui.pages.discovery.livepage.tieu-e-livestream.e2fab44d')} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required maxLength={180} />
          <Input placeholder={translateCatalogKey('ui.pages.discovery.livepage.mo-ta-khong-bat-buoc.f1a3c0b2')} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={2000} />
          <Select value={form.privacy} onValueChange={(privacy) => setForm((current) => ({ ...current, privacy }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder={translateCatalogKey('settings.privacy')} /></SelectTrigger>
            <SelectContent>{privacyOptions.map((option) => <SelectItem key={option.value} value={option.value}>{translateCatalogKey(option.labelKey)}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setCreatorOpen(false)}>{translateCatalogKey('common.cancel')}</Button><Button type="submit" disabled={creating}><Video /> {creating ? "Đang tạo…" : "Bắt đầu phát"}</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>

      {selected && <LiveRoom key={selected.id} initialSession={selected} open={Boolean(selected)} onOpenChange={(value) => { if (!value) closeSelectedSession(); }} onUpdated={updateSession} onDeleted={deleteSession} />}
    </section>
  );
};

export default LivePage;
