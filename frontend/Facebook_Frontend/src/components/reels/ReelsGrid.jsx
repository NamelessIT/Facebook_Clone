import { useState, useEffect } from 'react';
import { Play, Film } from 'lucide-react';
import reelService from '../../services/reelService';
import { getVideoUrl } from '../../utils/formatUrl';
import ReelsPlayer from './ReelsPlayer';
import './ReelsGrid.css';
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import toast from '../../shared/appToast';

const ReelsGrid = ({ userId }) => {
  const { t } = useLocalization();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    setReels([]);
    setPage(1);
  }, [userId]);

  useEffect(() => {
    const fetchReels = async () => {
      setLoading(true);
      try {
        const res = userId
          ? await reelService.getUserReels(userId, page, 12)
          : await reelService.getReelsFeed(page, 12);
        const data = res.data?.data || [];
        const pg = res.data?.pagination;
        setReels((prev) => (page === 1 ? data : [...prev, ...data]));
        if (pg) setTotalPages(pg.totalPages || 1);
      } catch (error) {
        setReels([]);
        toast.apiError(error, t('reels.loadFailed'), { id: "reels-grid-load-error", context: "reels.grid.load" });
      } finally {
        setLoading(false);
      }
    };
    fetchReels();
  }, [userId, page, t]);

  const handleReelDeleted = (deletedId) => {
    setReels((prev) => prev.filter((r) => r.id !== deletedId));
    setSelectedIndex(null);
  };

  const handleReelUpdated = (updated) => {
    setReels((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  };

  if (loading && reels.length === 0) {
    return (
      <div className="rg-container">
        <div className="rg-loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="rg-container">
        <div className="rg-empty">
          <Film size={40} className="rg-empty-icon" />
          <p>{t('reels.noReels')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rg-container">
      <div className="rg-grid">
        {reels.map((reel, index) => (
          <button
            key={reel.id}
            className="rg-card"
            onClick={() => setSelectedIndex(index)}
            aria-label={reel.title || translateCatalogKey('reels.view')}
          >
            {/* Thumbnail */}
            {reel.thumbnailUrl ? (
              <img
                src={getVideoUrl(reel.thumbnailUrl)}
                alt={reel.title || translateCatalogKey('ui.components.reels.reelsgrid.reel.06dcbfb1')}
                className="rg-thumbnail"
                loading="lazy"
              />
            ) : (
              <video
                src={getVideoUrl(reel.videoUrl)}
                className="rg-thumbnail"
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.01; }}
              />
            )}

            {/* Play icon */}
            <div className="rg-play-overlay">
              <Play size={24} fill="#fff" />
            </div>

            {/* Title (clipped) */}
            {reel.title && (
              <div className="rg-card-footer">
                <span className="rg-card-title">{reel.title}</span>
              </div>
            )}

            {/* Duration badge */}
            {reel.duration > 0 && (
              <span className="rg-duration">{formatDuration(reel.duration)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Load more */}
      {page < totalPages && (
        <div className="rg-load-more">
          <button
            className="rg-load-more-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
          >
            {loading ? t('common.loading') : t('reels.loadMore')}
          </button>
        </div>
      )}

      {/* Player */}
      {selectedIndex !== null && (
        <ReelsPlayer
          reels={reels}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onReelDeleted={handleReelDeleted}
          onReelUpdated={handleReelUpdated}
        />
      )}
    </div>
  );
};

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default ReelsGrid;
