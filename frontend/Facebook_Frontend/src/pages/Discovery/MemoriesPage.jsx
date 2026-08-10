import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Images, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import postService from '../../services/postService';
import PostItem from '../../components/post/PostItem';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import './DiscoveryPages.css';

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
      setError('Không thể tải kỷ niệm lúc này. Vui lòng thử lại sau.');
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
          <Badge variant="secondary"><Clock3 /> Kỷ niệm</Badge>
          <h1>Ôn lại những khoảnh khắc</h1>
          <p>Những bài viết đáng nhớ của bạn được tổng hợp tại đây.</p>
        </div>
        <span className="discovery-date"><CalendarDays /> {todayLabel}</span>
      </div>

      {loading && (
        <Card className="discovery-empty-card">
          <CardHeader><span className="discovery-icon discovery-icon--pulse"><Sparkles /></span><CardTitle>Đang tìm kỷ niệm của bạn…</CardTitle></CardHeader>
        </Card>
      )}

      {!loading && error && (
        <Card className="discovery-empty-card"><CardHeader><CardTitle>Chưa tải được kỷ niệm</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      )}

      {!loading && !error && displayedPosts.length === 0 && (
        <Card className="discovery-empty-card">
          <CardHeader>
            <span className="discovery-icon"><Sparkles /></span>
            <CardTitle>Chưa có kỷ niệm cho hôm nay</CardTitle>
            <CardDescription>Hãy tiếp tục chia sẻ để tạo thêm nhiều kỷ niệm đẹp.</CardDescription>
          </CardHeader>
          <CardContent className="discovery-tip"><Images /> Bài viết cùng ngày từ những năm trước sẽ tự động xuất hiện ở đây.</CardContent>
        </Card>
      )}

      {!loading && !error && displayedPosts.length > 0 && (
        <div className="memories-feed">
          <div className="memories-section-heading">
            <span className="discovery-icon"><Sparkles /></span>
            <div>
              <h2>{exactMemories.length > 0 ? 'Vào ngày này' : 'Khoảnh khắc gần đây'}</h2>
              <p>{exactMemories.length > 0 ? `${exactMemories.length} kỷ niệm đang chờ bạn xem lại.` : 'Chưa có bài cùng ngày; đây là những chia sẻ gần đây của bạn.'}</p>
            </div>
          </div>
          {displayedPosts.map((post) => {
            const yearsAgo = new Date().getFullYear() - new Date(post.createdAt).getFullYear();
            return (
            <div className="memory-post" key={post.id}>
              <div className="memory-post-label"><Clock3 size={15} /> {yearsAgo > 0 ? `${yearsAgo} năm trước` : 'Gần đây'}</div>
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
