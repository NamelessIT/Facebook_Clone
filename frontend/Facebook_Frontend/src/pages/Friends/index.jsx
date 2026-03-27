import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserCheck, UserX } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import FriendList from "../../components/friendship/FriendList";
import UserCard from "../../components/friendship/UserCard";
import friendshipService from "../../services/friendshipService";
import userService from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import "./FriendsPage.css";

const TABS = {
  FRIENDS: "friends",
  REQUESTS: "requests",
  DISCOVER: "discover",
};

const FriendsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.REQUESTS);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Discover state
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotalPages, setDiscoverTotalPages] = useState(1);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await friendshipService.getFriendRequests();
      setRequests(res.data?.data || []);
    } catch {
      toast.error("Không thể tải danh sách lời mời");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === TABS.REQUESTS) {
      fetchRequests();
    }
  }, [activeTab]);

  // Fetch discover users
  const fetchDiscoverUsers = async (page = 1) => {
    setDiscoverLoading(true);
    try {
      const res = await userService.searchUsers("", page, 20);
      const data = res.data?.data || [];
      setDiscoverUsers(data.filter((u) => u.id !== user?.id));
      if (res.data?.pagination) {
        setDiscoverTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch {
      setDiscoverUsers([]);
    } finally {
      setDiscoverLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === TABS.DISCOVER) {
      fetchDiscoverUsers(discoverPage);
    }
  }, [activeTab, discoverPage]);

  const handleAccept = async (request) => {
    setProcessingId(request.userId);
    try {
      await friendshipService.acceptFriendRequest(request.userId);
      toast.success("Đã chấp nhận lời mời kết bạn!");
      setRequests((prev) => prev.filter((r) => r.userId !== request.userId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request) => {
    setProcessingId(request.userId);
    try {
      await friendshipService.rejectFriendRequest(request.userId);
      toast.success("Đã từ chối lời mời kết bạn");
      setRequests((prev) => prev.filter((r) => r.userId !== request.userId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="friends-page">
      <div className="friends-page-header">
        <h2>Bạn bè</h2>
        <div className="friends-tabs">
          <button
            className={`friends-tab ${activeTab === TABS.REQUESTS ? "friends-tab--active" : ""}`}
            onClick={() => setActiveTab(TABS.REQUESTS)}
          >
            Lời mời kết bạn
          </button>
          <button
            className={`friends-tab ${activeTab === TABS.FRIENDS ? "friends-tab--active" : ""}`}
            onClick={() => setActiveTab(TABS.FRIENDS)}
          >
            Tất cả bạn bè
          </button>
          <button
            className={`friends-tab ${activeTab === TABS.DISCOVER ? "friends-tab--active" : ""}`}
            onClick={() => setActiveTab(TABS.DISCOVER)}
          >
            Khám phá
          </button>
        </div>
      </div>

      {activeTab === TABS.REQUESTS && (
        <div className="friend-requests">
          {loading ? (
            <div className="friend-requests-loading">Đang tải...</div>
          ) : requests.length === 0 ? (
            <div className="friend-requests-empty">Không có lời mời kết bạn nào</div>
          ) : (
            <div className="friend-requests-grid">
              {requests.map((request) => (
                <div key={request.friendshipId} className="friend-request-card">
                  <Link to={`/profile/${request.userId}`}>
                    <Avatar src={request.profile?.avatarUrl} className="w-20 h-20" />
                  </Link>
                  <Link to={`/profile/${request.userId}`} className="friend-request-name-link">
                    <h4 className="friend-request-name">{request.profile?.fullName}</h4>
                  </Link>
                  <div className="friend-request-actions">
                    <button
                      className="friend-request-btn friend-request-btn--accept"
                      onClick={() => handleAccept(request)}
                      disabled={processingId === request.userId}
                    >
                      <UserCheck size={16} />
                      Chấp nhận
                    </button>
                    <button
                      className="friend-request-btn friend-request-btn--reject"
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.userId}
                    >
                      <UserX size={16} />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === TABS.FRIENDS && (
        <FriendList userId={user?.id} />
      )}

      {/* TAB: Khám phá */}
      {activeTab === TABS.DISCOVER && (
        <div className="friend-discover">
          {discoverLoading && discoverUsers.length === 0 ? (
            <div className="friend-requests-loading">Đang tải...</div>
          ) : discoverUsers.length === 0 ? (
            <div className="friend-requests-empty">Không tìm thấy người dùng nào</div>
          ) : (
            <>
              <div className="friend-discover-grid">
                {discoverUsers.map((u) => (
                  <UserCard key={u.id} user={u} />
                ))}
              </div>
              {discoverTotalPages > 1 && (
                <div className="friend-discover-pagination">
                  <button
                    disabled={discoverPage <= 1}
                    onClick={() => setDiscoverPage(discoverPage - 1)}
                    className="friend-page-btn"
                  >
                    Trước
                  </button>
                  <span className="friend-page-info">
                    Trang {discoverPage} / {discoverTotalPages}
                  </span>
                  <button
                    disabled={discoverPage >= discoverTotalPages}
                    onClick={() => setDiscoverPage(discoverPage + 1)}
                    className="friend-page-btn"
                  >
                    Tiếp
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
