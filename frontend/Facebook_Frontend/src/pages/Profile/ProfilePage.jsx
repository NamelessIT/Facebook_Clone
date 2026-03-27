import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Calendar, MessageCircle, Edit3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import postService from '../../services/postService';
import friendshipService from '../../services/friendshipService';
import Avatar from '../../components/common/Avatar';
import PostItem from '../../components/post/PostItem';
import FriendList from '../../components/friendship/FriendList';
import AddFriendButton from '../../components/friendship/AddFriendButton';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { getImageUrl } from '../../utils/formatUrl';
import './ProfilePage.css';

const TABS = {
  POSTS: 'posts',
  FRIENDS: 'friends',
  ABOUT: 'about',
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.POSTS);

  // Posts state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isOwnProfile) {
          const res = await userService.getMe();
          setProfileUser(res.data);
        } else {
          const res = await userService.getUserById(userId);
          setProfileUser(res.data?.data || res.data);
        }
      } catch {
        setError('Không tìm thấy người dùng này.');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId, isOwnProfile]);

  // Fetch posts when tab = posts
  const fetchPosts = async (page = 1) => {
    setPostsLoading(true);
    try {
      const res = await postService.getUserPosts(userId, page, 10);
      setPosts(res.data?.data || []);
      if (res.data?.pagination) {
        setPostsTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === TABS.POSTS && userId) {
      fetchPosts(postsPage);
    }
  }, [activeTab, postsPage, userId]);

  const handleProfileUpdated = (updatedData) => {
    setProfileUser((prev) => ({ ...prev, ...updatedData }));
  };

  const formatJoinDate = (dateStr) => {
    if (!dateStr) return 'Không rõ';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
    } catch {
      return 'Không rõ';
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-cover profile-cover--skeleton" />
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar profile-avatar--skeleton" />
          </div>
          <div className="profile-info">
            <div className="skeleton-text skeleton-name" />
            <div className="skeleton-text skeleton-bio" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <h3>Oops!</h3>
          <p>{error}</p>
          <button className="profile-error-btn" onClick={() => navigate('/')}>
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  return (
    <div className="profile-page">
      {/* Cover Photo */}
      <div className="profile-cover">
        {profileUser.coverUrl ? (
          <img
            src={getImageUrl(profileUser.coverUrl, 'avatars')}
            alt="Cover"
            className="profile-cover-img"
          />
        ) : (
          <div className="profile-cover-placeholder" />
        )}
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <Avatar src={profileUser.avatarUrl} className="profile-avatar" />
        </div>

        <div className="profile-info">
          <div className="profile-info-top">
            <h1 className="profile-name">{profileUser.fullName}</h1>
            <div className="profile-actions">
              {isOwnProfile ? (
                <button
                  className="profile-edit-btn"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit3 size={16} />
                  Chỉnh sửa trang cá nhân
                </button>
              ) : (
                <>
                  <AddFriendButton targetUserId={userId} />
                  <button
                    className="profile-message-btn"
                    onClick={() => navigate(`/messages/${userId}`)}
                  >
                    <MessageCircle size={16} />
                    Nhắn tin
                  </button>
                </>
              )}
            </div>
          </div>
          {profileUser.bio && (
            <p className="profile-bio">{profileUser.bio}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === TABS.POSTS ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab(TABS.POSTS)}
        >
          Bài viết
        </button>
        <button
          className={`profile-tab ${activeTab === TABS.FRIENDS ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab(TABS.FRIENDS)}
        >
          Bạn bè
        </button>
        <button
          className={`profile-tab ${activeTab === TABS.ABOUT ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab(TABS.ABOUT)}
        >
          Giới thiệu
        </button>
      </div>

      {/* Tab Content */}
      <div className="profile-content">
        {/* TAB: Bài viết */}
        {activeTab === TABS.POSTS && (
          <div className="profile-posts">
            {postsLoading && posts.length === 0 ? (
              <div className="profile-loading-text">Đang tải bài viết...</div>
            ) : posts.length === 0 ? (
              <div className="profile-empty-text">Chưa có bài viết nào</div>
            ) : (
              <>
                {posts.map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    onPostUpdated={() => fetchPosts(postsPage)}
                  />
                ))}
                {postsTotalPages > 1 && (
                  <div className="profile-pagination">
                    <button
                      disabled={postsPage <= 1}
                      onClick={() => setPostsPage(postsPage - 1)}
                      className="profile-page-btn"
                    >
                      Trước
                    </button>
                    <span className="profile-page-info">
                      Trang {postsPage} / {postsTotalPages}
                    </span>
                    <button
                      disabled={postsPage >= postsTotalPages}
                      onClick={() => setPostsPage(postsPage + 1)}
                      className="profile-page-btn"
                    >
                      Tiếp
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB: Bạn bè */}
        {activeTab === TABS.FRIENDS && (
          <FriendList userId={userId} />
        )}

        {/* TAB: Giới thiệu */}
        {activeTab === TABS.ABOUT && (
          <div className="profile-about">
            <div className="profile-about-card">
              <h3>Giới thiệu</h3>
              {profileUser.bio ? (
                <div className="profile-about-item">
                  <p className="profile-about-bio">{profileUser.bio}</p>
                </div>
              ) : (
                <p className="profile-about-empty">Chưa có tiểu sử</p>
              )}
              {profileUser.location && (
                <div className="profile-about-item">
                  <MapPin size={18} className="profile-about-icon" />
                  <span>Sống tại <strong>{profileUser.location}</strong></span>
                </div>
              )}
              <div className="profile-about-item">
                <Calendar size={18} className="profile-about-icon" />
                <span>Tham gia {formatJoinDate(profileUser.createdAt)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          user={profileUser}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
};

export default ProfilePage;
