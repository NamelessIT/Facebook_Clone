import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Users, FileText } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import PostItem from "../../components/post/PostItem";
import userService from "../../services/userService";
import postService from "../../services/postService";
import AddFriendButton from "../../components/friendship/AddFriendButton";
import { useAuth } from "../../contexts/AuthContext";
import "./SearchResultsPage.css";

const TABS = {
  USERS: "users",
  POSTS: "posts",
};

const SearchResultsPage = () => {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [activeTab, setActiveTab] = useState(TABS.USERS);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  // Posts state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);

  const limit = 10;

  const fetchUsers = async (page = 1) => {
    if (!query.trim()) return;
    setUsersLoading(true);
    try {
      const res = await userService.searchUsers(query, page, limit);
      setUsers(res.data?.data || []);
      if (res.data?.pagination) {
        setUsersTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPosts = async (page = 1) => {
    if (!query.trim()) return;
    setPostsLoading(true);
    try {
      const res = await postService.searchPosts(query, page, limit);
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
    setUsersPage(1);
    setPostsPage(1);
    if (activeTab === TABS.USERS) fetchUsers(1);
    else fetchPosts(1);
  }, [query]);

  useEffect(() => {
    if (activeTab === TABS.USERS) fetchUsers(usersPage);
    else fetchPosts(postsPage);
  }, [activeTab, usersPage, postsPage]);

  const renderPagination = (page, totalPages, setPage) => {
    if (totalPages <= 1) return null;
    return (
      <div className="search-pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="search-page-btn">Trước</button>
        <span className="search-page-info">Trang {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="search-page-btn">Tiếp</button>
      </div>
    );
  };

  return (
    <div className="search-results-page">
      <h2 className="search-results-title">Kết quả tìm kiếm cho &quot;{query}&quot;</h2>

      <div className="search-tabs">
        <button
          className={`search-tab ${activeTab === TABS.USERS ? "search-tab--active" : ""}`}
          onClick={() => setActiveTab(TABS.USERS)}
        >
          <Users size={18} /> Mọi người
        </button>
        <button
          className={`search-tab ${activeTab === TABS.POSTS ? "search-tab--active" : ""}`}
          onClick={() => setActiveTab(TABS.POSTS)}
        >
          <FileText size={18} /> Bài viết
        </button>
      </div>

      {/* TAB: USERS */}
      {activeTab === TABS.USERS && (
        <div className="search-results-content">
          {usersLoading ? (
            <div className="search-results-loading">Đang tìm kiếm...</div>
          ) : users.length === 0 ? (
            <div className="search-results-empty">Không tìm thấy người dùng nào</div>
          ) : (
            <>
              {users.map((u) => (
                <div key={u.id} className="search-user-card">
                  <Link to={`/profile/${u.id}`} className="search-user-info">
                    <Avatar src={u.avatarUrl} className="w-14 h-14" />
                    <div>
                      <h4 className="search-user-name">{u.fullName}</h4>
                      {u.bio && <p className="search-user-bio">{u.bio}</p>}
                    </div>
                  </Link>
                  {currentUser?.id !== u.id && (
                    <AddFriendButton targetUserId={u.id} />
                  )}
                </div>
              ))}
              {renderPagination(usersPage, usersTotalPages, setUsersPage)}
            </>
          )}
        </div>
      )}

      {/* TAB: POSTS */}
      {activeTab === TABS.POSTS && (
        <div className="search-results-content">
          {postsLoading ? (
            <div className="search-results-loading">Đang tìm kiếm...</div>
          ) : posts.length === 0 ? (
            <div className="search-results-empty">Không tìm thấy bài viết nào</div>
          ) : (
            <>
              {posts.map((p) => (
                <PostItem key={p.id} post={p} onPostUpdated={() => fetchPosts(postsPage)} />
              ))}
              {renderPagination(postsPage, postsTotalPages, setPostsPage)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
