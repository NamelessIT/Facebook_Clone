import { useState, useEffect } from "react";
import { UserMinus } from "lucide-react";
import Avatar from "../common/Avatar";
import friendshipService from "../../services/friendshipService";
import toast from "react-hot-toast";
import "./FriendList.css";

const FriendList = ({ userId }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [removingId, setRemovingId] = useState(null);

  const limit = 20;

  const fetchFriends = async (targetPage = 1) => {
    setLoading(true);
    try {
      const res = await friendshipService.getFriends(targetPage, limit);
      const data = res.data;
      setFriends(data.data || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch {
      toast.error("Không thể tải danh sách bạn bè");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends(page);
  }, [page, userId]);

  const handleRemoveFriend = async (friendId, friendName) => {
    if (!confirm(`Bạn có chắc muốn hủy kết bạn với ${friendName}?`)) return;
    setRemovingId(friendId);
    try {
      await friendshipService.removeFriend(friendId);
      toast.success(`Đã hủy kết bạn với ${friendName}`);
      fetchFriends(page);
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <div className="friend-list-loading">Đang tải...</div>;
  }

  if (friends.length === 0) {
    return <div className="friend-list-empty">Chưa có bạn bè nào</div>;
  }

  return (
    <div className="friend-list">
      <div className="friend-list-grid">
        {friends.map((friend) => (
          <div key={friend.id} className="friend-card">
            <Avatar src={friend.avatarUrl} className="w-20 h-20" />
            <div className="friend-card-info">
              <h4 className="friend-card-name">{friend.fullName}</h4>
            </div>
            <button
              className="friend-card-remove"
              onClick={() => handleRemoveFriend(friend.id, friend.fullName)}
              disabled={removingId === friend.id}
              title="Hủy kết bạn"
            >
              <UserMinus size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="friend-list-pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="friend-page-btn"
          >
            Trước
          </button>
          <span className="friend-page-info">Trang {page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="friend-page-btn"
          >
            Tiếp
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendList;
