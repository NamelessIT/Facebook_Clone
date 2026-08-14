import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight, Banknote, CalendarDays, CheckCircle2, CircleAlert, CircleCheck, Copy, FileText, Flag, Heart,
  ImagePlus, Loader2, MapPin, MessageCircle, PackageCheck, Pencil, RotateCcw, Search, ShieldCheck, Store, Trash2,
  ShoppingBag, SlidersHorizontal, Sparkles, Tag, UserRound, WalletCards,
} from 'lucide-react';
import toast from '../../shared/appToast';
import marketplaceService from '../../services/marketplaceService';
import ReportDialog from '../../components/moderation/ReportDialog';
import { getImageUrl } from '../../utils/formatUrl';
import { MarketplaceListingStatus, MarketplaceListingStatusUi, MarketplacePaymentStatus, ModerationTargetType } from '../../shared/generated/enums';
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
import { translateCatalogKey } from '../../shared/localizationRuntime';
import useNonOverlappingPolling from '../../hooks/useNonOverlappingPolling';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/useConfirm';
import { useLocalization } from '../../contexts/useLocalization';

const CONDITIONS = ['Mới', 'Đã qua sử dụng - như mới', 'Đã qua sử dụng - tốt', 'Đã qua sử dụng', 'Cho thuê theo tháng'];
const EMPTY_FORM = { title: '', description: '', price: '', category: '', condition: '', location: '', acceptTerms: false };
const formatPrice = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;

const MarketplacePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirmAction = useConfirm();
  const { locale } = useLocalization();
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
  const [contacting, setContacting] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [shopActionId, setShopActionId] = useState(null);
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
    catch (error) { toast.apiError(error, "Không thể tải Marketplace.", { context: "marketplace.list" }); }
    finally { setLoading(false); }
  }, []);

  const loadShop = useCallback(async () => {
    try {
      const [statsResponse, listingResponse] = await Promise.all([marketplaceService.getMyStats(), marketplaceService.getMyListings()]);
      setStats(statsResponse.data.data); setMyListings(listingResponse.data.data || []);
    } catch (error) { toast.apiError(error, "Không thể tải thống kê gian hàng.", { context: "marketplace.shop" }); }
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
  useNonOverlappingPolling(async () => {
    try { setPaymentTransaction((await marketplaceService.getPayment(paymentTransaction.id)).data.data); }
    catch { /* keep the last durable state and retry */ }
  }, 5000, {
    enabled: paymentTransaction?.status === MarketplacePaymentStatus.AwaitingVerification,
    immediate: false,
  });

  useEffect(() => {
    if (paymentTransaction?.status !== MarketplacePaymentStatus.Consumed) return;
    toast.success(translateCatalogKey('marketplace.draft.paymentConfirmed'));
    setCreateOpen(false);
    setPaymentTransaction(null);
    setEditingListing(null);
    setForm(EMPTY_FORM);
    chooseImage(null);
    loadShop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentTransaction?.status]);

  const filteredItems = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('vi');
    return items.filter((item) => (category === 'Tất cả' || item.category === category) &&
      (!text || `${item.title} ${item.location} ${item.sellerName}`.toLocaleLowerCase('vi').includes(text)));
  }, [category, items, query]);
  const categories = useMemo(() => {
    const values = ['Tất cả', ...(terms.categories || []).map((item) => item.name)];
    if (editingListing?.category && !values.includes(editingListing.category)) values.push(editingListing.category);
    return values;
  }, [editingListing?.category, terms.categories]);
  const CATEGORIES = categories;
  const selectedCategoryFee = useMemo(() => (terms.categories || []).find((item) => item.name === form.category)?.displayFee
    ?? (editingListing?.category === form.category ? editingListing.displayFee : terms.displayFee),
  [editingListing?.category, editingListing?.displayFee, form.category, terms.categories, terms.displayFee]);
  const statusLabel = (value) => MarketplaceListingStatusUi[value]?.labels?.[locale] || MarketplaceListingStatusUi[value]?.labels?.vi || String(value);
  const STATUS_LABELS = Object.fromEntries(Object.keys(MarketplaceListingStatusUi).map((value) => [value, statusLabel(value)]));

  const chooseImage = (file) => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(file || null); setPreview(file ? URL.createObjectURL(file) : '');
  };

  const submitListing = async (event) => {
    event.preventDefault();
    if (!form.acceptTerms) { toast.error(translateCatalogKey('ui.pages.discovery.marketplacepage.ban-can-ong-y-ieu-khoan-trung-bay-tr.fa8c6150')); return; }
    if (!image && !editingListing) { toast.error(translateCatalogKey('ui.pages.discovery.marketplacepage.vui-long-chon-anh-san-pham.83d01bd8')); return; }
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      body.set('acceptTerms', 'true'); body.append('termsVersion', terms.version); if (image) body.append('image', image);
      if (editingListing) {
        const response = await marketplaceService.update(editingListing.id, body);
        const updated = response.data.data;
        setEditingListing(updated);
        toast.success(response.data.message || 'Đã lưu thay đổi mặt hàng.');
        if (updated.status !== MarketplaceListingStatus.AwaitingPayment) {
          setCreateOpen(false); setEditingListing(null); setForm(EMPTY_FORM); chooseImage(null);
        }
      } else {
        const response = await marketplaceService.create(body);
        setEditingListing(response.data.data.listing);
        setPaymentTransaction(response.data.data.payment);
        toast.success(response.data.message || 'Đã lưu bản nháp mặt hàng.');
      }
      await loadShop();
    } catch (error) { toast.apiError(error, "Không thể đăng mặt hàng.", { context: "marketplace.create" }); }
    finally { setSubmitting(false); }
  };

  const createPayment = async (listingId = editingListing?.id) => {
    if (!listingId) return;
    setPaymentBusy(true);
    try { setPaymentTransaction((await marketplaceService.createPayment(listingId)).data.data); }
    catch (error) { toast.apiError(error, translateCatalogKey('marketplace.payment.createFailed'), { context: 'marketplace.payment.create' }); }
    finally { setPaymentBusy(false); }
  };
  const submitPayment = async () => {
    if (!paymentTransaction) return;
    setPaymentBusy(true);
    try {
      const response = await marketplaceService.submitPayment(paymentTransaction.id);
      setPaymentTransaction(response.data.data);
      toast.success(response.data.message || translateCatalogKey('marketplace.payment.submitted'));
    } catch (error) { toast.apiError(error, translateCatalogKey('marketplace.payment.submitFailed'), { context: 'marketplace.payment.submit' }); }
    finally { setPaymentBusy(false); }
  };
  const refreshPayment = async () => {
    if (!paymentTransaction) return;
    setPaymentBusy(true);
    try { setPaymentTransaction((await marketplaceService.getPayment(paymentTransaction.id)).data.data); }
    catch (error) { toast.apiError(error, translateCatalogKey('marketplace.payment.refreshFailed'), { context: 'marketplace.payment.refresh' }); }
    finally { setPaymentBusy(false); }
  };
  const copyPaymentValue = async (value) => {
    await navigator.clipboard.writeText(value);
    toast.success(translateCatalogKey('marketplace.payment.copied'));
  };

  const openNewListing = () => {
    setEditingListing(null); setPaymentTransaction(null); setForm(EMPTY_FORM); chooseImage(null); setCreateOpen(true);
  };

  const editListing = async (item) => {
    setEditingListing(item);
    setForm({ title: item.title, description: item.description, price: String(item.price), category: item.category,
      condition: item.condition, location: item.location, acceptTerms: true });
    chooseImage(null); setPreview(getImageUrl(item.imageUrl)); setPaymentTransaction(null); setCreateOpen(true); setShopOpen(false);
    if (item.paymentTransactionId && item.status === MarketplaceListingStatus.AwaitingPayment) {
      try { setPaymentTransaction((await marketplaceService.getPayment(item.paymentTransactionId)).data.data); }
      catch { /* the retry button creates a replacement transaction */ }
    }
  };

  const withdrawListing = async (item) => {
    try { await marketplaceService.withdraw(item.id); toast.success(translateCatalogKey('marketplace.draft.withdrawn')); await loadShop(); await loadItems(); }
    catch (error) { toast.apiError(error, 'Không thể thu hồi mặt hàng.', { context: 'marketplace.withdraw' }); }
  };

  const markListingSold = async (item) => {
    const accepted = await confirmAction({
      title: translateCatalogKey('marketplace.listing.markSoldTitle'),
      message: translateCatalogKey('marketplace.listing.markSoldMessage'),
      detail: translateCatalogKey('marketplace.listing.markSoldDetail'),
      confirmText: translateCatalogKey('marketplace.listing.markSoldConfirm'),
      cancelText: translateCatalogKey('common.cancel'),
      danger: true,
    });
    if (!accepted) return;
    setShopActionId(item.id);
    try {
      const response = await marketplaceService.markSold(item.id);
      toast.success(response.data.message || translateCatalogKey('marketplace.listing.soldSuccess'));
      await Promise.all([loadShop(), loadItems()]);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('marketplace.listing.soldFailed'), { context: 'marketplace.sold' });
    } finally { setShopActionId(null); }
  };

  const relistListing = async (item) => {
    const accepted = await confirmAction({
      title: translateCatalogKey('marketplace.listing.relistTitle'),
      message: translateCatalogKey('marketplace.listing.relistMessage'),
      detail: `${translateCatalogKey('marketplace.listing.relistDetail')} ${formatPrice((terms.categories || []).find((entry) => entry.name === item.category)?.displayFee ?? terms.displayFee)}.`,
      confirmText: translateCatalogKey('marketplace.listing.relistConfirm'),
      cancelText: translateCatalogKey('common.cancel'),
    });
    if (!accepted) return;
    setShopActionId(item.id);
    try {
      const response = await marketplaceService.relist(item.id, { acceptTerms: true, termsVersion: terms.version });
      toast.success(response.data.message || translateCatalogKey('marketplace.listing.relistStarted'));
      await loadShop();
      await editListing(response.data.data);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('marketplace.listing.relistFailed'), { context: 'marketplace.relist' });
    } finally { setShopActionId(null); }
  };

  const toggleFavorite = async (item) => {
    try {
      const result = (await marketplaceService.toggleFavorite(item.id)).data.data;
      const patchItem = (current) => current.id === item.id ? { ...current, isFavorite: result.isFavorite, favoriteCount: result.count } : current;
      setItems((current) => current.map(patchItem)); setSelectedItem((current) => current ? patchItem(current) : current);
    } catch (error) { toast.apiError(error, "Không thể cập nhật sản phẩm đã lưu.", { context: "marketplace.favorite" }); }
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
  const contactSeller = async () => {
    if (!selectedItem || selectedItem.isOwner || selectedItem.sellerId === user?.id) return;
    setContacting(true);
    try {
      const response = await marketplaceService.contactSeller(selectedItem.id);
      const sellerId = response.data?.data?.sellerId || selectedItem.sellerId;
      closeItem();
      navigate(`/messages/${sellerId}`);
      toast.success(response.data?.message || 'Đã mở cuộc trò chuyện với người bán.');
    } catch (error) {
      toast.apiError(error, 'Không thể liên hệ người bán.', { context: 'marketplace.contact' });
    } finally {
      setContacting(false);
    }
  };

  const selectedItemIsOwner = Boolean(selectedItem && (selectedItem.isOwner || selectedItem.sellerId === user?.id));

  return (
    <section className="discovery-page discovery-page--wide marketplace-page">
      <header className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <Badge variant="secondary"><ShoppingBag /> {translateCatalogKey('ui.pages.discovery.marketplacepage.cho-cong-ong.fba5c6ac')}</Badge>
          <h1>{translateCatalogKey('ui.pages.discovery.marketplacepage.mua-ban-gan-ban-ro-rang-va-de-dang.dd1eaf31')}</h1>
          <p>{translateCatalogKey('ui.pages.discovery.marketplacepage.kham-pha-mat-hang-a-kiem-duyet-xem-a.ccb9cf38')}</p>
          <div className="marketplace-hero-stats"><span><strong>{items.length}</strong> {translateCatalogKey('ui.pages.discovery.marketplacepage.mat-hang-ang-hien-thi.77a69f49')}</span><span><ShieldCheck /> {translateCatalogKey('ui.pages.discovery.marketplacepage.khong-thu-hoa-hong-giao-dich.9a6c23c8')}</span></div>
        </div>
        <div className="marketplace-hero-actions"><Button variant="outline" size="lg" onClick={openShop}><Store /> {translateCatalogKey('ui.pages.discovery.marketplacepage.gian-hang-cua-toi.0ffd0247')}</Button><Button size="lg" onClick={openNewListing}><Tag /> {translateCatalogKey('ui.pages.discovery.marketplacepage.ang-mat-hang.f3b85fa4')}</Button></div>
      </header>

      <section className="marketplace-toolbar" aria-labelledby="marketplace-search-title">
        <div className="marketplace-section-title"><span><SlidersHorizontal /></span><div><h2 id="marketplace-search-title">{translateCatalogKey('ui.pages.discovery.marketplacepage.tim-mat-hang.53dee24a')}</h2><p>{translateCatalogKey('ui.pages.discovery.marketplacepage.tim-theo-ten-san-pham-nguoi-ban-hoac.eae31587')}</p></div></div>
        <label className="discovery-search marketplace-search"><Search size={18} /><Input aria-label={translateCatalogKey('ui.pages.discovery.marketplacepage.tim-kiem-marketplace.2b139963')} placeholder={translateCatalogKey('ui.pages.discovery.marketplacepage.vi-du-macbook-quan-1.213ed6f2')} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="marketplace-filter-label">{translateCatalogKey('ui.pages.discovery.marketplacepage.danh-muc-san-pham.4c246ef8')}</div>
        <div className="discovery-categories marketplace-categories">{categories.map((item) => <Button size="sm" key={item} variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>)}</div>
      </section>

      <div className="marketplace-results-heading"><div><span className="marketplace-heading-icon"><Sparkles /></span><div><h2>{translateCatalogKey('ui.pages.discovery.marketplacepage.san-pham-danh-cho-ban.f0f15b53')}</h2><p>{translateCatalogKey('ui.pages.discovery.marketplacepage.chi-hien-thi-mat-hang-a-qua-kiem-duy.43a68ee4')}</p></div></div><Badge variant="outline">{filteredItems.length} {translateCatalogKey('ui.pages.discovery.marketplacepage.san-pham.ffbd4a98')}</Badge></div>
      {loading ? <Card className="discovery-empty-card"><CardContent><Loader2 className="animate-spin" /> {translateCatalogKey('ui.pages.discovery.marketplacepage.ang-tai-marketplace.75a76560')}</CardContent></Card> : filteredItems.length > 0 ? (
        <div className="marketplace-grid">{filteredItems.map((item) => (
          <Card className="marketplace-card" key={item.id} role="button" tabIndex={0} onClick={() => openItem(item)} onKeyDown={(event) => { if (event.key === 'Enter') openItem(item); }}>
            <div className="marketplace-image-wrap"><img src={getImageUrl(item.imageUrl)} alt={item.title} loading="lazy" /><Badge className="marketplace-condition-badge" variant="secondary">{item.condition}</Badge><button type="button" className={`marketplace-favorite${item.isFavorite ? ' marketplace-favorite--active' : ''}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(item); }} aria-label={translateCatalogKey('ui.pages.discovery.marketplacepage.luu-san-pham.21e6c3be')}><Heart fill={item.isFavorite ? 'currentColor' : 'none'} /></button></div>
            <CardContent className="marketplace-card-content"><span className="marketplace-field-label">{translateCatalogKey('ui.pages.discovery.marketplacepage.gia-ban.7aa6c5e9')}</span><strong className="marketplace-price">{formatPrice(item.price)}</strong><h3>{item.title}</h3><div className="marketplace-card-location"><MapPin /><span><small>{translateCatalogKey('ui.pages.discovery.marketplacepage.khu-vuc.6252a860')}</small>{item.location}</span></div><div className="marketplace-card-footer"><span><UserRound /> {item.sellerName}</span><span>{new Date(item.createdAt).toLocaleDateString('vi-VN')} <ArrowUpRight /></span></div></CardContent>
          </Card>
        ))}</div>
      ) : <Card className="discovery-empty-card"><CardContent><PackageCheck /><p>{translateCatalogKey('ui.pages.discovery.marketplacepage.khong-tim-thay-san-pham-phu-hop.02550dfb')}</p></CardContent></Card>}

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && closeItem()}>
        <DialogContent className="marketplace-dialog sm:max-w-4xl">{selectedItem && <div className="marketplace-dialog-layout">
          <div className="marketplace-dialog-media"><img src={getImageUrl(selectedItem.imageUrl)} alt={selectedItem.title} /><Badge>{selectedItem.category}</Badge></div>
          <div className="marketplace-dialog-body"><DialogHeader><div className="marketplace-dialog-kicker">{translateCatalogKey('ui.pages.discovery.marketplacepage.chi-tiet-mat-hang-a-kiem-duyet.99a86fb8')}</div><DialogTitle>{selectedItem.title}</DialogTitle><DialogDescription>{translateCatalogKey('ui.pages.discovery.marketplacepage.ang-ngay.d3a2a66e')} {new Date(selectedItem.createdAt).toLocaleDateString('vi-VN')} {translateCatalogKey('ui.pages.discovery.marketplacepage.tai.2506d938')} {selectedItem.location}</DialogDescription></DialogHeader>
            <div className="marketplace-dialog-price-panel"><span>{translateCatalogKey('ui.pages.discovery.marketplacepage.gia-nguoi-ban-e-xuat.e2e2b769')}</span><strong>{formatPrice(selectedItem.price)}</strong></div>
            <section className="marketplace-dialog-section"><h3>{translateCatalogKey('ui.pages.discovery.marketplacepage.mo-ta-san-pham.925518eb')}</h3><p>{selectedItem.description}</p></section>
            <div className="marketplace-detail-grid"><div><ShoppingBag /><span><small>{translateCatalogKey('ui.pages.admin.adminmarketplace.danh-muc.7b6a7c7c')}</small><strong>{selectedItem.category}</strong></span></div><div><ShieldCheck /><span><small>{translateCatalogKey('ui.pages.discovery.marketplacepage.tinh-trang.74ef7b01')}</small><strong>{selectedItem.condition}</strong></span></div><div><MapPin /><span><small>{translateCatalogKey('ui.pages.discovery.marketplacepage.khu-vuc.6252a860')}</small><strong>{selectedItem.location}</strong></span></div><div><CalendarDays /><span><small>{translateCatalogKey('ui.pages.discovery.marketplacepage.luot-xem.e55f6dfe')}</small><strong>{selectedItem.viewCount}</strong></span></div></div>
            <div className="marketplace-seller-card"><div className="marketplace-seller-avatar">{selectedItem.sellerName?.charAt(0)}</div><div><small>{translateCatalogKey('ui.pages.discovery.marketplacepage.nguoi-ban.f646cc19')}</small><strong>{selectedItem.sellerName}</strong><span>{translateCatalogKey('ui.pages.discovery.marketplacepage.giao-dich-qua-lien-he-truc-tiep.efe7416b')}</span></div><ShieldCheck /></div>
            <DialogFooter className="marketplace-dialog-actions">{selectedItemIsOwner ? <Button onClick={() => { closeItem(); openShop(); }}><Store /> {translateCatalogKey('ui.pages.discovery.marketplacepage.gian-hang-cua-toi.0ffd0247')}</Button> : <><Button variant="outline" onClick={() => toggleFavorite(selectedItem)}><Heart fill={selectedItem.isFavorite ? 'currentColor' : 'none'} />{selectedItem.isFavorite ? translateCatalogKey('post.saved') : "Lưu sản phẩm"}</Button><Button onClick={contactSeller} disabled={contacting}>{contacting ? <Loader2 className="animate-spin" /> : <MessageCircle />} {translateCatalogKey('ui.pages.discovery.marketplacepage.lien-he-nguoi-ban.8c669b8e')}</Button></>}</DialogFooter>
            {!selectedItemIsOwner && <Button variant="ghost" className="marketplace-report-button" onClick={() => setReportOpen(true)}><Flag /> {translateCatalogKey('ui.pages.discovery.marketplacepage.bao-cao-mat-hang.8326c251')}</Button>}
            <p className="marketplace-safety-note"><ShieldCheck /> {translateCatalogKey('ui.pages.discovery.marketplacepage.khong-chuyen-tien-truoc-khi-xac-minh.85640d0a')}</p>
          </div>
        </div>}</DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(value) => !submitting && setCreateOpen(value)}><DialogContent className="marketplace-create-dialog sm:max-w-3xl"><form onSubmit={submitListing}>
        <DialogHeader><div className="marketplace-create-heading"><span><ImagePlus /></span><div><DialogTitle>{editingListing ? 'Chỉnh sửa mặt hàng' : translateCatalogKey('ui.pages.discovery.marketplacepage.ang-mat-hang-moi.ad78a2c9')}</DialogTitle><DialogDescription>{translateCatalogKey('marketplace.draft.workflowDescription')}</DialogDescription></div></div></DialogHeader>
        <div className="marketplace-create-grid"><label className="marketplace-image-drop"><input type="file" accept="image/png,image/jpeg,image/gif" onChange={(event) => chooseImage(event.target.files?.[0])} />{preview ? <img src={preview} alt={translateCatalogKey('ui.pages.discovery.marketplacepage.xem-truoc-san-pham.55bb3d71')} /> : <><ImagePlus /><strong>{translateCatalogKey('ui.pages.discovery.marketplacepage.them-anh-san-pham.1de94419')}</strong><span>{translateCatalogKey('ui.pages.discovery.marketplacepage.png-jpg-gif-toi-a-10-mb.ec95c88f')}</span></>}</label>
          <div className="marketplace-create-fields"><div className="grid gap-2"><Label htmlFor="listing-title">{translateCatalogKey('ui.pages.discovery.marketplacepage.ten-mat-hang.389c8aef')}</Label><Input id="listing-title" value={form.title} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} maxLength={160} required /></div><div className="grid gap-2"><Label htmlFor="listing-price">{translateCatalogKey('ui.pages.discovery.marketplacepage.gia-ban.cc86cfad')}</Label><Input id="listing-price" type="number" min="1" value={form.price} onChange={(e) => setForm((x) => ({ ...x, price: e.target.value }))} required /></div><div className="marketplace-create-row"><div><Label>{translateCatalogKey('ui.pages.admin.adminmarketplace.danh-muc.7b6a7c7c')}</Label><Select value={form.category} onValueChange={(value) => setForm((x) => ({ ...x, category: value }))}><SelectTrigger><SelectValue placeholder={translateCatalogKey('ui.pages.discovery.marketplacepage.chon-danh-muc.19cd16f2')} /></SelectTrigger><SelectContent>{CATEGORIES.slice(1).map((x) => <SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>{translateCatalogKey('marketplace.listing.productCondition')}</Label><Select value={form.condition} onValueChange={(value) => setForm((x) => ({ ...x, condition: value }))}><SelectTrigger><SelectValue placeholder={translateCatalogKey('ui.pages.discovery.marketplacepage.chon-tinh-trang.d0d3dc4a')} /></SelectTrigger><SelectContent>{CONDITIONS.map((x) => <SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-2"><Label htmlFor="listing-location">{translateCatalogKey('ui.pages.discovery.marketplacepage.khu-vuc.6252a860')}</Label><Input id="listing-location" value={form.location} onChange={(e) => setForm((x) => ({ ...x, location: e.target.value }))} required /></div></div></div>
        <div className="grid gap-2"><Label htmlFor="listing-description">{translateCatalogKey('ui.pages.discovery.marketplacepage.mo-ta-chi-tiet.1ac03d2d')}</Label><Textarea id="listing-description" value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} minLength={10} maxLength={3000} required /></div>
        {editingListing && <section className="marketplace-edit-policy" aria-labelledby="marketplace-edit-policy-title">
          <div className="marketplace-edit-policy__heading"><Pencil /><div><h3 id="marketplace-edit-policy-title">{translateCatalogKey('marketplace.listing.editPolicyTitle')}</h3><p>{editingListing.status === MarketplaceListingStatus.AwaitingPayment ? translateCatalogKey('marketplace.listing.editPolicyBeforePayment') : translateCatalogKey('marketplace.listing.editPolicyAfterPayment')}</p></div></div>
          <div className="marketplace-edit-policy__rules"><div><Badge variant="outline">{translateCatalogKey('marketplace.listing.editableFieldsLabel')}</Badge><span>{translateCatalogKey('marketplace.listing.editableFields')}</span></div><div><Badge variant="secondary">{translateCatalogKey('marketplace.listing.lockedFieldsLabel')}</Badge><span>{translateCatalogKey('marketplace.listing.lockedFields')}</span></div></div>
        </section>}
        <div className="marketplace-fee-box"><WalletCards /><div><strong>{translateCatalogKey('ui.pages.discovery.marketplacepage.phi-trung-bay.13282c06')} {formatPrice(editingListing?.displayFee ?? selectedCategoryFee)}</strong><span>{form.category ? `Mức phí áp dụng cho danh mục ${form.category}. ` : ''}{translateCatalogKey('marketplace.payment.feePolicy')}</span></div></div>
        <section className="marketplace-payment-box" aria-labelledby="marketplace-payment-title">
          <div className="marketplace-payment-heading"><span><Banknote /></span><div><h3 id="marketplace-payment-title">{translateCatalogKey('marketplace.payment.title')}</h3><p>{translateCatalogKey('marketplace.payment.subtitle')}</p></div></div>
          {!terms.payment?.isConfigured ? <div className="marketplace-payment-message marketplace-payment-message--warning"><CircleAlert /><div><strong>{translateCatalogKey('marketplace.payment.notConfigured')}</strong><span>{translateCatalogKey('marketplace.payment.contactAdmin')} {terms.payment?.supportEmail || ''}</span></div></div> : !editingListing ? <div className="marketplace-payment-message"><CircleAlert /><div><strong>{translateCatalogKey('marketplace.draft.saveFirstTitle')}</strong><span>{translateCatalogKey('marketplace.draft.saveFirstDescription')}</span></div></div> : editingListing.status !== MarketplaceListingStatus.AwaitingPayment ? <div className="marketplace-payment-message marketplace-payment-message--success"><CircleCheck /><div><strong>{translateCatalogKey('marketplace.listing.paidEditTitle')}</strong><span>{translateCatalogKey('marketplace.listing.paidEditDescription')}</span></div></div> : !paymentTransaction ? <div className="marketplace-payment-start"><div><span>{translateCatalogKey('marketplace.payment.amount')}</span><strong>{formatPrice(editingListing.displayFee || terms.displayFee)}</strong><small>{terms.payment.bankName} · {terms.payment.accountNumber}</small></div><Button type="button" onClick={() => createPayment(editingListing.id)} disabled={paymentBusy}>{paymentBusy ? <Loader2 className="animate-spin" /> : <Banknote />} {translateCatalogKey('marketplace.payment.createQr')}</Button></div> : <div className="marketplace-payment-transaction">
            <div className="marketplace-payment-state"><Badge variant={[MarketplacePaymentStatus.Succeeded, MarketplacePaymentStatus.Consumed].includes(paymentTransaction.status) ? 'default' : 'outline'}>{paymentTransaction.status === MarketplacePaymentStatus.Pending ? translateCatalogKey('marketplace.payment.pending') : paymentTransaction.status === MarketplacePaymentStatus.AwaitingVerification ? translateCatalogKey('marketplace.payment.awaiting') : [MarketplacePaymentStatus.Succeeded, MarketplacePaymentStatus.Consumed].includes(paymentTransaction.status) ? translateCatalogKey('marketplace.payment.succeeded') : translateCatalogKey('marketplace.payment.failed')}</Badge><span>{translateCatalogKey('marketplace.payment.transactionId')}: {paymentTransaction.id}</span></div>
            {paymentTransaction.status === MarketplacePaymentStatus.Pending && <div className="marketplace-payment-qr-layout"><div className="marketplace-payment-qr"><img src={paymentTransaction.qrImageUrl} alt={translateCatalogKey('marketplace.payment.qrAlt')} /></div><div className="marketplace-payment-details"><div><span>{translateCatalogKey('marketplace.payment.amount')}</span><strong>{formatPrice(paymentTransaction.amount)}</strong></div><div><span>{translateCatalogKey('marketplace.payment.bankAccount')}</span><strong>{paymentTransaction.payment.bankName}</strong><button type="button" onClick={() => copyPaymentValue(paymentTransaction.payment.accountNumber)}>{paymentTransaction.payment.accountNumber}<Copy /></button><small>{paymentTransaction.payment.accountName}</small></div><div><span>{translateCatalogKey('marketplace.payment.transferContent')}</span><button type="button" onClick={() => copyPaymentValue(paymentTransaction.referenceCode)}>{paymentTransaction.referenceCode}<Copy /></button></div><p>{translateCatalogKey('marketplace.payment.expiresAt')} {new Date(paymentTransaction.expiresAt).toLocaleString('vi-VN')}</p><Button type="button" onClick={submitPayment} disabled={paymentBusy}>{paymentBusy ? <Loader2 className="animate-spin" /> : <CircleCheck />} {translateCatalogKey('marketplace.payment.transferred')}</Button></div></div>}
            {paymentTransaction.status === MarketplacePaymentStatus.AwaitingVerification && <div className="marketplace-payment-message"><Loader2 className="animate-spin" /><div><strong>{translateCatalogKey('marketplace.payment.awaitingTitle')}</strong><span>{translateCatalogKey('marketplace.payment.awaitingDescription')}</span><Button type="button" size="sm" variant="outline" onClick={refreshPayment} disabled={paymentBusy}>{translateCatalogKey('marketplace.payment.checkStatus')}</Button></div></div>}
            {[MarketplacePaymentStatus.Succeeded, MarketplacePaymentStatus.Consumed].includes(paymentTransaction.status) && <div className="marketplace-payment-message marketplace-payment-message--success"><CircleCheck /><div><strong>{translateCatalogKey('marketplace.payment.successTitle')}</strong><span>{translateCatalogKey('marketplace.draft.autoSubmitted')}</span></div></div>}
            {[MarketplacePaymentStatus.Failed, MarketplacePaymentStatus.Cancelled].includes(paymentTransaction.status) && <div className="marketplace-payment-message marketplace-payment-message--error"><CircleAlert /><div><strong>{translateCatalogKey('marketplace.payment.failureTitle')}</strong><span>{paymentTransaction.failureReason || translateCatalogKey('marketplace.payment.failureDescription')}</span><a href={`mailto:${paymentTransaction.payment?.supportEmail}`}>{translateCatalogKey('marketplace.payment.contactAdmin')} {paymentTransaction.payment?.supportEmail}</a><Button type="button" size="sm" variant="outline" onClick={() => { setPaymentTransaction(null); createPayment(); }} disabled={paymentBusy}>{translateCatalogKey('marketplace.payment.tryAgain')}</Button></div></div>}
          </div>}
        </section>
        <label className="marketplace-terms-check"><Checkbox checked={form.acceptTerms} onCheckedChange={(value) => setForm((x) => ({ ...x, acceptTerms: Boolean(value) }))} /><span>{translateCatalogKey('ui.pages.discovery.marketplacepage.toi-a-oc-va-ong-y.842c3e12')} <button type="button" onClick={() => setTermsOpen(true)}>{translateCatalogKey('ui.pages.discovery.marketplacepage.ieu-khoan-trung-bay-phien-ban.5845f5cf')} {terms.version}</button>.</span></label>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>{translateCatalogKey('common.cancel')}</Button><Button type="submit" disabled={submitting || paymentTransaction?.status === MarketplacePaymentStatus.AwaitingVerification}>{submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {editingListing ? translateCatalogKey('marketplace.listing.saveChanges') : translateCatalogKey('marketplace.listing.saveDraft')}</Button></DialogFooter>
      </form></DialogContent></Dialog>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}><DialogContent className="marketplace-terms-dialog sm:max-w-3xl"><DialogHeader><DialogTitle><FileText /> {translateCatalogKey('ui.pages.discovery.marketplacepage.ieu-khoan-marketplace.76aefd32')}</DialogTitle><DialogDescription>{translateCatalogKey('ui.pages.discovery.marketplacepage.phien-ban-bat-buoc-khi-gui-mat-hang-.201180a8')}</DialogDescription></DialogHeader><article>{termsMarkdown}</article><DialogFooter><Button onClick={() => { setForm((x) => ({ ...x, acceptTerms: true })); setTermsOpen(false); }}>{translateCatalogKey('ui.pages.discovery.marketplacepage.toi-a-oc-va-ong-y.842c3e12')}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}><DialogContent className="marketplace-shop-dialog sm:max-w-4xl"><DialogHeader><DialogTitle><Store /> {translateCatalogKey('ui.pages.discovery.marketplacepage.gian-hang-cua-toi.0ffd0247')}</DialogTitle><DialogDescription>{translateCatalogKey('ui.pages.discovery.marketplacepage.thong-ke-hieu-qua-trung-bay-va-trang.274bb343')}</DialogDescription></DialogHeader>
        {stats ? <div className="marketplace-stat-grid">{[["Tổng mặt hàng", stats.total], ["Đang hiển thị", stats.active], ["Chờ duyệt", stats.pending], ["Đã bán", stats.sold], ["Lượt xem", stats.views], ["Lượt lưu", stats.favorites], [translateCatalogKey('common.report'), stats.reports], ["Phí trưng bày", formatPrice(stats.displayFees)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : <Loader2 className="animate-spin" />}
        <div className="marketplace-shop-list">{myListings.map((item) => <article key={item.id}><img src={getImageUrl(item.imageUrl)} alt="" /><div><strong>{item.title}</strong><span>{formatPrice(item.price)} · {STATUS_LABELS[item.status]}</span>{item.moderationNote && <small>{item.moderationNote}</small>}</div><div className="marketplace-shop-actions">{![MarketplaceListingStatus.Sold, MarketplaceListingStatus.Removed].includes(item.status) && <Button size="sm" variant="outline" onClick={() => editListing(item)}><Pencil /> {item.status === MarketplaceListingStatus.AwaitingPayment ? translateCatalogKey('marketplace.listing.continuePayment') : translateCatalogKey('marketplace.listing.edit')}</Button>}{item.status === MarketplaceListingStatus.Approved && <Button size="sm" variant="outline" disabled={shopActionId === item.id} onClick={() => markListingSold(item)}>{shopActionId === item.id ? <Loader2 className="animate-spin" /> : <PackageCheck />} {translateCatalogKey('ui.pages.discovery.marketplacepage.anh-dau-a-ban.3820ffce')}</Button>}{item.status === MarketplaceListingStatus.Sold && <Button size="sm" variant="outline" disabled={shopActionId === item.id} onClick={() => relistListing(item)}>{shopActionId === item.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} {translateCatalogKey('marketplace.listing.relist')}</Button>}{item.status !== MarketplaceListingStatus.Removed && <Button size="sm" variant="destructive" onClick={() => withdrawListing(item)}><Trash2 /> {translateCatalogKey('marketplace.listing.withdraw')}</Button>}</div></article>)}</div>
      </DialogContent></Dialog>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType={ModerationTargetType.MarketplaceListing} targetId={selectedItem?.id} targetLabel="mặt hàng này" />
    </section>
  );
};

export default MarketplacePage;
