import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Bookmark, BookmarkX } from 'lucide-react';
import toast from '../../shared/appToast';
import CardSavedPost from '../../components/post/CardSavedPost';
import PostDetailModal from '../../components/post/PostDetailModal';
import savedItemsService from '../../services/savedItemsService';
import { LIMITS } from '../../shared/generated/constants';
import { useLocalization } from '../../contexts/useLocalization';
import './SavedItemsPage.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const PAGE_SIZE = LIMITS.savedItemsPageSize;

const SavedItemsPage = () => {
  const location = useLocation();
  const { t } = useLocalization();
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState(null);
  const [userCollections, setUserCollections] = useState([]);

  const searchParams = new URLSearchParams(location.search);
  const activeColId = searchParams.get('col');

  // Fetch collections từ API
  const fetchCollections = useCallback(async () => {
    try {
      const res = await savedItemsService.getCollections();
      setUserCollections(res.data?.data ?? []);
    } catch (error) {
      setUserCollections([]);
      toast.apiError(error, t('saved.loadFailed'), { context: "saved.collections.load" });
    }
  }, [t]);

  // Fetch saved posts hoặc collection posts
  const fetchPosts = useCallback(async (currentPage) => {
    setLoading(true);
    try {
      if (activeColId) {
        const res = await savedItemsService.getCollectionPosts(activeColId, currentPage, PAGE_SIZE);
        const { data, pagination: pg } = res.data;
        const unwrapped = (data ?? []).map((item) => item.post || item);
        setPosts(unwrapped);
        setPagination(pg ?? { page: 1, totalPages: 1, total: 0 });
      } else {
        const res = await savedItemsService.getSavedPosts(currentPage, PAGE_SIZE);
        const { data, pagination: pg } = res.data;
        const unwrapped = (data ?? []).map((item) => item.post || item);
        setPosts(unwrapped);
        setPagination(pg ?? { page: 1, totalPages: 1, total: 0 });
      }
    } catch (error) {
      toast.apiError(error, t('saved.loadFailed'), { context: "saved.posts.load" });
    } finally {
      setLoading(false);
    }
  }, [activeColId, t]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    setPage(1);
  }, [activeColId]);

  useEffect(() => {
    fetchPosts(page);
  }, [page, fetchPosts]);

  const handleUnsave = async (postId) => {
    if (!postId) {
      toast.error(t('saved.invalidPost'));
      return;
    }
    try {
      await savedItemsService.unsavePost(postId);
      toast.success(t('saved.unsaved'));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      toast.apiError(error, t('saved.unsaveFailed'), { context: "saved.post.remove" });
    }
  };

  const handleSaveToCollection = async (postId, { nextCollectionIds, newName } = {}) => {
    try {
      if (newName) {
        const res = await savedItemsService.createCollection(newName);
        const newCol = res.data?.data;
        if (newCol) {
          await savedItemsService.addPostToCollection(newCol.id, postId);
          setUserCollections((prev) => [...prev, newCol]);
          toast.success(t('saved.collectionCreated', undefined, { name: newName }));
        }
      } else if (nextCollectionIds) {
        const state = await savedItemsService.getPostCollectionState(postId);
        const previous = new Set(state.data?.data?.collectionIds ?? []);
        const next = new Set(nextCollectionIds);
        const toAdd = [...next].filter((id) => !previous.has(id));
        const toRemove = [...previous].filter((id) => !next.has(id));

        await Promise.all([
          ...toAdd.map((id) => savedItemsService.addPostToCollection(id, postId)),
          ...toRemove.map((id) => savedItemsService.removePostFromCollection(id, postId)),
        ]);

        toast.success(t('saved.collectionUpdated'));
        if (activeColId && toRemove.includes(activeColId)) {
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        }
      }
    } catch (error) {
      toast.apiError(error, t('common.actionFailed'), { context: "saved.collections.update" });
    }
  };

  const validPosts = posts.filter((p) => p && p.id);

  const activeColName = activeColId
    ? userCollections.find((c) => c.id === activeColId)?.name || t('nav.collections')
    : t('nav.savedItems');

  return (
    <div className="saved-page">
      <div className="saved-header">
        <div className="saved-header-icon">
          <Bookmark size={24} />
        </div>
        <div className="saved-header-text">
          <h1>{activeColName}</h1>
          <p>{t('saved.privateHint')}</p>
        </div>
      </div>

      {loading && (
        <div className="saved-loading">
          <p>{t('common.loading')}</p>
        </div>
      )}

      {!loading && validPosts.length === 0 && (
        <div className="saved-empty">
          <BookmarkX size={48} className="saved-empty-icon" />
          <p className="saved-empty-title">{t('saved.emptyTitle')}</p>
          <p className="saved-empty-desc">
            {t('saved.emptyDescription')}
          </p>
        </div>
      )}

      {!loading && validPosts.map((post) =>
        post.id ? (
          <CardSavedPost
            key={post.id}
            post={post}
            collections={userCollections}
            onUnsave={handleUnsave}
            onSaveToCollection={handleSaveToCollection}
            onViewDetail={() => setSelectedPost(post)}
          />
        ) : null
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="saved-pagination">
          <button
            className="saved-page-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            ← {t('common.previous')}
          </button>
          <span>{t('common.pageOf', undefined, { page, total: pagination.totalPages })}</span>
          <button
            className="saved-page-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
          >
            {t('common.next')} →
          </button>
        </div>
      )}

      {selectedPost && (
        <PostDetailModal
          key={selectedPost.id}
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onSelectPost={setSelectedPost}
        />
      )}
    </div>
  );
};

export default SavedItemsPage;
