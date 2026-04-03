import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkX } from 'lucide-react';
import toast from 'react-hot-toast';
import PostItem from '../../components/post/PostItem';
import savedItemsService from '../../services/savedItemsService';
import './SavedItemsPage.css';

const PAGE_SIZE = 10;

const SavedItemsPage = () => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchSavedPosts = useCallback(async (currentPage) => {
    setLoading(true);
    try {
      const res = await savedItemsService.getSavedPosts(currentPage, PAGE_SIZE);
      const { data, pagination: pg } = res.data;
      setPosts(data ?? []);
      setPagination(pg ?? { page: 1, totalPages: 1, total: 0 });
    } catch {
      toast.error('Không thể tải danh sách đã lưu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedPosts(page);
  }, [page, fetchSavedPosts]);

  const handleUnsave = async (postId) => {
    try {
      await savedItemsService.unsavePost(postId);
      toast.success('Đã bỏ lưu bài viết');
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      toast.error('Bỏ lưu thất bại');
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  };

  const handlePostHide = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="saved-page">
      <div className="saved-header">
        <div className="saved-header-icon">
          <Bookmark size={24} />
        </div>
        <div className="saved-header-text">
          <h1>Đã lưu</h1>
          <p>Chỉ mình bạn mới thấy những gì bạn đã lưu</p>
        </div>
      </div>

      {loading && (
        <div className="saved-loading">
          <p>Đang tải...</p>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="saved-empty">
          <BookmarkX size={48} className="saved-empty-icon" />
          <p className="saved-empty-title">Chưa có bài viết nào được lưu</p>
          <p className="saved-empty-desc">
            Khi bạn lưu các mục, chúng sẽ xuất hiện tại đây.
          </p>
        </div>
      )}

      {!loading && posts.map((post) => (
        <div key={post.id} className="saved-post-wrapper">
          <button
            className="saved-unsave-btn"
            onClick={() => handleUnsave(post.id)}
            title="Bỏ lưu bài viết"
          >
            <BookmarkX size={14} />
            Bỏ lưu
          </button>
          <PostItem
            post={post}
            onPostUpdated={handlePostUpdated}
            onPostHide={handlePostHide}
          />
        </div>
      ))}

      {!loading && pagination.totalPages > 1 && (
        <div className="saved-pagination">
          <button
            className="saved-page-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            ← Trước
          </button>
          <span>Trang {page} / {pagination.totalPages}</span>
          <button
            className="saved-page-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
          >
            Tiếp →
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedItemsPage;
