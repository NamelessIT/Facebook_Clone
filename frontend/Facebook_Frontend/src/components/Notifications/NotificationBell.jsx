import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import notificationService from '../../services/notificationService';
import NotificationPanel from './NotificationPanel';
import { LIMITS } from '../../shared/generated/constants';
import './NotificationBell.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import toast from '../../shared/appToast';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(pageNum, LIMITS.notificationPageSize);
      const data = res.data?.data || [];
      if (append) {
        setNotifications((prev) => [...prev, ...data]);
      } else {
        setNotifications(data);
      }
      setHasMore(data.length >= LIMITS.notificationPageSize);
      setPage(pageNum);

      if (!append) {
        const count = data.filter((n) => !n.isRead).length;
        setUnreadCount(count);
      }
    } catch (error) {
      toast.apiError(error, translateCatalogKey('notification.loadFailed'), { id: 'notifications-load-error', context: 'notifications.load' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // SignalR: listen for new notifications
  useEffect(() => {
    const handleNewNotification = () => {
      fetchNotifications(1);
    };
    const handleBadgeUpdate = (count) => setUnreadCount(count);

    notificationService.onReceiveNotification(handleNewNotification);
    notificationService.onBadgeUpdate(handleBadgeUpdate);
    notificationService.startConnection();

    return () => {
      notificationService.offReceiveNotification(handleNewNotification);
      notificationService.offBadgeUpdate(handleBadgeUpdate);
    };
  }, [fetchNotifications]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      fetchNotifications(1);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1, true);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.apiError(error, translateCatalogKey('notification.markReadFailed'), { context: 'notifications.markRead' });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('notification.markReadFailed'), { context: 'notifications.markAllRead' });
    }
  };

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        className={`notification-bell-btn ${isOpen ? 'notification-bell-btn--active' : ''}`}
        onClick={handleToggle}
        title={translateCatalogKey('notification.title')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
      )}
    </div>
  );
};

export default NotificationBell;
