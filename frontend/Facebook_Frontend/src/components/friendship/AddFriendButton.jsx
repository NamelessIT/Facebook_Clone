import { useState, useEffect, useCallback } from "react";
import { UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import friendshipService from "../../services/friendshipService";
import toast from '../../shared/appToast';
import "./AddFriendButton.css";
import { useLocalization } from "../../contexts/useLocalization";
import { translateCatalogKey } from '../../shared/localizationRuntime';

const FRIENDSHIP_STATUS = {
  NONE: "none",
  PENDING_SENT: "pending_sent",
  PENDING_RECEIVED: "pending_received",
  FRIENDS: "friends",
};

const AddFriendButton = ({ targetUserId, initialStatus }) => {
  const [status, setStatus] = useState(initialStatus || FRIENDSHIP_STATUS.NONE);
  const [loading, setLoading] = useState(false);
  const { t } = useLocalization();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await friendshipService.getFriendshipStatus(targetUserId);
      const data = res.data?.data;
      if (data) {
        setStatus(data.status);
      }
    } catch {
      setStatus(FRIENDSHIP_STATUS.NONE);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
      return;
    }
    fetchStatus();
  }, [fetchStatus, initialStatus]);

  const handleAction = async () => {
    setLoading(true);
    try {
      switch (status) {
        case FRIENDSHIP_STATUS.NONE: {
          await friendshipService.sendFriendRequest(targetUserId);
          setStatus(FRIENDSHIP_STATUS.PENDING_SENT);
          toast.success(translateCatalogKey('ui.components.friendship.addfriendbutton.a-gui-loi-moi-ket-ban.dbef53b6'));
          break;
        }
        case FRIENDSHIP_STATUS.PENDING_SENT:
          await friendshipService.removeFriend(targetUserId);
          setStatus(FRIENDSHIP_STATUS.NONE);
          toast.success(translateCatalogKey('ui.components.friendship.addfriendbutton.a-huy-loi-moi-ket-ban.3c09651f'));
          break;
        case FRIENDSHIP_STATUS.PENDING_RECEIVED:
          await friendshipService.acceptFriendRequest(targetUserId);
          setStatus(FRIENDSHIP_STATUS.FRIENDS);
          toast.success(translateCatalogKey('ui.components.friendship.addfriendbutton.a-chap-nhan-loi-moi-ket-ban.daba23c8'));
          break;
        case FRIENDSHIP_STATUS.FRIENDS:
          await friendshipService.removeFriend(targetUserId);
          setStatus(FRIENDSHIP_STATUS.NONE);
          toast.success(translateCatalogKey('ui.components.friendship.addfriendbutton.a-huy-ket-ban.4777b18f'));
          break;
      }
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.friendship.addfriendbutton.co-loi-xay-ra.8aae9f86'), { context: "friends.action" });
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case FRIENDSHIP_STATUS.PENDING_SENT:
        return { icon: Clock, text: translateCatalogKey('friends.requestSent'), className: "add-friend-btn--pending" };
      case FRIENDSHIP_STATUS.PENDING_RECEIVED:
        return { icon: UserCheck, text: t('friends.accept'), className: "add-friend-btn--accept" };
      case FRIENDSHIP_STATUS.FRIENDS:
        return { icon: UserCheck, text: t('friends.friend'), className: "add-friend-btn--friends" };
      default:
        return { icon: UserPlus, text: t('friends.add'), className: "add-friend-btn--add" };
    }
  };

  const config = getButtonConfig();
  const Icon = config.icon;

  return (
    <button
      className={`add-friend-btn ${config.className}`}
      onClick={handleAction}
      disabled={loading}
    >
      <Icon size={18} />
      {loading ? translateCatalogKey('common.processing') : config.text}
    </button>
  );
};

export default AddFriendButton;
