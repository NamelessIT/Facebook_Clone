import { useNavigate } from 'react-router-dom';
import { Bell, ThumbsUp, MessageSquare, UserPlus, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import Avatar from '../common/Avatar';
import './NotificationPanel.css';

const NOTIFICATION_TYPE = {
  LIKE: 1,
  COMMENT: 2,
  FRIEND_REQUEST: 3,
  MESSAGE: 4,
};

const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPE.LIKE:
      return { icon: ThumbsUp, className: 'notification-icon--like' };
    case NOTIFICATION_TYPE.COMMENT:
      return { icon: MessageSquare, className: 'notification-icon--comment' };
    case NOTIFICATION_TYPE.FRIEND_REQUEST:
      return { icon: UserPlus, className: 'notification-icon--friend' };
    case NOTIFICATION_TYPE.MESSAGE:
      return { icon: MessageCircle, className: 'notification-icon--message' };
    default:
      return { icon: Bell, className: 'notification-icon--like' };
  }
};

const getNotificationText = (notification) => {
  const actorName = notification.actor?.fullName || 'Ai đó';
  switch (notification.type) {
    case NOTIFICATION_TYPE.LIKE:
      return { name: actorName, action: ' đã thích bài viết của bạn.' };
    case NOTIFICATION_TYPE.COMMENT:
      return { name: actorName, action: ' đã bình luận về bài viết của bạn.' };
    case NOTIFICATION_TYPE.FRIEND_REQUEST:
      return { name: actorName, action: ' đã gửi cho bạn lời mời kết bạn.' };
    case NOTIFICATION_TYPE.MESSAGE:
      return { name: actorName, action: ' đã gửi cho bạn một tin nhắn.' };
    default:
      return { name: actorName, action: ' đã thực hiện một hành động.' };
  }
};

const formatTimeAgo = (dateStr) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return '';
  }
};

const getNotificationLink = (notification) => {
  switch (notification.type) {
    case NOTIFICATION_TYPE.LIKE:
    case NOTIFICATION_TYPE.COMMENT:
      return '/';
    case NOTIFICATION_TYPE.FRIEND_REQUEST:
      return '/friends';
    case NOTIFICATION_TYPE.MESSAGE:
      return `/messages/${notification.actor?.id || ''}`;
    default:
      return '/';
  }
};

const NotificationPanel = ({
  notifications,
  loading,
  hasMore,
  onLoadMore,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const navigate = useNavigate();

  const handleClickNotification = (notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    const link = getNotificationLink(notification);
    navigate(link);
  };

  return (
    <div className="notification-panel">
      {/* Header */}
      <div className="notification-panel-header">
        <h3>Thông báo</h3>
        {notifications.some((n) => !n.isRead) && (
          <button className="notification-mark-all-btn" onClick={onMarkAllAsRead}>
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {/* List */}
      <div className="notification-list">
        {loading && notifications.length === 0 ? (
          <div className="notification-loading">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={40} className="notification-empty-icon" />
            <p>Chưa có thông báo nào</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const { icon: IconComponent, className: iconClass } = getNotificationIcon(notification.type);
            const { name, action } = getNotificationText(notification);

            return (
              <button
                key={notification.id}
                className={`notification-item ${!notification.isRead ? 'notification-item--unread' : ''}`}
                onClick={() => handleClickNotification(notification)}
              >
                <div className="notification-item-avatar">
                  <Avatar src={notification.actor?.avatarUrl} className="w-12 h-12" />
                  <div className={`notification-item-icon ${iconClass}`}>
                    <IconComponent size={10} />
                  </div>
                </div>

                <div className="notification-item-content">
                  <p className="notification-item-text">
                    <strong>{name}</strong>{action}
                  </p>
                  <p className={`notification-item-time ${!notification.isRead ? 'notification-item-time--unread' : ''}`}>
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>

                {!notification.isRead && <div className="notification-unread-dot" />}
              </button>
            );
          })
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="notification-load-more">
          <button
            className="notification-load-more-btn"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Xem thêm thông báo'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
