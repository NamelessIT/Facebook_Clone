import { useMemo, useState } from 'react';
import {
  ArrowUpRight, CalendarDays, Heart, MapPin, MessageCircle, Search,
  ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Tag, UserRound,
} from 'lucide-react';
import toast from '../../shared/appToast';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import './DiscoveryPages.css';

const CATEGORIES = ['Tất cả', 'Xe cộ', 'Nhà đất', 'Điện tử', 'Đồ gia dụng', 'Thời trang', 'Giải trí'];
const SELLERS = ['Minh Anh', 'Hoàng Nam', 'Thảo Vy', 'Gia Huy', 'Ngọc Linh', 'Tuấn Phong'];

const MARKETPLACE_ITEMS = [
  { id: 1, title: 'MacBook Air M2 13 inch', price: 18700000, category: 'Điện tử', location: 'Quận 1, TP.HCM', image: 'https://picsum.photos/seed/fb-market-01/900/680', condition: 'Đã qua sử dụng - như mới' },
  { id: 2, title: 'Honda Vision 2024', price: 32900000, category: 'Xe cộ', location: 'Thủ Đức, TP.HCM', image: 'https://picsum.photos/seed/fb-market-02/900/680', condition: 'Đã qua sử dụng - tốt' },
  { id: 3, title: 'Căn hộ studio đầy đủ nội thất', price: 6500000, category: 'Nhà đất', location: 'Bình Thạnh, TP.HCM', image: 'https://picsum.photos/seed/fb-market-03/900/680', condition: 'Cho thuê theo tháng' },
  { id: 4, title: 'Máy ảnh Fujifilm X-S10', price: 15400000, category: 'Điện tử', location: 'Hải Châu, Đà Nẵng', image: 'https://picsum.photos/seed/fb-market-04/900/680', condition: 'Đã qua sử dụng - như mới' },
  { id: 5, title: 'Bàn làm việc gỗ tối giản', price: 1250000, category: 'Đồ gia dụng', location: 'Cầu Giấy, Hà Nội', image: 'https://picsum.photos/seed/fb-market-05/900/680', condition: 'Mới' },
  { id: 6, title: 'Áo khoác denim unisex', price: 420000, category: 'Thời trang', location: 'Quận 3, TP.HCM', image: 'https://picsum.photos/seed/fb-market-06/900/680', condition: 'Mới' },
  { id: 7, title: 'Nintendo Switch OLED', price: 6850000, category: 'Giải trí', location: 'Ninh Kiều, Cần Thơ', image: 'https://picsum.photos/seed/fb-market-07/900/680', condition: 'Đã qua sử dụng - tốt' },
  { id: 8, title: 'Ghế công thái học', price: 2850000, category: 'Đồ gia dụng', location: 'Quận 7, TP.HCM', image: 'https://picsum.photos/seed/fb-market-08/900/680', condition: 'Mới' },
  { id: 9, title: 'iPhone 15 Pro 256GB', price: 22900000, category: 'Điện tử', location: 'Hoàn Kiếm, Hà Nội', image: 'https://picsum.photos/seed/fb-market-09/900/680', condition: 'Đã qua sử dụng - như mới' },
  { id: 10, title: 'Xe đạp địa hình Giant', price: 4900000, category: 'Xe cộ', location: 'Biên Hòa, Đồng Nai', image: 'https://picsum.photos/seed/fb-market-10/900/680', condition: 'Đã qua sử dụng - tốt' },
  { id: 11, title: 'Bộ loa bookshelf Edifier', price: 3100000, category: 'Giải trí', location: 'Quận 10, TP.HCM', image: 'https://picsum.photos/seed/fb-market-11/900/680', condition: 'Đã qua sử dụng - như mới' },
  { id: 12, title: 'Túi đeo chéo da thủ công', price: 780000, category: 'Thời trang', location: 'Hội An, Quảng Nam', image: 'https://picsum.photos/seed/fb-market-12/900/680', condition: 'Mới' },
].map((item, index) => ({
  ...item,
  seller: SELLERS[index % SELLERS.length],
  postedAt: `${(index % 6) + 1} giờ trước`,
  description: `${item.title} được người bán mô tả đúng tình trạng, có thể trao đổi thêm hình ảnh và thông tin giao nhận trước khi quyết định.`,
}));

