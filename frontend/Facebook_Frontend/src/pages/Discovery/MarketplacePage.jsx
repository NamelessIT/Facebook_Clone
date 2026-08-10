import { useMemo, useState } from 'react';
import { Heart, MapPin, Search, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import toast from '../../shared/appToast';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import './DiscoveryPages.css';

const CATEGORIES = ['Tất cả', 'Xe cộ', 'Nhà đất', 'Điện tử', 'Đồ gia dụng', 'Thời trang', 'Giải trí'];

const MARKETPLACE_ITEMS = [
  { id: 1, title: 'MacBook Air M2 13 inch', price: 18700000, category: 'Điện tử', location: 'Quận 1, TP.HCM', image: 'https://picsum.photos/seed/fb-market-01/720/520', condition: 'Đã qua sử dụng - như mới' },
  { id: 2, title: 'Honda Vision 2024', price: 32900000, category: 'Xe cộ', location: 'Thủ Đức, TP.HCM', image: 'https://picsum.photos/seed/fb-market-02/720/520', condition: 'Đã qua sử dụng - tốt' },
  { id: 3, title: 'Căn hộ studio đầy đủ nội thất', price: 6500000, category: 'Nhà đất', location: 'Bình Thạnh, TP.HCM', image: 'https://picsum.photos/seed/fb-market-03/720/520', condition: 'Cho thuê theo tháng' },
  { id: 4, title: 'Máy ảnh Fujifilm X-S10', price: 15400000, category: 'Điện tử', location: 'Hải Châu, Đà Nẵng', image: 'https://picsum.photos/seed/fb-market-04/720/520', condition: 'Đã qua sử dụng - như mới' },
  { id: 5, title: 'Bàn làm việc gỗ tối giản', price: 1250000, category: 'Đồ gia dụng', location: 'Cầu Giấy, Hà Nội', image: 'https://picsum.photos/seed/fb-market-05/720/520', condition: 'Mới' },
  { id: 6, title: 'Áo khoác denim unisex', price: 420000, category: 'Thời trang', location: 'Quận 3, TP.HCM', image: 'https://picsum.photos/seed/fb-market-06/720/520', condition: 'Mới' },
  { id: 7, title: 'Nintendo Switch OLED', price: 6850000, category: 'Giải trí', location: 'Ninh Kiều, Cần Thơ', image: 'https://picsum.photos/seed/fb-market-07/720/520', condition: 'Đã qua sử dụng - tốt' },
  { id: 8, title: 'Ghế công thái học', price: 2850000, category: 'Đồ gia dụng', location: 'Quận 7, TP.HCM', image: 'https://picsum.photos/seed/fb-market-08/720/520', condition: 'Mới' },
  { id: 9, title: 'iPhone 15 Pro 256GB', price: 22900000, category: 'Điện tử', location: 'Hoàn Kiếm, Hà Nội', image: 'https://picsum.photos/seed/fb-market-09/720/520', condition: 'Đã qua sử dụng - như mới' },
  { id: 10, title: 'Xe đạp địa hình Giant', price: 4900000, category: 'Xe cộ', location: 'Biên Hòa, Đồng Nai', image: 'https://picsum.photos/seed/fb-market-10/720/520', condition: 'Đã qua sử dụng - tốt' },
  { id: 11, title: 'Bộ loa bookshelf Edifier', price: 3100000, category: 'Giải trí', location: 'Quận 10, TP.HCM', image: 'https://picsum.photos/seed/fb-market-11/720/520', condition: 'Đã qua sử dụng - như mới' },
  { id: 12, title: 'Túi đeo chéo da thủ công', price: 780000, category: 'Thời trang', location: 'Hội An, Quảng Nam', image: 'https://picsum.photos/seed/fb-market-12/720/520', condition: 'Mới' },
];

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
      const matchesQuery = !normalizedQuery || `${item.title} ${item.location}`.toLocaleLowerCase('vi').includes(normalizedQuery);
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

  return (
    <section className="discovery-page discovery-page--wide">
      <div className="discovery-hero">
        <div>
          <Badge variant="secondary"><ShoppingBag /> Marketplace</Badge>
          <h1>Khám phá Marketplace</h1>
          <p>Tìm sản phẩm phù hợp từ cộng đồng quanh bạn.</p>
        </div>
        <Button onClick={() => toast('Tính năng đăng bán sẽ sẵn sàng khi backend Marketplace được kết nối.')}><Tag /> Đăng mặt hàng</Button>
      </div>

      <div className="discovery-search">
        <Search size={18} />
        <Input aria-label="Tìm kiếm Marketplace" placeholder="Tìm sản phẩm hoặc địa điểm" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="discovery-categories" aria-label="Danh mục Marketplace">
        {CATEGORIES.map((item) => (
          <Button key={item} variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>
        ))}
      </div>

      <div className="marketplace-results-heading">
        <div><Sparkles size={18} /><strong>Gợi ý hôm nay</strong></div>
        <span>{filteredItems.length} sản phẩm</span>
      </div>

      {filteredItems.length > 0 ? (
        <div className="marketplace-grid">
          {filteredItems.map((item) => (
            <Card className="marketplace-card" key={item.id} onClick={() => setSelectedItem(item)}>
              <div className="marketplace-image-wrap">
                <img src={item.image} alt={item.title} loading="lazy" />
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
                <strong className="marketplace-price">{formatPrice(item.price)}</strong>
                <h2>{item.title}</h2>
                <p><MapPin size={14} /> {item.location}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="discovery-empty-card">
          <CardContent><p>Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa hoặc danh mục khác.</p></CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="marketplace-dialog sm:max-w-lg">
          {selectedItem && (
            <>
              <img className="marketplace-dialog-image" src={selectedItem.image} alt={selectedItem.title} />
              <DialogHeader>
                <Badge variant="outline">{selectedItem.category}</Badge>
                <DialogTitle>{selectedItem.title}</DialogTitle>
                <DialogDescription>{selectedItem.condition} · {selectedItem.location}</DialogDescription>
              </DialogHeader>
              <strong className="marketplace-dialog-price">{formatPrice(selectedItem.price)}</strong>
              <DialogFooter>
                <Button variant="outline" onClick={() => toggleFavorite(selectedItem.id)}>
                  <Heart fill={favoriteIds.has(selectedItem.id) ? 'currentColor' : 'none'} />
                  {favoriteIds.has(selectedItem.id) ? 'Đã lưu' : 'Lưu sản phẩm'}
                </Button>
                <Button onClick={() => toast.success('Đã gửi yêu cầu liên hệ người bán.')}>Liên hệ người bán</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MarketplacePage;
