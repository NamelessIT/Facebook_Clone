import { useRef, useState, useEffect } from 'react';
import {
  MoreHorizontal, Star, EyeOff, Bookmark, Link2, Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import postInteractionService from '../../services/postInteractionService';
import ReportPostModal from './ReportPostModal';
import './PostActionMenu.css';

const PostActionMenu = ({ postId, onPostHide, onNotInterested }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const withLoading = async (fn) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleInterest = () =>
    withLoading(async () => {
      await postInteractionService.interestPost(postId);
      toast.success('Đã đánh dấu quan tâm bài viết này');
    });

  const handleNotInterested = () =>
    withLoading(async () => {
      await postInteractionService.notInterestedPost(postId);
      onNotInterested?.(postId);
    });

  const handleSave = () =>
    withLoading(async () => {
      if (isSaved) {
        await postInteractionService.unsavePost(postId);
        setIsSaved(false);
        toast.success('Đã bỏ lưu bài viết');
      } else {
        await postInteractionService.savePost(postId);
        setIsSaved(true);
        toast.success('Đã lưu bài viết');
      }
    });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Đã sao chép liên kết');
      setShowMenu(false);
    });
  };

  const handleOpenReport = () => {
    setShowMenu(false);
    setShowReportModal(true);
  };

  return (
    <>
      <div className="pam-wrap" ref={menuRef}>
        <button
          className="pam-trigger"
          onClick={() => setShowMenu((v) => !v)}
          disabled={loading}
          aria-label="Tùy chọn bài viết"
        >
          <MoreHorizontal size={20} />
        </button>

        {showMenu && (
          <div className="pam-dropdown">
            <button className="pam-item" onClick={handleInterest} disabled={loading}>
              <Star size={16} />
              <span>Quan tâm</span>
            </button>
            <button className="pam-item" onClick={handleNotInterested} disabled={loading}>
              <EyeOff size={16} />
              <span>Không quan tâm</span>
            </button>
            <button className="pam-item" onClick={handleSave} disabled={loading}>
              <Bookmark size={16} />
              <span>{isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
            </button>
            <button className="pam-item" onClick={handleCopyLink} disabled={loading}>
              <Link2 size={16} />
              <span>Sao chép liên kết</span>
            </button>
            <hr className="pam-divider" />
            <button className="pam-item pam-item--danger" onClick={handleOpenReport} disabled={loading}>
              <Flag size={16} />
              <span>Báo cáo bài viết</span>
            </button>
          </div>
        )}
      </div>

      {showReportModal && (
        <ReportPostModal
          postId={postId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
};

export default PostActionMenu;
