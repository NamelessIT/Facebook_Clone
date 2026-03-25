import { useState, useEffect } from "react";
import { UserCheck, UserX } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import FriendList from "../../components/friendship/FriendList";
import friendshipService from "../../services/friendshipService";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import "./FriendsPage.css";

const TABS = {
  FRIENDS: "friends",
  REQUESTS: "requests",
};

const FriendsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.REQUESTS);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

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

  const handleAccept = async (requestId) => {
    setProcessingId(requestId);
    try {
      await friendshipService.acceptFriendRequest(requestId);
      toast.success("Đã chấp nhận lời mời kết bạn!");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    try {
      await friendshipService.rejectFriendRequest(requestId);
      toast.success("Đã từ chối lời mời kết bạn");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
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
                <div key={request.id} className="friend-request-card">
                  <Avatar src={request.fromUser?.avatarUrl} className="w-20 h-20" />
                  <h4 className="friend-request-name">{request.fromUser?.fullName}</h4>
                  <div className="friend-request-actions">
                    <button
                      className="friend-request-btn friend-request-btn--accept"
                      onClick={() => handleAccept(request.id)}
                      disabled={processingId === request.id}
                    >
                      <UserCheck size={16} />
                      Chấp nhận
                    </button>
                    <button
                      className="friend-request-btn friend-request-btn--reject"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
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
    </div>
  );
};

export default FriendsPage;
