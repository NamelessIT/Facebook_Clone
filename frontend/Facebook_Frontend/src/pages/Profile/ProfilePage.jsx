import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Camera, MapPin, Calendar, MessageCircle, Edit3,
  Grid3X3, FileText, Users, Image, Film, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import postService from '../../services/postService';
import friendshipService from '../../services/friendshipService';
import Avatar from '../../components/common/Avatar';
import PostItem from '../../components/post/PostItem';
import AddFriendButton from '../../components/friendship/AddFriendButton';
import EditProfileModal from '../../components/profile/EditProfileModal';
import ProfileSidebar from '../../components/profile/ProfileSidebar';
import ReelsGrid from '../../components/reels/ReelsGrid';
import { getImageUrl } from '../../utils/formatUrl';
import './ProfilePage.css';

const TABS = {
  ALL: 'all',
  ABOUT: 'about',
  FRIENDS: 'friends',
  PHOTOS: 'photos',
  REELS: 'reels',
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.ALL);

  const [posts, setPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsLoading, setPostsLoading] = useState(false);

  const [friends, setFriends] = useState([]);
  const [friendsPage, setFriendsPage] = useState(1);
  const [friendsTotalPages, setFriendsTotalPages] = useState(1);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = isOwnProfile
          ? await userService.getMe()
          : await userService.getUserById(userId);
        setProfileUser(res.data?.data || res.data);
      } catch {
        setError('Không tìm thấy người dùng này.');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId, isOwnProfile]);

  const fetchPosts = useCallback(
    async (page = 1) => {
      setPostsLoading(true);
      try {
        const res = await postService.getUserPosts(userId, page, 10);
        setPosts(res.data?.data || []);
        const pg = res.data?.pagination;
        if (pg) {
          setPostsTotalPages(pg.totalPages || 1);
          setPostsTotal(pg.total || 0);
        }
      } catch {
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    },
    [userId]
  );

  const fetchFriends = useCallback(
    async (page = 1) => {
      setFriendsLoading(true);
      try {
        const res = await friendshipService.getUserFriends(userId, page, 12);
        setFriends(res.data?.data || []);
        const pg = res.data?.pagination;
        if (pg) {
          setFriendsTotalPages(pg.totalPages || 1);
          setFriendsTotal(pg.total || 0);
        }
      } catch {
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    },
    [userId]
  );

  const fetchPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const res = await postService.getUserPosts(userId, 1, 50);
      const allPosts = res.data?.data || [];
      const imgs = [];
      allPosts.forEach((p) => {
        (p.medias || [])
          .filter((m) => m.mediaType === 1 || m.mediaType === 'Image')
          .forEach((m) => imgs.push({ id: m.id, url: m.url, postId: p.id }));
      });
      setPhotos(imgs);
    } catch {
      setPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (activeTab === TABS.ALL) fetchPosts(postsPage);
  }, [activeTab, postsPage, userId, fetchPosts]);

  useEffect(() => {
    if (activeTab === TABS.FRIENDS && userId) fetchFriends(friendsPage);
  }, [activeTab, friendsPage, userId, fetchFriends]);

  useEffect(() => {
    if (activeTab === TABS.PHOTOS && userId) fetchPhotos();
  }, [activeTab, userId, fetchPhotos]);

  const handleProfileUpdated = (updatedData) => {
    setProfileUser((prev) => ({ ...prev, ...updatedData }));
    toast.success('Đã cập nhật trang cá nhân!');
  };

  const joinDate = profileUser?.createdAt
    ? format(new Date(profileUser.createdAt), "MMMM 'năm' yyyy", { locale: vi })
    : null;

  if (loading) {
    return (
      <div className="pp-page">
        <div className="pp-cover pp-cover--skeleton" />
        <div className="pp-header-bar">
          <div className="pp-avatar-wrap">
            <div className="pp-avatar pp-avatar--skeleton" />
          </div>
          <div className="pp-header-info">
            <div className="pp-skel-name" />
            <div className="pp-skel-bio" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pp-page">
        <div className="pp-error-card">
          <h3>Không tìm thấy người dùng</h3>
          <p>{error}</p>
          <button className="pp-btn pp-btn--primary" onClick={() => navigate('/')}>
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  const tabConfig = [
    { key: TABS.ALL, label: 'Tất cả', icon: <Grid3X3 size={16} /> },
    { key: TABS.ABOUT, label: 'Giới thiệu', icon: <FileText size={16} /> },
    { key: TABS.FRIENDS, label: 'Bạn bè', icon: <Users size={16} /> },
    { key: TABS.PHOTOS, label: 'Ảnh', icon: <Image size={16} /> },
    { key: TABS.REELS, label: 'Reels', icon: <Film size={16} /> },
    { key: 'more', label: 'Xem thêm', icon: <ChevronDown size={16} /> },
  ];

  return (
    <div className="pp-page">
      {/* Cover */}
      <div className="pp-cover">
        {profileUser.coverUrl ? (
          <img
            src={getImageUrl(profileUser.coverUrl, 'covers')}
            alt="Cover"
            className="pp-cover-img"
          />
        ) : (
          <div className="pp-cover-placeholder" />
        )}
        {isOwnProfile && (
          <button
            className="pp-cover-edit-btn"
            onClick={() => setShowEditModal(true)}
            title="Thay ảnh bìa"
          >
            <Camera size={14} />
            Chỉnh sửa ảnh bìa
          </button>
        )}
      </div>

      {/* Header Bar */}
      <div className="pp-header-bar">
        <div className="pp-avatar-section">
          <div className="pp-avatar-wrap">
            <Avatar
              src={profileUser.avatarUrl}
              className="pp-avatar"
              alt={profileUser.fullName}
            />
            {isOwnProfile && (
              <button
                className="pp-avatar-edit-btn"
                onClick={() => setShowEditModal(true)}
                title="Thay ảnh đại diện"
              >
                <Camera size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="pp-header-info">
          <div className="pp-header-top">
            <div className="pp-header-text">
              <h1 className="pp-name">{profileUser.fullName}</h1>
              <div className="pp-stats">
                {postsTotal > 0 && <span>{postsTotal} Bài viết</span>}
                {friendsTotal > 0 && <span>{friendsTotal} Bạn bè</span>}
                {photos.length > 0 && <span>{photos.length} Ảnh</span>}
              </div>
              {profileUser.bio && <p className="pp-bio">{profileUser.bio}</p>}
              <div className="pp-meta">
                {profileUser.location && (
                  <span className="pp-meta-item">
                    <MapPin size={14} />
                    {profileUser.location}
                  </span>
                )}
                {joinDate && (
                  <span className="pp-meta-item">
                    <Calendar size={14} />
                    Tham gia {joinDate}
                  </span>
                )}
              </div>
            </div>

            <div className="pp-actions">
              {isOwnProfile ? (
                <button
                  className="pp-btn pp-btn--secondary"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit3 size={16} />
                  Chỉnh sửa trang cá nhân
                </button>
              ) : (
                <>
                  <AddFriendButton targetUserId={userId} />
                  <button
                    className="pp-btn pp-btn--primary"
                    onClick={() => navigate(`/messages/${userId}`)}
                  >
                    <MessageCircle size={16} />
                    Nhắn tin
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pp-tabs-bar">
        <div className="pp-tabs">
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              className={`pp-tab${activeTab === tab.key ? ' pp-tab--active' : ''}${tab.key === 'more' ? ' pp-tab--disabled' : ''}`}
              onClick={() => tab.key !== 'more' && setActiveTab(tab.key)}
              disabled={tab.key === 'more'}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className={`pp-body${activeTab === TABS.ALL ? ' pp-body--sidebar' : ''}`}>
        {/* Sidebar only on ALL tab */}
        {activeTab === TABS.ALL && (
          <aside className="pp-sidebar-col">
            <ProfileSidebar profileUser={profileUser} />
          </aside>
        )}

        {/* Main content */}
        <div className="pp-main-col">
          {/* ALL: posts list */}
          {activeTab === TABS.ALL && (
            <div className="pp-posts-list">
              {postsLoading && posts.length === 0 ? (
                <div className="pp-loading">Đang tải bài viết...</div>
              ) : posts.length === 0 ? (
                <div className="pp-empty">Chưa có bài viết nào</div>
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
                    <div className="pp-pagination">
                      <button
                        className="pp-page-btn"
                        disabled={postsPage <= 1}
                        onClick={() => setPostsPage((p) => p - 1)}
                      >
                        Trước
                      </button>
                      <span>Trang {postsPage} / {postsTotalPages}</span>
                      <button
                        className="pp-page-btn"
                        disabled={postsPage >= postsTotalPages}
                        onClick={() => setPostsPage((p) => p + 1)}
                      >
                        Tiếp
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ABOUT */}
          {activeTab === TABS.ABOUT && (
            <div className="pp-card">
              <h3 className="pp-card-title">Giới thiệu</h3>
              {profileUser.bio ? (
                <p className="pp-about-bio">{profileUser.bio}</p>
              ) : (
                <p className="pp-empty">Chưa có tiểu sử</p>
              )}
              <ul className="pp-about-list">
                {profileUser.location && (
                  <li>
                    <MapPin size={16} />
                    Sống tại <strong>{profileUser.location}</strong>
                  </li>
                )}
                {joinDate && (
                  <li>
                    <Calendar size={16} />
                    Tham gia vào <strong>{joinDate}</strong>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* FRIENDS */}
          {activeTab === TABS.FRIENDS && (
            <div className="pp-card">
              <h3 className="pp-card-title">Bạn bè ({friendsTotal})</h3>
              {friendsLoading ? (
                <div className="pp-loading">Đang tải...</div>
              ) : friends.length === 0 ? (
                <div className="pp-empty">Chưa có bạn bè nào</div>
              ) : (
                <>
                  <div className="pp-friends-grid">
                    {friends.map((f) => {
                      const fu = f.profile || f;
                      return (
                        <Link
                          key={f.userId || f.id}
                          to={`/profile/${f.userId || f.id}`}
                          className="pp-friend-card"
                        >
                          <Avatar
                            src={fu.avatarUrl}
                            className="pp-friend-avatar"
                            alt={fu.fullName}
                          />
                          <span className="pp-friend-name">{fu.fullName}</span>
                        </Link>
                      );
                    })}
                  </div>
                  {friendsTotalPages > 1 && (
                    <div className="pp-pagination">
                      <button
                        className="pp-page-btn"
                        disabled={friendsPage <= 1}
                        onClick={() => setFriendsPage((p) => p - 1)}
                      >
                        Trước
                      </button>
                      <span>Trang {friendsPage} / {friendsTotalPages}</span>
                      <button
                        className="pp-page-btn"
                        disabled={friendsPage >= friendsTotalPages}
                        onClick={() => setFriendsPage((p) => p + 1)}
                      >
                        Tiếp
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PHOTOS */}
          {activeTab === TABS.PHOTOS && (
            <div className="pp-card">
              <h3 className="pp-card-title">Ảnh ({photos.length})</h3>
              {photosLoading ? (
                <div className="pp-loading">Đang tải...</div>
              ) : photos.length === 0 ? (
                <div className="pp-empty">Chưa có ảnh nào</div>
              ) : (
                <div className="pp-photos-grid">
                  {photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={getImageUrl(photo.url, 'posts')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pp-photo-item"
                    >
                      <img
                        src={getImageUrl(photo.url, 'posts')}
                        alt="photo"
                        className="pp-photo-img"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REELS */}
          {activeTab === TABS.REELS && (
            <div className="pp-reels-section">
              <ReelsGrid userId={userId} />
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          profileUser={profileUser}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
};

export default ProfilePage;

