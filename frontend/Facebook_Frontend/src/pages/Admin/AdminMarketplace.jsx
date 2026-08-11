import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, BarChart3, Check, Eye, Loader2, PackageSearch, RefreshCw, ShieldCheck, Store, X } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from '../../shared/appToast';
import { getImageUrl } from '../../utils/formatUrl';
import { MarketplaceListingStatus } from '../../shared/generated/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const STATUS = { 1: 'Chờ duyệt', 2: 'Đang hiển thị', 3: 'Từ chối', 4: 'Đã bán', 5: 'Đã gỡ' };
const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;

const AdminMarketplace = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [merchant, setMerchant] = useState(null);
  const [merchantStats, setMerchantStats] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await adminService.getMarketplaceListings()).data.data || []); }
    catch (error) { toast.apiError(error, 'Không thể tải danh sách mặt hàng.', { context: 'admin.marketplace.list' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const targetId = searchParams.get('targetId');
    const value = search.trim().toLowerCase();
    return items.filter((item) => (!targetId || item.id === targetId) && (status === 'all' || String(item.status) === status) &&
      (!value || `${item.title} ${item.email} ${item.sellerName}`.toLowerCase().includes(value)));
  }, [items, search, searchParams, status]);

  const submitReview = async () => {
    setBusy(true);
    try { await adminService.reviewMarketplaceListing(review.id, review.status, note); toast.success('Đã cập nhật kiểm duyệt mặt hàng.'); setReview(null); setNote(''); await load(); }
    catch (error) { toast.apiError(error, 'Không thể kiểm duyệt mặt hàng.', { context: 'admin.marketplace.review' }); }
    finally { setBusy(false); }
  };
  const openMerchant = async (item) => {
    setMerchant(item); setMerchantStats(null);
    try { setMerchantStats((await adminService.getMerchantStats(item.sellerId)).data.data); }
    catch (error) { toast.apiError(error, 'Không thể tải thống kê thương nhân.', { context: 'admin.marketplace.merchant' }); }
  };
  const toggleSeller = async () => {
    const suspended = !merchant.isMarketplaceSuspended;
    if (suspended && !note.trim()) { toast.error('Cần nhập lý do khóa quyền bán hàng.'); return; }
    setBusy(true);
    try { await adminService.setMarketplaceSellerSuspension(merchant.sellerId, suspended, note); toast.success(suspended ? 'Đã khóa quyền bán hàng.' : 'Đã mở lại quyền bán hàng.'); setMerchant(null); setNote(''); await load(); }
    catch (error) { toast.apiError(error, 'Không thể cập nhật quyền bán hàng.', { context: 'admin.marketplace.seller' }); }
    finally { setBusy(false); }
  };

  return <section className="admin-feature-page admin-marketplace-page">
    <header className="admin-feature-header"><div><span className="admin-feature-icon"><Store /></span><div><h1>Quản lý Marketplace</h1><p>Duyệt mặt hàng, xem hiệu quả trưng bày và quản lý quyền bán hàng.</p></div></div><Button variant="outline" onClick={load}><RefreshCw /> Làm mới</Button></header>
    <div className="admin-feature-toolbar"><label><PackageSearch /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mặt hàng, thương nhân hoặc email" /></label><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem>{Object.entries(STATUS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    {loading ? <div className="admin-empty-state"><Loader2 className="animate-spin" /> Đang tải…</div> : <div className="admin-market-grid">{filtered.map((item) => <article key={item.id} className={`admin-market-card${searchParams.get('targetId') === item.id ? ' admin-target-highlight' : ''}`}>
      <img src={getImageUrl(item.imageUrl)} alt={item.title} /><div className="admin-market-card-body"><div className="admin-market-card-top"><Badge variant={item.status === 2 ? 'default' : 'outline'}>{STATUS[item.status]}</Badge><span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span></div><h2>{item.title}</h2><strong>{formatMoney(item.price)}</strong><dl><div><dt>Thương nhân</dt><dd>{item.sellerName}</dd></div><div><dt>Email</dt><dd>{item.email}</dd></div><div><dt>Danh mục</dt><dd>{item.category}</dd></div><div><dt>Tương tác</dt><dd>{item.viewCount} xem · {item.favoriteCount} lưu · {item.reportCount} báo cáo</dd></div><div><dt>Phí trưng bày</dt><dd>{formatMoney(item.displayFee)} · Điều khoản {item.termsVersion}</dd></div></dl>{item.moderationNote && <p className="admin-market-note">{item.moderationNote}</p>}
        <div className="admin-market-actions"><Button size="sm" variant="outline" onClick={() => openMerchant(item)}><BarChart3 /> Thống kê</Button>{item.status !== 2 && <Button size="sm" onClick={() => { setReview({ id: item.id, status: MarketplaceListingStatus.Approved, title: item.title }); setNote(''); }}><Check /> Duyệt</Button>}<Button size="sm" variant="destructive" onClick={() => { setReview({ id: item.id, status: MarketplaceListingStatus.Removed, title: item.title }); setNote(''); }}><X /> Gỡ</Button></div>
      </div></article>)}</div>}

    <Dialog open={Boolean(review)} onOpenChange={(open) => !busy && !open && setReview(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{review?.status === 2 ? 'Duyệt mặt hàng' : 'Từ chối hoặc gỡ mặt hàng'}</DialogTitle><DialogDescription>{review?.title}</DialogDescription></DialogHeader><div className="grid gap-2"><Label htmlFor="market-review-note">Ghi chú kiểm duyệt</Label><Textarea id="market-review-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Giải thích quyết định cho thương nhân…" /></div><DialogFooter><Button variant="outline" onClick={() => setReview(null)}>Hủy</Button><Button variant={review?.status === 2 ? 'default' : 'destructive'} onClick={submitReview} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Xác nhận</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(merchant)} onOpenChange={(open) => !busy && !open && setMerchant(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle><BarChart3 /> Thống kê thương nhân</DialogTitle><DialogDescription>{merchant?.sellerName} · {merchant?.email}</DialogDescription></DialogHeader>{merchantStats ? <><div className="admin-merchant-stats">{[['Tổng', merchantStats.total], ['Đang bán', merchantStats.active], ['Chờ duyệt', merchantStats.pending], ['Đã bán', merchantStats.sold], ['Lượt xem', merchantStats.views], ['Lượt lưu', merchantStats.favorites], ['Báo cáo', merchantStats.reports], ['Phí', formatMoney(merchantStats.displayFees)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="grid gap-2"><Label htmlFor="seller-action-note">Lý do quản lý quyền bán hàng</Label><Textarea id="seller-action-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bắt buộc khi khóa quyền bán hàng…" /></div></> : <Loader2 className="animate-spin" />}<DialogFooter><Button variant="outline" onClick={() => setMerchant(null)}>Đóng</Button><Button variant={merchant?.isMarketplaceSuspended ? 'default' : 'destructive'} onClick={toggleSeller} disabled={busy || !merchantStats}>{merchant?.isMarketplaceSuspended ? <ShieldCheck /> : <Ban />}{merchant?.isMarketplaceSuspended ? 'Mở quyền bán hàng' : 'Khóa quyền bán hàng'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
};

export default AdminMarketplace;
