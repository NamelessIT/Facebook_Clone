import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Banknote, BarChart3, Check, CircleCheck, CircleX, Clock3, Loader2, PackageSearch, RefreshCw, ShieldCheck, Store, X } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from '../../shared/appToast';
import { getImageUrl } from '../../utils/formatUrl';
import { MarketplaceListingStatus, MarketplaceListingStatusUi, MarketplacePaymentStatusUi } from '../../shared/generated/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { useLocalization } from '../../contexts/useLocalization';

const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;
const enumLabel = (metadata, value, locale) => metadata[value]?.labels?.[locale] || metadata[value]?.labels?.vi || String(value);
const listingStatusLabel = (value, locale) => enumLabel(MarketplaceListingStatusUi, value, locale);

const AdminMarketplace = () => {
  const { locale } = useLocalization();
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
  const [payments, setPayments] = useState([]);
  const [paymentReview, setPaymentReview] = useState(null);
  const [paymentNote, setPaymentNote] = useState('');
  const STATUS = useMemo(() => Object.fromEntries(Object.keys(MarketplaceListingStatusUi).map((value) => [value, listingStatusLabel(value, locale)])), [locale]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listingResponse, paymentResponse] = await Promise.all([
        adminService.getMarketplaceListings(), adminService.getMarketplacePayments(),
      ]);
      setItems(listingResponse.data.data || []);
      setPayments(paymentResponse.data.data || []);
    }
    catch (error) { toast.apiError(error, "Không thể tải danh sách mặt hàng.", { context: "admin.marketplace.list" }); }
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
    try { await adminService.reviewMarketplaceListing(review.id, review.status, note); toast.success(translateCatalogKey('ui.pages.admin.adminmarketplace.a-cap-nhat-kiem-duyet-mat-hang.67a2558c')); setReview(null); setNote(''); await load(); }
    catch (error) { toast.apiError(error, "Không thể kiểm duyệt mặt hàng.", { context: "admin.marketplace.review" }); }
    finally { setBusy(false); }
  };
  const openMerchant = async (item) => {
    setMerchant(item); setMerchantStats(null);
    try { setMerchantStats((await adminService.getMerchantStats(item.sellerId)).data.data); }
    catch (error) { toast.apiError(error, "Không thể tải thống kê thương nhân.", { context: "admin.marketplace.merchant" }); }
  };
  const toggleSeller = async () => {
    const suspended = !merchant.isMarketplaceSuspended;
    if (suspended && !note.trim()) { toast.error(translateCatalogKey('ui.pages.admin.adminmarketplace.can-nhap-ly-do-khoa-quyen-ban-hang.b10a29c4')); return; }
    setBusy(true);
    try { await adminService.setMarketplaceSellerSuspension(merchant.sellerId, suspended, note); toast.success(suspended ? "Đã khóa quyền bán hàng." : "Đã mở lại quyền bán hàng."); setMerchant(null); setNote(''); await load(); }
    catch (error) { toast.apiError(error, "Không thể cập nhật quyền bán hàng.", { context: "admin.marketplace.seller" }); }
    finally { setBusy(false); }
  };
  const reviewPayment = async (successful) => {
    if (!successful && !paymentNote.trim()) { toast.error(translateCatalogKey('marketplace.payment.failureReasonRequired')); return; }
    setBusy(true);
    try {
      await adminService.reviewMarketplacePayment(paymentReview.id, successful, paymentNote);
      toast.success(successful ? translateCatalogKey('marketplace.payment.confirmed') : translateCatalogKey('marketplace.payment.rejected'));
      setPaymentReview(null); setPaymentNote(''); await load();
    } catch (error) { toast.apiError(error, translateCatalogKey('marketplace.payment.reviewFailed'), { context: 'admin.marketplace.payment.review' }); }
    finally { setBusy(false); }
  };

  return <section className="admin-feature-page admin-marketplace-page">
    <header className="admin-feature-header"><div><span className="admin-feature-icon"><Store /></span><div><h1>{translateCatalogKey('ui.pages.admin.adminmarketplace.quan-ly-marketplace.98e5a955')}</h1><p>{translateCatalogKey('ui.pages.admin.adminmarketplace.duyet-mat-hang-xem-hieu-qua-trung-ba.c9b00eb1')}</p></div></div><Button variant="outline" onClick={load}><RefreshCw /> {translateCatalogKey('common.refresh')}</Button></header>
    <div className="admin-feature-toolbar"><label><PackageSearch /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={translateCatalogKey('ui.pages.admin.adminmarketplace.tim-mat-hang-thuong-nhan-hoac-email.6e6111be')} /></label><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{translateCatalogKey('ui.pages.admin.adminlives.tat-ca-trang-thai.f6908bd5')}</SelectItem>{Object.entries(MarketplaceListingStatusUi).map(([value]) => <SelectItem key={value} value={value}>{enumLabel(MarketplaceListingStatusUi, value, locale)}</SelectItem>)}</SelectContent></Select></div>
    <section className="admin-payment-panel" aria-labelledby="marketplace-transactions-title">
      <div className="admin-payment-panel-heading"><span><Banknote /></span><div><h2 id="marketplace-transactions-title">{translateCatalogKey('marketplace.payment.adminTitle')}</h2><p>{translateCatalogKey('marketplace.payment.adminSubtitle')}</p></div><Badge variant="outline">{payments.filter((item) => item.status === 2).length} {translateCatalogKey('marketplace.payment.awaitingCount')}</Badge></div>
      <div className="admin-payment-list">{payments.length === 0 ? <div className="admin-payment-empty"><Banknote /> {translateCatalogKey('marketplace.payment.noTransactions')}</div> : payments.slice(0, 12).map((payment) => <article key={payment.id} className={`admin-payment-row admin-payment-row--${payment.status}`}>
        <div className="admin-payment-status-icon">{payment.status === 2 ? <Clock3 /> : payment.status === 3 || payment.status === 6 ? <CircleCheck /> : payment.status === 4 || payment.status === 5 ? <CircleX /> : <Banknote />}</div>
        <div><span>{translateCatalogKey('marketplace.payment.reference')}</span><strong>{payment.referenceCode}</strong><small>{payment.userName} · {payment.email}</small></div>
        <div><span>{translateCatalogKey('marketplace.payment.amount')}</span><strong>{formatMoney(payment.amount)}</strong><small>{new Date(payment.createdAt).toLocaleString('vi-VN')}</small></div>
        <div><span>{translateCatalogKey('marketplace.payment.status')}</span><Badge variant={MarketplacePaymentStatusUi[payment.status]?.badgeVariant || 'outline'} className={`enum-tone-${MarketplacePaymentStatusUi[payment.status]?.tone || 'neutral'}`}>{enumLabel(MarketplacePaymentStatusUi, payment.status, locale)}</Badge>{payment.failureReason && <small>{payment.failureReason}</small>}</div>
        <div className="admin-payment-row-actions">{payment.status === 2 && <Button size="sm" onClick={() => { setPaymentReview(payment); setPaymentNote(''); }}><Check /> {translateCatalogKey('marketplace.payment.verify')}</Button>}</div>
      </article>)}</div>
    </section>
    {loading ? <div className="admin-empty-state"><Loader2 className="animate-spin" /> {translateCatalogKey('ui.pages.admin.adminlives.ang-tai.1bff877b')}</div> : <div className="admin-market-grid">{filtered.map((item) => <article key={item.id} className={`admin-market-card${searchParams.get('targetId') === item.id ? ' admin-target-highlight' : ''}`}>
      <img src={getImageUrl(item.imageUrl)} alt={item.title} /><div className="admin-market-card-body"><div className="admin-market-card-top"><Badge variant={item.status === 2 ? 'default' : 'outline'}>{STATUS[item.status]}</Badge><span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span></div><h2>{item.title}</h2><strong>{formatMoney(item.price)}</strong><dl><div><dt>{translateCatalogKey('ui.pages.admin.adminmarketplace.thuong-nhan.892dfa84')}</dt><dd>{item.sellerName}</dd></div><div><dt>{translateCatalogKey('ui.pages.admin.adminusers.email.518b5ead')}</dt><dd>{item.email}</dd></div><div><dt>{translateCatalogKey('ui.pages.admin.adminmarketplace.danh-muc.7b6a7c7c')}</dt><dd>{item.category}</dd></div><div><dt>{translateCatalogKey('ui.pages.admin.adminmarketplace.tuong-tac.1353b29a')}</dt><dd>{item.viewCount} {translateCatalogKey('ui.pages.admin.adminmarketplace.xem.b2073190')} {item.favoriteCount} {translateCatalogKey('ui.pages.admin.adminmarketplace.luu.dd86a159')} {item.reportCount} {translateCatalogKey('ui.pages.admin.adminmarketplace.bao-cao.2686a33b')}</dd></div><div><dt>{translateCatalogKey('ui.pages.admin.adminmarketplace.phi-trung-bay.36766ee9')}</dt><dd>{formatMoney(item.displayFee)} {translateCatalogKey('ui.pages.admin.adminmarketplace.ieu-khoan.1ecef831')} {item.termsVersion}</dd></div></dl>{item.moderationNote && <p className="admin-market-note">{item.moderationNote}</p>}
        <div className="admin-market-actions"><Button size="sm" variant="outline" onClick={() => openMerchant(item)}><BarChart3 /> {translateCatalogKey('ui.pages.admin.adminmarketplace.thong-ke.eca4b0de')}</Button>{item.status === MarketplaceListingStatus.PendingReview && <Button size="sm" onClick={() => { setReview({ id: item.id, status: MarketplaceListingStatus.Approved, title: item.title }); setNote(''); }}><Check /> {translateCatalogKey('ui.pages.admin.adminmarketplace.duyet.d8107c5d')}</Button>}<Button size="sm" variant="destructive" onClick={() => { setReview({ id: item.id, status: MarketplaceListingStatus.Removed, title: item.title }); setNote(''); }}><X /> {translateCatalogKey('ui.pages.admin.adminmarketplace.go.06a6fa40')}</Button></div>
      </div></article>)}</div>}

    <Dialog open={Boolean(review)} onOpenChange={(open) => !busy && !open && setReview(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{review?.status === 2 ? "Duyệt mặt hàng" : "Từ chối hoặc gỡ mặt hàng"}</DialogTitle><DialogDescription>{review?.title}</DialogDescription></DialogHeader><div className="grid gap-2"><Label htmlFor="market-review-note">{translateCatalogKey('ui.pages.admin.adminmarketplace.ghi-chu-kiem-duyet.f3a4757d')}</Label><Textarea id="market-review-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={translateCatalogKey('ui.pages.admin.adminmarketplace.giai-thich-quyet-inh-cho-thuong-nhan.1db8593a')} /></div><DialogFooter><Button variant="outline" onClick={() => setReview(null)}>{translateCatalogKey('common.cancel')}</Button><Button variant={review?.status === 2 ? 'default' : 'destructive'} onClick={submitReview} disabled={busy}>{busy && <Loader2 className="animate-spin" />} {translateCatalogKey('common.confirm')}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(merchant)} onOpenChange={(open) => !busy && !open && setMerchant(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle><BarChart3 /> {translateCatalogKey('ui.pages.admin.adminmarketplace.thong-ke-thuong-nhan.c673e7c9')}</DialogTitle><DialogDescription>{merchant?.sellerName} · {merchant?.email}</DialogDescription></DialogHeader>{merchantStats ? <><div className="admin-merchant-stats">{[["Tổng", merchantStats.total], ["Đang bán", merchantStats.active], ["Chờ duyệt", merchantStats.pending], ["Đã bán", merchantStats.sold], ["Lượt xem", merchantStats.views], ["Lượt lưu", merchantStats.favorites], [translateCatalogKey('common.report'), merchantStats.reports], ["Phí", formatMoney(merchantStats.displayFees)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="grid gap-2"><Label htmlFor="seller-action-note">{translateCatalogKey('ui.pages.admin.adminmarketplace.ly-do-quan-ly-quyen-ban-hang.610ce634')}</Label><Textarea id="seller-action-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={translateCatalogKey('ui.pages.admin.adminmarketplace.bat-buoc-khi-khoa-quyen-ban-hang.dbec51e6')} /></div></> : <Loader2 className="animate-spin" />}<DialogFooter><Button variant="outline" onClick={() => setMerchant(null)}>{translateCatalogKey('common.close')}</Button><Button variant={merchant?.isMarketplaceSuspended ? 'default' : 'destructive'} onClick={toggleSeller} disabled={busy || !merchantStats}>{merchant?.isMarketplaceSuspended ? <ShieldCheck /> : <Ban />}{merchant?.isMarketplaceSuspended ? "Mở quyền bán hàng" : "Khóa quyền bán hàng"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(paymentReview)} onOpenChange={(open) => !busy && !open && setPaymentReview(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle><Banknote /> {translateCatalogKey('marketplace.payment.reviewTitle')}</DialogTitle><DialogDescription>{paymentReview?.referenceCode} · {paymentReview?.userName} · {formatMoney(paymentReview?.amount)}</DialogDescription></DialogHeader><div className="admin-payment-review-summary"><p>{translateCatalogKey('marketplace.payment.reviewWarning')}</p><dl><div><dt>{translateCatalogKey('marketplace.payment.reference')}</dt><dd>{paymentReview?.referenceCode}</dd></div><div><dt>{translateCatalogKey('marketplace.payment.amount')}</dt><dd>{formatMoney(paymentReview?.amount)}</dd></div></dl></div><div className="grid gap-2"><Label htmlFor="payment-review-note">{translateCatalogKey('marketplace.payment.reviewNote')}</Label><Textarea id="payment-review-note" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder={translateCatalogKey('marketplace.payment.failureReasonPlaceholder')} /></div><DialogFooter><Button variant="destructive" onClick={() => reviewPayment(false)} disabled={busy}><CircleX /> {translateCatalogKey('marketplace.payment.markFailed')}</Button><Button onClick={() => reviewPayment(true)} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <CircleCheck />} {translateCatalogKey('marketplace.payment.markSucceeded')}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
};

export default AdminMarketplace;
