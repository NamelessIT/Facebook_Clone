import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Play, Film } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../common/Avatar';
import { getVideoUrl } from '../../utils/formatUrl';
import reelService from '../../services/reelService';
import ReelsPlayer from './ReelsPlayer';
import UploadReelModal from './UploadReelModal';
import './ReelsHorizontalFeed.css';

const CARD_WIDTH = 120; // px per scroll step (one card)

const ReelsHorizontalFeed = () => {
  const { user } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const trackRef = useRef(null);

  const fetchReels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reelService.getReelsFeed(1, 20);
      setReels(res.data?.data || []);
    } catch {
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  // Track scroll position to show/hide arrows
  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [reels, updateArrows]);

  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * CARD_WIDTH * 3, behavior: 'smooth' });
  };

  const handleUploadSuccess = () => {
    fetchReels();
    setShowUpload(false);
  };

  const handleReelDeleted = (id) => {
    setReels((prev) => prev.filter((r) => r.id !== id));
    setSelectedIndex(null);
  };

  const handleReelUpdated = (updated) => {
    setReels((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  };

  if (loading) {
    return (
      <div className="rhf-wrapper">
        <div className="rhf-skeleton-track">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rhf-skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rhf-wrapper">
        <div className="rhf-header">
          <Film size={17} />
          <span>Reels</span>
        </div>

        <div className="rhf-scroll-zone">
          {/* Left arrow */}
          {canLeft && (
            <button
              className="rhf-arrow rhf-arrow--left"
              onClick={() => scroll(-1)}
              aria-label="Cuon trai"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Scrollable track */}
          <div className="rhf-track" ref={trackRef}>
            {/* Create reel card — always first */}
            <button
              className="rhf-card rhf-card--create"
              onClick={() => setShowUpload(true)}
              aria-label="Tao Reel moi"
            >
              <div className="rhf-thumb rhf-thumb--create">
                <Avatar
                  src={user?.avatarUrl}
                  alt={user?.firstName}
                  className="rhf-create-avatar"
                />
                <span className="rhf-create-plus">
                  <Plus size={14} strokeWidth={3} />
                </span>
              </div>
              <span className="rhf-card-label">Tao Reels</span>
            </button>

            {/* Reel cards */}
            {reels.map((reel, i) => (
              <button
                key={reel.id}
                className="rhf-card"
                onClick={() => setSelectedIndex(i)}
                aria-label={reel.title || 'Xem Reel'}
              >
                <div className="rhf-thumb">
                  {reel.thumbnailUrl ? (
                    <img
                      src={getVideoUrl(reel.thumbnailUrl)}
                      alt={reel.title || 'Reel'}
                      className="rhf-thumb-img"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={getVideoUrl(reel.videoUrl)}
                      className="rhf-thumb-img"
                      muted
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.01; }}
                    />
                  )}
                  <span className="rhf-play-badge">
                    <Play size={10} fill="white" />
                  </span>
                </div>
                <span className="rhf-card-label">
                  {reel.userFullName || reel.userName || 'Reel'}
                </span>
              </button>
            ))}
          </div>

          {/* Right arrow */}
          {canRight && (
            <button
              className="rhf-arrow rhf-arrow--right"
              onClick={() => scroll(1)}
              aria-label="Cuon phai"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Full-screen player */}
      {selectedIndex !== null && (
        <ReelsPlayer
          reels={reels}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onReelDeleted={handleReelDeleted}
          onReelUpdated={handleReelUpdated}
        />
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadReelModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
};

export default ReelsHorizontalFeed;