const formatPrice = (value) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
const FAVORITES_STORAGE_PREFIX = 'facebook-clone:marketplace-favorites';

const readFavoriteIds = (storageKey) => {
  if (typeof window === 'undefined') return new Set();
  try {
    const storedIds = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return new Set(Array.isArray(storedIds) ? storedIds.filter(Number.isInteger) : []);
  } catch {
    return new Set();
  }
};

const MarketplacePage = () => {
  const { user } = useAuth();
  const favoritesStorageKey = `${FAVORITES_STORAGE_PREFIX}:${user?.id || 'guest'}`;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [favoriteIds, setFavoriteIds] = useState(() => readFavoriteIds(favoritesStorageKey));
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return MARKETPLACE_ITEMS.filter((item) => {
      const matchesCategory = category === 'Tất cả' || item.category === category;
      const matchesQuery = !normalizedQuery || `${item.title} ${item.location} ${item.seller}`.toLocaleLowerCase('vi').includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const toggleFavorite = (itemId) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      try {
        window.localStorage.setItem(favoritesStorageKey, JSON.stringify([...next]));
      } catch {
        toast.error('Không thể lưu sản phẩm trên trình duyệt này.');
      }
      return next;
    });
  };

  const openItem = (item) => setSelectedItem(item);

  return (
    <section className="discovery-page discovery-page--wide marketplace-page">
      <header className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <Badge variant="secondary"><ShoppingBag /> Chợ cộng đồng</Badge>
          <h1>Mua bán gần bạn, rõ ràng và dễ dàng</h1>
          <p>Khám phá mặt hàng mới mỗi ngày, xem đầy đủ giá, tình trạng và khu vực trước khi liên hệ người bán.</p>
          <div className="marketplace-hero-stats" aria-label="Tổng quan Marketplace">
            <span><strong>{MARKETPLACE_ITEMS.length}</strong> mặt hàng gợi ý</span>
            <span><ShieldCheck /> Ưu tiên giao dịch an toàn</span>
          </div>
        </div>
        <Button size="lg" onClick={() => toast('Tính năng đăng bán sẽ sẵn sàng khi backend Marketplace được kết nối.')}>
          <Tag /> Đăng mặt hàng
        </Button>
      </header>

      <section className="marketplace-toolbar" aria-labelledby="marketplace-search-title">
        <div className="marketplace-section-title">
          <span><SlidersHorizontal /></span>
          <div><h2 id="marketplace-search-title">Tìm mặt hàng</h2><p>Tìm theo tên sản phẩm, người bán hoặc khu vực.</p></div>
        </div>
        <label className="discovery-search marketplace-search">
          <Search size={18} />
          <Input aria-label="Tìm kiếm Marketplace" placeholder="Ví dụ: MacBook, Quận 1, Minh Anh..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="marketplace-filter-label">Danh mục sản phẩm</div>
        <div className="discovery-categories marketplace-categories" aria-label="Danh mục Marketplace">
          {CATEGORIES.map((item) => (
            <Button size="sm" key={item} variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>
          ))}
        </div>
      </section>

      <div className="marketplace-results-heading">
        <div><span className="marketplace-heading-icon"><Sparkles /></span><div><h2>Sản phẩm dành cho bạn</h2><p>Gợi ý mới nhất từ cộng đồng Marketplace.</p></div></div>
        <Badge variant="outline">{filteredItems.length} sản phẩm</Badge>
      </div>

      {filteredItems.length > 0 ? (
        <div className="marketplace-grid">
          {filteredItems.map((item) => (
            <Card
              className="marketplace-card"
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => openItem(item)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openItem(item); }}
            >
              <div className="marketplace-image-wrap">
                <img src={item.image} alt={item.title} loading="lazy" />
                <Badge className="marketplace-condition-badge" variant="secondary">{item.condition}</Badge>
                <button
                  type="button"
                  className={`marketplace-favorite${favoriteIds.has(item.id) ? ' marketplace-favorite--active' : ''}`}
                  aria-label={favoriteIds.has(item.id) ? `Bỏ lưu ${item.title}` : `Lưu ${item.title}`}
                  onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }}
                >
                  <Heart size={18} fill={favoriteIds.has(item.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              <CardContent className="marketplace-card-content">
                <span className="marketplace-field-label">Giá bán</span>
                <strong className="marketplace-price">{formatPrice(item.price)}</strong>
                <h3>{item.title}</h3>
                <div className="marketplace-card-location"><MapPin /> <span><small>Khu vực</small>{item.location}</span></div>
                <div className="marketplace-card-footer">
                  <span><UserRound /> {item.seller}</span>
                  <span>{item.postedAt} <ArrowUpRight /></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="discovery-empty-card"><CardContent><p>Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa hoặc danh mục khác.</p></CardContent></Card>
      )}

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="marketplace-dialog sm:max-w-4xl">
          {selectedItem && (
            <div className="marketplace-dialog-layout">
              <div className="marketplace-dialog-media">
                <img src={selectedItem.image} alt={selectedItem.title} />
                <Badge>{selectedItem.category}</Badge>
              </div>
              <div className="marketplace-dialog-body">
                <DialogHeader>
                  <div className="marketplace-dialog-kicker">Chi tiết mặt hàng</div>
                  <DialogTitle>{selectedItem.title}</DialogTitle>
                  <DialogDescription>Đăng {selectedItem.postedAt} tại {selectedItem.location}</DialogDescription>
                </DialogHeader>

                <div className="marketplace-dialog-price-panel">
                  <span>Giá người bán đề xuất</span>
                  <strong>{formatPrice(selectedItem.price)}</strong>
                </div>

                <section className="marketplace-dialog-section">
                  <h3>Mô tả sản phẩm</h3>
                  <p>{selectedItem.description}</p>
                </section>

                <div className="marketplace-detail-grid">
                  <div><ShoppingBag /><span><small>Danh mục</small><strong>{selectedItem.category}</strong></span></div>
                  <div><ShieldCheck /><span><small>Tình trạng</small><strong>{selectedItem.condition}</strong></span></div>
                  <div><MapPin /><span><small>Khu vực</small><strong>{selectedItem.location}</strong></span></div>
                  <div><CalendarDays /><span><small>Thời gian đăng</small><strong>{selectedItem.postedAt}</strong></span></div>
                </div>

                <div className="marketplace-seller-card">
                  <div className="marketplace-seller-avatar">{selectedItem.seller.charAt(0)}</div>
                  <div><small>Người bán</small><strong>{selectedItem.seller}</strong><span>Phản hồi nhanh trên Facebook Clone</span></div>
                  <ShieldCheck aria-label="Người bán đã xác thực" />
                </div>

                <DialogFooter className="marketplace-dialog-actions">
                  <Button variant="outline" onClick={() => toggleFavorite(selectedItem.id)}>
                    <Heart fill={favoriteIds.has(selectedItem.id) ? 'currentColor' : 'none'} />
                    {favoriteIds.has(selectedItem.id) ? 'Đã lưu sản phẩm' : 'Lưu sản phẩm'}
                  </Button>
                  <Button onClick={() => toast.success('Đã gửi yêu cầu liên hệ người bán.')}><MessageCircle /> Liên hệ người bán</Button>
                </DialogFooter>
                <p className="marketplace-safety-note"><ShieldCheck /> Không chuyển tiền trước khi xác minh sản phẩm và người bán.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MarketplacePage;
