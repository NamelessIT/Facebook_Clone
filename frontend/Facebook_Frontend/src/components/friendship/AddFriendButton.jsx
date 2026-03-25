import { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import friendshipService from "../../services/friendshipService";
import toast from "react-hot-toast";
import "./AddFriendButton.css";

const FRIENDSHIP_STATUS = {
  NONE: "none",
  PENDING_SENT: "pending_sent",
  PENDING_RECEIVED: "pending_received",
  FRIENDS: "friends",
};

const AddFriendButton = ({ targetUserId, initialStatus }) => {
  const [status, setStatus] = useState(initialStatus || FRIENDSHIP_STATUS.NONE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialStatus) {
      fetchStatus();
    }
  }, [targetUserId]);

  const fetchStatus = async () => {
    try {
      const res = await friendshipService.getFriendshipStatus(targetUserId);
      const data = res.data?.data;
      if (data) {
        setStatus(data.status);
      }
    } catch {
      setStatus(FRIENDSHIP_STATUS.NONE);
    }
  };

  const handleAction = async () => {
    setLoading(true);
    try {
      switch (status) {
        case FRIENDSHIP_STATUS.NONE: {
          await friendshipService.sendFriendRequest(targetUserId);
          setStatus(FRIENDSHIP_STATUS.PENDING_SENT);
          toast.success("Đã gửi lời mời kết bạn!");
          break;
        }
        case FRIENDSHIP_STATUS.PENDING_SENT:
          await friendshipService.removeFriend(targetUserId);
          setStatus(FRIENDSHIP_STATUS.NONE);
          toast.success("Đã hủy lời mời kết bạn");
          break;
        case FRIENDSHIP_STATUS.PENDING_RECEIVED:
          await friendshipService.acceptFriendRequest(targetUserId);
          setStatus(FRIENDSHIP_STATUS.FRIENDS);
          toast.success("Đã chấp nhận lời mời kết bạn!");
          break;
        case FRIENDSHIP_STATUS.FRIENDS:
          await friendshipService.removeFriend(targetUserId);
          setStatus(FRIENDSHIP_STATUS.NONE);
          toast.success("Đã hủy kết bạn");
          break;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case FRIENDSHIP_STATUS.PENDING_SENT:
        return { icon: Clock, text: "Đã gửi lời mời", className: "add-friend-btn--pending" };
      case FRIENDSHIP_STATUS.PENDING_RECEIVED:
        return { icon: UserCheck, text: "Chấp nhận", className: "add-friend-btn--accept" };
      case FRIENDSHIP_STATUS.FRIENDS:
        return { icon: UserCheck, text: "Bạn bè", className: "add-friend-btn--friends" };
      default:
        return { icon: UserPlus, text: "Thêm bạn bè", className: "add-friend-btn--add" };
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
      {loading ? "Đang xử lý..." : config.text}
    </button>
  );
};

export default AddFriendButton;
