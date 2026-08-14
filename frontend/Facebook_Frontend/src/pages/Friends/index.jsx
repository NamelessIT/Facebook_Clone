import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { UserCheck, UserX } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import FriendList from "../../components/friendship/FriendList";
import UserCard from "../../components/friendship/UserCard";
import friendshipService from "../../services/friendshipService";
import userService from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import toast from '../../shared/appToast';
import "./FriendsPage.css";
import { useLocalization } from "../../contexts/useLocalization";
import { translateCatalogKey } from '../../shared/localizationRuntime';

const TABS = {
  FRIENDS: "friends",
  REQUESTS: "requests",
  DISCOVER: "discover",
};

const FriendsPage = () => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState(TABS.REQUESTS);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Discover state
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotalPages, setDiscoverTotalPages] = useState(1);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await friendshipService.getFriendRequests();
      setRequests(res.data?.data || []);
    } catch (error) {
      toast.apiError(error, t('friends.loadFailed'), { context: "friends.load" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === TABS.REQUESTS) {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  // Fetch discover users
  const fetchDiscoverUsers = useCallback(async (page = 1) => {
    setDiscoverLoading(true);
    try {
      const res = await userService.searchUsers("", page, 20);
      const data = res.data?.data || [];
      setDiscoverUsers(data.filter((u) => u.id !== user?.id));
      if (res.data?.pagination) {
        setDiscoverTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (error) {
      setDiscoverUsers([]);
      toast.apiError(error, t('friends.loadFailed'), { context: "friends.discover" });
    } finally {
      setDiscoverLoading(false);
    }
  }, [t, user?.id]);

  useEffect(() => {
    if (activeTab === TABS.DISCOVER) {
      fetchDiscoverUsers(discoverPage);
    }
  }, [activeTab, discoverPage, fetchDiscoverUsers]);

  const handleAccept = async (request) => {
    setProcessingId(request.userId);
    try {
      await friendshipService.acceptFriendRequest(request.userId);
      toast.success(translateCatalogKey('ui.components.friendship.addfriendbutton.a-chap-nhan-loi-moi-ket-ban.daba23c8'));
      setRequests((prev) => prev.filter((r) => r.userId !== request.userId));
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.friendship.addfriendbutton.co-loi-xay-ra.8aae9f86'), { context: "friends.accept" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request) => {
    setProcessingId(request.userId);
    try {
      await friendshipService.rejectFriendRequest(request.userId);
      toast.success(translateCatalogKey('ui.pages.friends.index.a-tu-choi-loi-moi-ket-ban.aab667dd'));
      setRequests((prev) => prev.filter((r) => r.userId !== request.userId));
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.friendship.addfriendbutton.co-loi-xay-ra.8aae9f86'), { context: "friends.reject" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="friends-page">
      <div className="friends-page-header">
        <h2>{t('friends.title')}</h2>
        <div className="friends-tabs">
          <button
            className={`friends-tab ${activeTab === TABS.REQUESTS ? "friends-tab--active" : ""}`}
            onClick={() => setActiveTab(TABS.REQUESTS)}
          >
            {t('friends.requests')}
          </button>
          <button
            className={`friends-tab ${activeTab === TABS.FRIENDS ? "friends-tab--active" : ""}`}
            onClick={() => setActiveTab(TABS.FRIENDS)}
          >
            {t('friends.all')}
          </button>
          <button
            className={`friends-tab ${activeTab === TABS.DISCOVER ? "friends-tab--active" : ""}`}
            onClick={() => setActiveTab(TABS.DISCOVER)}
          >
            {t('friends.discover')}
          </button>
        </div>
      </div>

      {activeTab === TABS.REQUESTS && (
        <div className="friend-requests">
          {loading ? (
            <div className="friend-requests-loading">{t('common.loading')}</div>
          ) : requests.length === 0 ? (
            <div className="friend-requests-empty">{t('friends.noRequests')}</div>
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
                      {t('friends.accept')}
                    </button>
                    <button
                      className="friend-request-btn friend-request-btn--reject"
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.userId}
                    >
                      <UserX size={16} />
                      {t('friends.reject')}
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
            <div className="friend-requests-loading">{t('common.loading')}</div>
          ) : discoverUsers.length === 0 ? (
            <div className="friend-requests-empty">{t('friends.noUsers')}</div>
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
                    {t('common.previous')}
                  </button>
                  <span className="friend-page-info">
                    {translateCatalogKey('ui.components.friendship.friendlist.trang.6d3a285d')} {discoverPage} / {discoverTotalPages}
                  </span>
                  <button
                    disabled={discoverPage >= discoverTotalPages}
                    onClick={() => setDiscoverPage(discoverPage + 1)}
                    className="friend-page-btn"
                  >
                    {t('common.next')}
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
