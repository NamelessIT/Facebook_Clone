import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserMinus } from "lucide-react";
import Avatar from "../common/Avatar";
import friendshipService from "../../services/friendshipService";
import toast from '../../shared/appToast';
import "./FriendList.css";
import { useConfirm } from '../../contexts/useConfirm';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const FriendList = ({ userId }) => {
  const confirm = useConfirm();
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
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.friendship.friendlist.khong-the-tai-danh-sach-ban-be.ae40da14'), { context: 'friends.list' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends(page);
  }, [page, userId]);

  const handleRemoveFriend = async (friendId, friendName) => {
    const accepted = await confirm({
      title: translateCatalogKey('ui.components.friendship.friendlist.huy-ket-ban.3ede6f81'),
      message: translateCatalogKey('friends.unfriendDescription', { name: friendName }),
      confirmText: translateCatalogKey('ui.components.friendship.friendlist.huy-ket-ban.76e1bf1d'),
    });
    if (!accepted) return;
    setRemovingId(friendId);
    try {
      await friendshipService.removeFriend(friendId);
      toast.success(translateCatalogKey('ui.components.friendship.friendlist.a-huy-ket-ban-voi-value0.618babe9', { value0: friendName }));
      fetchFriends(page);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.friendship.addfriendbutton.co-loi-xay-ra.8aae9f86'), { context: 'friends.remove' });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <div className="friend-list-loading">{translateCatalogKey('common.loading')}</div>;
  }

  if (friends.length === 0) {
    return <div className="friend-list-empty">{translateCatalogKey('ui.components.friendship.friendlist.chua-co-ban-be-nao.add109a1')}</div>;
  }

  return (
    <div className="friend-list">
      <div className="friend-list-grid">
        {friends.map((friend) => (
          <div key={friend.friendshipId} className="friend-card">
            <Link to={`/profile/${friend.userId}`}>
              <Avatar src={friend.profile?.avatarUrl} className="w-20 h-20" />
            </Link>
            <div className="friend-card-info">
              <Link to={`/profile/${friend.userId}`} className="friend-card-name-link">
                <h4 className="friend-card-name">{friend.profile?.fullName}</h4>
              </Link>
            </div>
            <button
              className="friend-card-remove"
              onClick={() => handleRemoveFriend(friend.userId, friend.profile?.fullName)}
              disabled={removingId === friend.userId}
              title={translateCatalogKey('ui.components.friendship.friendlist.huy-ket-ban.76e1bf1d')}
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
            {translateCatalogKey('common.previous')}
          </button>
          <span className="friend-page-info">{translateCatalogKey('ui.components.friendship.friendlist.trang.6d3a285d')} {page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="friend-page-btn"
          >
            {translateCatalogKey('common.next')}
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendList;
