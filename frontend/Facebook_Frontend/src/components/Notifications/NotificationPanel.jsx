import { useNavigate, Link } from 'react-router-dom';
import { Bell, ThumbsUp, MessageSquare, UserPlus, MessageCircle, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import Avatar from '../common/Avatar';
import { useLocalization } from '../../contexts/useLocalization';
import './NotificationPanel.css';

const NOTIFICATION_TYPE = {
  LIKE: 1,
  COMMENT: 2,
  FRIEND_REQUEST: 3,
  MESSAGE: 4,
  FRIEND_ACCEPTED: 5,
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
    case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
      return { icon: UserCheck, className: 'notification-icon--friend' };
    default:
      return { icon: Bell, className: 'notification-icon--like' };
  }
};

const getNotificationText = (notification, t) => {
  const actorName = notification.actor?.fullName || t('notification.someone');
  switch (notification.type) {
    case NOTIFICATION_TYPE.LIKE:
      return { name: actorName, action: t('notification.likedPost') };
    case NOTIFICATION_TYPE.COMMENT:
      return { name: actorName, action: t('notification.commentedPost') };
    case NOTIFICATION_TYPE.FRIEND_REQUEST:
      return { name: actorName, action: t('notification.sentFriendRequest') };
    case NOTIFICATION_TYPE.MESSAGE:
      return { name: actorName, action: t('notification.sentMessage') };
    case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
      return { name: actorName, action: t('notification.acceptedFriendRequest') };
    default:
      return { name: actorName, action: t('notification.performedAction') };
  }
};

const formatTimeAgo = (dateStr, locale) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: locale === 'vi' ? vi : enUS });
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
    case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
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
  const { locale, t } = useLocalization();

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
        <h3>{t('notification.title')}</h3>
        {notifications.some((n) => !n.isRead) && (
          <button className="notification-mark-all-btn" onClick={onMarkAllAsRead}>
            {t('notification.markAllRead')}
          </button>
        )}
      </div>

      {/* List */}
      <div className="notification-list">
        {loading && notifications.length === 0 ? (
          <div className="notification-loading">{t('common.loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={40} className="notification-empty-icon" />
            <p>{t('notification.empty')}</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const { icon: IconComponent, className: iconClass } = getNotificationIcon(notification.type);
            const { name, action } = getNotificationText(notification, t);

            return (
              <button
                key={notification.id}
                className={`notification-item ${!notification.isRead ? 'notification-item--unread' : ''}`}
                onClick={() => handleClickNotification(notification)}
              >
                <div className="notification-item-avatar">
                  <Link to={`/profile/${notification.actor?.id}`} onClick={(e) => e.stopPropagation()}>
                    <Avatar src={notification.actor?.avatarUrl} className="w-12 h-12" />
                  </Link>
                  <div className={`notification-item-icon ${iconClass}`}>
                    <IconComponent size={10} />
                  </div>
                </div>

                <div className="notification-item-content">
                  <p className="notification-item-text">
                    <strong>{name}</strong>{action}
                  </p>
                  <p className={`notification-item-time ${!notification.isRead ? 'notification-item-time--unread' : ''}`}>
                    {formatTimeAgo(notification.createdAt, locale)}
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
            {loading ? t('common.loading') : t('notification.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
