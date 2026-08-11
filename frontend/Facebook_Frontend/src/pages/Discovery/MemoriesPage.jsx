import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Images, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import postService from '../../services/postService';
import PostItem from '../../components/post/PostItem';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import './DiscoveryPages.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const MemoriesPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMemories = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const response = await postService.getUserPosts(user.id, 1, 50);
      setPosts(response.data?.data || []);
    } catch {
      setError(translateCatalogKey('ui.pages.discovery.memoriespage.khong-the-tai-ky-niem-luc-nay-vui-lo.70cfd0b3'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const { exactMemories, recentHighlights } = useMemo(() => {
    const today = new Date();
    const exact = posts.filter((post) => {
      const createdAt = new Date(post.createdAt);
      return createdAt.getFullYear() < today.getFullYear()
        && createdAt.getMonth() === today.getMonth()
        && createdAt.getDate() === today.getDate();
    });
    return { exactMemories: exact, recentHighlights: posts.filter((post) => !exact.includes(post)).slice(0, 3) };
  }, [posts]);

  const displayedPosts = exactMemories.length > 0 ? exactMemories : recentHighlights;
  const todayLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());

  return (
    <section className="discovery-page memories-page">
      <div className="discovery-hero memories-hero">
        <div>
          <Badge variant="secondary"><Clock3 /> {translateCatalogKey('nav.memories')}</Badge>
          <h1>{translateCatalogKey('ui.pages.discovery.memoriespage.on-lai-nhung-khoanh-khac.019e32f9')}</h1>
          <p>{translateCatalogKey('ui.pages.discovery.memoriespage.nhung-bai-viet-ang-nho-cua-ban-uoc-t.19a18778')}</p>
        </div>
        <span className="discovery-date"><CalendarDays /> {todayLabel}</span>
      </div>

      {loading && (
        <Card className="discovery-empty-card">
          <CardHeader><span className="discovery-icon discovery-icon--pulse"><Sparkles /></span><CardTitle>{translateCatalogKey('ui.pages.discovery.memoriespage.ang-tim-ky-niem-cua-ban.59580bee')}</CardTitle></CardHeader>
        </Card>
      )}

      {!loading && error && (
        <Card className="discovery-empty-card"><CardHeader><CardTitle>{translateCatalogKey('ui.pages.discovery.memoriespage.chua-tai-uoc-ky-niem.23787af4')}</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      )}

      {!loading && !error && displayedPosts.length === 0 && (
        <Card className="discovery-empty-card">
          <CardHeader>
            <span className="discovery-icon"><Sparkles /></span>
            <CardTitle>{translateCatalogKey('ui.pages.discovery.memoriespage.chua-co-ky-niem-cho-hom-nay.2c9f17e2')}</CardTitle>
            <CardDescription>{translateCatalogKey('ui.pages.discovery.memoriespage.hay-tiep-tuc-chia-se-e-tao-them-nhie.c21d6975')}</CardDescription>
          </CardHeader>
          <CardContent className="discovery-tip"><Images /> {translateCatalogKey('ui.pages.discovery.memoriespage.bai-viet-cung-ngay-tu-nhung-nam-truo.b8286151')}</CardContent>
        </Card>
      )}

      {!loading && !error && displayedPosts.length > 0 && (
        <div className="memories-feed">
          <div className="memories-section-heading">
            <span className="discovery-icon"><Sparkles /></span>
            <div>
              <h2>{exactMemories.length > 0 ? "Vào ngày này" : "Khoảnh khắc gần đây"}</h2>
              <p>{exactMemories.length > 0 ? translateCatalogKey('ui.pages.discovery.memoriespage.value0-ky-niem-ang-cho-ban-xem-lai.d65a1ea3', { value0: exactMemories.length }) : "Chưa có bài cùng ngày; đây là những chia sẻ gần đây của bạn."}</p>
            </div>
          </div>
          {displayedPosts.map((post) => {
            const yearsAgo = new Date().getFullYear() - new Date(post.createdAt).getFullYear();
            return (
            <div className="memory-post" key={post.id}>
              <div className="memory-post-label"><Clock3 size={15} /> {yearsAgo > 0 ? translateCatalogKey('ui.pages.discovery.memoriespage.value0-nam-truoc.1c73b883', { value0: yearsAgo }) : "Gần đây"}</div>
              <PostItem
                post={post}
                onPostUpdated={loadMemories}
                onPostDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
              />
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MemoriesPage;
