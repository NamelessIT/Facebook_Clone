import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight, CalendarDays, CheckCircle2, FileText, Flag, Heart,
  ImagePlus, Loader2, MapPin, MessageCircle, PackageCheck, Search, ShieldCheck, Store,
  ShoppingBag, SlidersHorizontal, Sparkles, Tag, UserRound, WalletCards,
} from 'lucide-react';
import toast from '../../shared/appToast';
import marketplaceService from '../../services/marketplaceService';
import ReportDialog from '../../components/moderation/ReportDialog';
import { getImageUrl } from '../../utils/formatUrl';
import { MarketplaceListingStatus, ModerationTargetType } from '../../shared/generated/enums';
import termsMarkdown from '../../content/marketplace-terms.md?raw';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import './DiscoveryPages.css';

const CATEGORIES = ['Tất cả', 'Xe cộ', 'Nhà đất', 'Điện tử', 'Đồ gia dụng', 'Thời trang', 'Giải trí', 'Khác'];
const CONDITIONS = ['Mới', 'Đã qua sử dụng - như mới', 'Đã qua sử dụng - tốt', 'Đã qua sử dụng', 'Cho thuê theo tháng'];
const EMPTY_FORM = { title: '', description: '', price: '', category: '', condition: '', location: '', acceptTerms: false };
const STATUS_LABELS = {
  [MarketplaceListingStatus.PendingReview]: 'Chờ kiểm duyệt', [MarketplaceListingStatus.Approved]: 'Đang hiển thị',
  [MarketplaceListingStatus.Rejected]: 'Bị từ chối', [MarketplaceListingStatus.Sold]: 'Đã bán', [MarketplaceListingStatus.Removed]: 'Đã gỡ',
};
const formatPrice = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;

const MarketplacePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [terms, setTerms] = useState({ version: '2026-08-11', displayFee: 10000 });
  const [stats, setStats] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const closingItemRef = useRef(null);
  const itemRequestVersionRef = useRef(0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try { setItems((await marketplaceService.list()).data.data || []); }
    catch (error) { toast.apiError(error, 'Không thể tải Marketplace.', { context: 'marketplace.list' }); }
    finally { setLoading(false); }
  }, []);

  const loadShop = useCallback(async () => {
    try {
      const [statsResponse, listingResponse] = await Promise.all([marketplaceService.getMyStats(), marketplaceService.getMyListings()]);
      setStats(statsResponse.data.data); setMyListings(listingResponse.data.data || []);
    } catch (error) { toast.apiError(error, 'Không thể tải thống kê gian hàng.', { context: 'marketplace.shop' }); }
  }, []);

  useEffect(() => { loadItems(); marketplaceService.getTerms().then((response) => setTerms(response.data.data)).catch(() => {}); }, [loadItems]);
  useEffect(() => {
    const id = searchParams.get('item');
    if (!id) {
      closingItemRef.current = null;
      itemRequestVersionRef.current += 1;
      return;
    }
    if (closingItemRef.current === id || selectedItem?.id === id) return;
    const requestVersion = ++itemRequestVersionRef.current;
    marketplaceService.get(id)
      .then((response) => {
        if (requestVersion === itemRequestVersionRef.current && closingItemRef.current !== id)
          setSelectedItem(response.data.data);
      })
      .catch(() => {
        if (requestVersion === itemRequestVersionRef.current) setSearchParams({}, { replace: true });
      });
  }, [searchParams, selectedItem?.id, setSearchParams]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const filteredItems = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('vi');
    return items.filter((item) => (category === 'Tất cả' || item.category === category) &&
      (!text || `${item.title} ${item.location} ${item.sellerName}`.toLocaleLowerCase('vi').includes(text)));
  }, [category, items, query]);

  const chooseImage = (file) => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(file || null); setPreview(file ? URL.createObjectURL(file) : '');
  };

  const submitListing = async (event) => {
    event.preventDefault();
    if (!form.acceptTerms) { toast.error('Bạn cần đồng ý điều khoản trưng bày trước khi đăng.'); return; }
    if (!image) { toast.error('Vui lòng chọn ảnh sản phẩm.'); return; }
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      body.set('acceptTerms', 'true'); body.append('termsVersion', terms.version); body.append('image', image);
      await marketplaceService.create(body);
      toast.success('Đã gửi mặt hàng để kiểm duyệt. Mặt hàng sẽ hiển thị sau khi được duyệt.');
      setCreateOpen(false); setForm(EMPTY_FORM); chooseImage(null); await loadShop();
    } catch (error) { toast.apiError(error, 'Không thể đăng mặt hàng.', { context: 'marketplace.create' }); }
    finally { setSubmitting(false); }
  };

  const toggleFavorite = async (item) => {
    try {
      const result = (await marketplaceService.toggleFavorite(item.id)).data.data;
      const patchItem = (current) => current.id === item.id ? { ...current, isFavorite: result.isFavorite, favoriteCount: result.count } : current;
      setItems((current) => current.map(patchItem)); setSelectedItem((current) => current ? patchItem(current) : current);
    } catch (error) { toast.apiError(error, 'Không thể cập nhật sản phẩm đã lưu.', { context: 'marketplace.favorite' }); }
  };

  const openItem = async (item) => {
    closingItemRef.current = null;
    const requestVersion = ++itemRequestVersionRef.current;
    setSelectedItem(item); setSearchParams({ item: item.id });
    try {
      const detail = (await marketplaceService.get(item.id)).data.data;
      if (requestVersion === itemRequestVersionRef.current && closingItemRef.current !== item.id) setSelectedItem(detail);
    } catch { /* card data remains usable */ }
  };
  const closeItem = () => {
    closingItemRef.current = selectedItem?.id || searchParams.get('item');
    itemRequestVersionRef.current += 1;
    setSearchParams({}, { replace: true });
    setSelectedItem(null);
  };
  const openShop = async () => { setShopOpen(true); await loadShop(); };

  return (
    <section className="discovery-page discovery-page--wide marketplace-page">
      <header className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <Badge variant="secondary"><ShoppingBag /> Chợ cộng đồng</Badge>
          <h1>Mua bán gần bạn, rõ ràng và dễ dàng</h1>
          <p>Khám phá mặt hàng đã kiểm duyệt, xem đầy đủ giá, tình trạng và khu vực trước khi liên hệ người bán.</p>
          <div className="marketplace-hero-stats"><span><strong>{items.length}</strong> mặt hàng đang hiển thị</span><span><ShieldCheck /> Không thu hoa hồng giao dịch</span></div>
        </div>
        <div className="marketplace-hero-actions"><Button variant="outline" size="lg" onClick={openShop}><Store /> Gian hàng của tôi</Button><Button size="lg" onClick={() => setCreateOpen(true)}><Tag /> Đăng mặt hàng</Button></div>
      </header>

      <section className="marketplace-toolbar" aria-labelledby="marketplace-search-title">
        <div className="marketplace-section-title"><span><SlidersHorizontal /></span><div><h2 id="marketplace-search-title">Tìm mặt hàng</h2><p>Tìm theo tên sản phẩm, người bán hoặc khu vực.</p></div></div>
        <label className="discovery-search marketplace-search"><Search size={18} /><Input aria-label="Tìm kiếm Marketplace" placeholder="Ví dụ: MacBook, Quận 1…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="marketplace-filter-label">Danh mục sản phẩm</div>
        <div className="discovery-categories marketplace-categories">{CATEGORIES.map((item) => <Button size="sm" key={item} variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>)}</div>
      </section>

      <div className="marketplace-results-heading"><div><span className="marketplace-heading-icon"><Sparkles /></span><div><h2>Sản phẩm dành cho bạn</h2><p>Chỉ hiển thị mặt hàng đã qua kiểm duyệt.</p></div></div><Badge variant="outline">{filteredItems.length} sản phẩm</Badge></div>
      {loading ? <Card className="discovery-empty-card"><CardContent><Loader2 className="animate-spin" /> Đang tải Marketplace…</CardContent></Card> : filteredItems.length > 0 ? (
        <div className="marketplace-grid">{filteredItems.map((item) => (
          <Card className="marketplace-card" key={item.id} role="button" tabIndex={0} onClick={() => openItem(item)} onKeyDown={(event) => { if (event.key === 'Enter') openItem(item); }}>
            <div className="marketplace-image-wrap"><img src={getImageUrl(item.imageUrl)} alt={item.title} loading="lazy" /><Badge className="marketplace-condition-badge" variant="secondary">{item.condition}</Badge><button type="button" className={`marketplace-favorite${item.isFavorite ? ' marketplace-favorite--active' : ''}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(item); }} aria-label="Lưu sản phẩm"><Heart fill={item.isFavorite ? 'currentColor' : 'none'} /></button></div>
            <CardContent className="marketplace-card-content"><span className="marketplace-field-label">Giá bán</span><strong className="marketplace-price">{formatPrice(item.price)}</strong><h3>{item.title}</h3><div className="marketplace-card-location"><MapPin /><span><small>Khu vực</small>{item.location}</span></div><div className="marketplace-card-footer"><span><UserRound /> {item.sellerName}</span><span>{new Date(item.createdAt).toLocaleDateString('vi-VN')} <ArrowUpRight /></span></div></CardContent>
          </Card>
        ))}</div>
      ) : <Card className="discovery-empty-card"><CardContent><PackageCheck /><p>Không tìm thấy sản phẩm phù hợp.</p></CardContent></Card>}

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && closeItem()}>
        <DialogContent className="marketplace-dialog sm:max-w-4xl">{selectedItem && <div className="marketplace-dialog-layout">
          <div className="marketplace-dialog-media"><img src={getImageUrl(selectedItem.imageUrl)} alt={selectedItem.title} /><Badge>{selectedItem.category}</Badge></div>
          <div className="marketplace-dialog-body"><DialogHeader><div className="marketplace-dialog-kicker">Chi tiết mặt hàng đã kiểm duyệt</div><DialogTitle>{selectedItem.title}</DialogTitle><DialogDescription>Đăng ngày {new Date(selectedItem.createdAt).toLocaleDateString('vi-VN')} tại {selectedItem.location}</DialogDescription></DialogHeader>
            <div className="marketplace-dialog-price-panel"><span>Giá người bán đề xuất</span><strong>{formatPrice(selectedItem.price)}</strong></div>
            <section className="marketplace-dialog-section"><h3>Mô tả sản phẩm</h3><p>{selectedItem.description}</p></section>
            <div className="marketplace-detail-grid"><div><ShoppingBag /><span><small>Danh mục</small><strong>{selectedItem.category}</strong></span></div><div><ShieldCheck /><span><small>Tình trạng</small><strong>{selectedItem.condition}</strong></span></div><div><MapPin /><span><small>Khu vực</small><strong>{selectedItem.location}</strong></span></div><div><CalendarDays /><span><small>Lượt xem</small><strong>{selectedItem.viewCount}</strong></span></div></div>
            <div className="marketplace-seller-card"><div className="marketplace-seller-avatar">{selectedItem.sellerName?.charAt(0)}</div><div><small>Người bán</small><strong>{selectedItem.sellerName}</strong><span>Giao dịch qua liên hệ trực tiếp</span></div><ShieldCheck /></div>
            <DialogFooter className="marketplace-dialog-actions"><Button variant="outline" onClick={() => toggleFavorite(selectedItem)}><Heart fill={selectedItem.isFavorite ? 'currentColor' : 'none'} />{selectedItem.isFavorite ? 'Đã lưu' : 'Lưu sản phẩm'}</Button><Button onClick={() => toast.success(`Thông tin liên hệ: ${selectedItem.sellerEmail}`)}><MessageCircle /> Liên hệ người bán</Button></DialogFooter>
            {!selectedItem.isOwner && <Button variant="ghost" className="marketplace-report-button" onClick={() => setReportOpen(true)}><Flag /> Báo cáo mặt hàng</Button>}
            <p className="marketplace-safety-note"><ShieldCheck /> Không chuyển tiền trước khi xác minh sản phẩm và người bán.</p>
          </div>
        </div>}</DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(value) => !submitting && setCreateOpen(value)}><DialogContent className="marketplace-create-dialog sm:max-w-3xl"><form onSubmit={submitListing}>
        <DialogHeader><div className="marketplace-create-heading"><span><ImagePlus /></span><div><DialogTitle>Đăng mặt hàng mới</DialogTitle><DialogDescription>Mặt hàng sẽ ở trạng thái chờ cho tới khi kiểm duyệt viên chấp thuận.</DialogDescription></div></div></DialogHeader>
        <div className="marketplace-create-grid"><label className="marketplace-image-drop"><input type="file" accept="image/png,image/jpeg,image/gif" onChange={(event) => chooseImage(event.target.files?.[0])} />{preview ? <img src={preview} alt="Xem trước sản phẩm" /> : <><ImagePlus /><strong>Thêm ảnh sản phẩm</strong><span>PNG/JPG/GIF, tối đa 10 MB</span></>}</label>
          <div className="marketplace-create-fields"><div className="grid gap-2"><Label htmlFor="listing-title">Tên mặt hàng</Label><Input id="listing-title" value={form.title} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} maxLength={160} required /></div><div className="grid gap-2"><Label htmlFor="listing-price">Giá bán (₫)</Label><Input id="listing-price" type="number" min="1" value={form.price} onChange={(e) => setForm((x) => ({ ...x, price: e.target.value }))} required /></div><div className="marketplace-create-row"><div><Label>Danh mục</Label><Select value={form.category} onValueChange={(value) => setForm((x) => ({ ...x, category: value }))}><SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger><SelectContent>{CATEGORIES.slice(1).map((x) => <SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Tình trạng</Label><Select value={form.condition} onValueChange={(value) => setForm((x) => ({ ...x, condition: value }))}><SelectTrigger><SelectValue placeholder="Chọn tình trạng" /></SelectTrigger><SelectContent>{CONDITIONS.map((x) => <SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-2"><Label htmlFor="listing-location">Khu vực</Label><Input id="listing-location" value={form.location} onChange={(e) => setForm((x) => ({ ...x, location: e.target.value }))} required /></div></div></div>
        <div className="grid gap-2"><Label htmlFor="listing-description">Mô tả chi tiết</Label><Textarea id="listing-description" value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} minLength={10} maxLength={3000} required /></div>
        <div className="marketplace-fee-box"><WalletCards /><div><strong>Phí trưng bày: {formatPrice(terms.displayFee)}</strong><span>Facebook Clone không thu hoa hồng giao dịch. Bản demo chỉ ghi nhận phí, chưa thực hiện thanh toán.</span></div></div>
        <label className="marketplace-terms-check"><Checkbox checked={form.acceptTerms} onCheckedChange={(value) => setForm((x) => ({ ...x, acceptTerms: Boolean(value) }))} /><span>Tôi đã đọc và đồng ý <button type="button" onClick={() => setTermsOpen(true)}>Điều khoản trưng bày phiên bản {terms.version}</button>.</span></label>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Hủy</Button><Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Gửi kiểm duyệt</Button></DialogFooter>
      </form></DialogContent></Dialog>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}><DialogContent className="marketplace-terms-dialog sm:max-w-3xl"><DialogHeader><DialogTitle><FileText /> Điều khoản Marketplace</DialogTitle><DialogDescription>Phiên bản bắt buộc khi gửi mặt hàng kiểm duyệt.</DialogDescription></DialogHeader><article>{termsMarkdown}</article><DialogFooter><Button onClick={() => { setForm((x) => ({ ...x, acceptTerms: true })); setTermsOpen(false); }}>Tôi đã đọc và đồng ý</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}><DialogContent className="marketplace-shop-dialog sm:max-w-4xl"><DialogHeader><DialogTitle><Store /> Gian hàng của tôi</DialogTitle><DialogDescription>Thống kê hiệu quả trưng bày và trạng thái kiểm duyệt mặt hàng.</DialogDescription></DialogHeader>
        {stats ? <div className="marketplace-stat-grid">{[['Tổng mặt hàng', stats.total], ['Đang hiển thị', stats.active], ['Chờ duyệt', stats.pending], ['Đã bán', stats.sold], ['Lượt xem', stats.views], ['Lượt lưu', stats.favorites], ['Báo cáo', stats.reports], ['Phí trưng bày', formatPrice(stats.displayFees)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : <Loader2 className="animate-spin" />}
        <div className="marketplace-shop-list">{myListings.map((item) => <article key={item.id}><img src={getImageUrl(item.imageUrl)} alt="" /><div><strong>{item.title}</strong><span>{formatPrice(item.price)} · {STATUS_LABELS[item.status]}</span>{item.moderationNote && <small>{item.moderationNote}</small>}</div>{item.status === MarketplaceListingStatus.Approved && <Button size="sm" variant="outline" onClick={async () => { await marketplaceService.markSold(item.id); await loadShop(); await loadItems(); }}>Đánh dấu đã bán</Button>}</article>)}</div>
      </DialogContent></Dialog>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType={ModerationTargetType.MarketplaceListing} targetId={selectedItem?.id} targetLabel="mặt hàng này" />
    </section>
  );
};

export default MarketplacePage;
