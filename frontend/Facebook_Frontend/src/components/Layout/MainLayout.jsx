import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Home, Tv, Store, Users, MessageCircle, Grid, Clock, Bookmark, Film, Folder, ChevronLeft, ShieldAlert } from "lucide-react";
import "./MainLayout.css";
import Avatar from '../common/Avatar';
import SearchBar from '../common/SearchBar';
import NotificationBell from '../Notifications/NotificationBell';
import UserDropdown from './UserDropdown';
import ChatFloatingPanel from '../Chat/ChatFloatingPanel';
import friendshipService from '../../services/friendshipService';
import savedItemsService from '../../services/savedItemsService';

const MainLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [contacts, setContacts] = useState([]);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatInitialFriend, setChatInitialFriend] = useState(null);
  const [savedCollections, setSavedCollections] = useState([]);

  const isOnSaved = location.pathname.startsWith('/saved');

  // Load contacts
  useEffect(() => {
    let cancelled = false;
    friendshipService.getFriends(1, 20)
      .then((res) => { if (!cancelled) setContacts(res.data?.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fetch collections từ API khi vào /saved
  useEffect(() => {
    if (isOnSaved) {
      savedItemsService.getCollections()
        .then((res) => setSavedCollections(res.data?.data ?? []))
        .catch(() => setSavedCollections([]));
    }
  }, [isOnSaved, location.search]);

  const searchParams = new URLSearchParams(location.search);
  const activeCol = searchParams.get('col');

  const renderLeftSidebar = () => {
    if (isOnSaved) {
      return (
        <aside className="sidebar sidebar--saved">
          <div className="saved-sb-header">
            <button className="saved-sb-back" onClick={() => navigate('/')} title="Về trang chủ">
              <ChevronLeft size={20} />
            </button>
            <h2 className="saved-sb-title">Đã lưu</h2>
          </div>

          <Link
            to="/saved"
            className={`saved-sb-item${!activeCol ? ' saved-sb-item--active' : ''}`}
          >
            <span className="saved-sb-icon"><Bookmark size={20} /></span>
            <span>Mục đã lưu</span>
          </Link>

          {savedCollections.length > 0 && (
            <div className="saved-sb-section">
              <p className="saved-sb-section-label">Bộ sưu tập</p>
              {savedCollections.map((col) => (
                <Link
                  key={col.id}
                  to={`/saved?col=${col.id}`}
                  className={`saved-sb-item${activeCol === col.id ? ' saved-sb-item--active' : ''}`}
                >
                  <span className="saved-sb-icon"><Folder size={20} /></span>
                  <span>{col.name}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      );
    }

    return (
      <aside className="sidebar">
        <Link to={`/profile/${user?.id}`} className="menu-item mt-4" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Avatar src={user?.avatarUrl} className="w-9 h-9" />
          <span className="font-semibold">{user?.fullName}</span>
        </Link>
        <div className="menu-item"><Users size={28} className="text-blue-500 mr-2" /> Bạn bè</div>
        <div className="menu-item"><Clock size={28} className="text-blue-500 mr-2" /> Kỷ niệm</div>
        <Link
          to="/saved"
          className={`menu-item${location.pathname.startsWith('/saved') ? ' active' : ''}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Bookmark size={28} className="text-purple-500 mr-2" /> Đã lưu
        </Link>
      </aside>
    );
  };

  return (
    <div className="main-layout">
      {/* 1. NAVBAR */}
      <nav className="navbar">
        {/* Góc Trái */}
        <div className="nav-left">
          <Link to="/">
            <img src="../../assets/images/Facebook-Logo.png" className="nav-logo" alt="logo" />
          </Link>
          <SearchBar />
        </div>

        {/* Giữa */}
        <div className="nav-center">
          <Link to="/" className={`nav-tab${location.pathname === '/' ? ' active' : ''}`}><Home size={28} /></Link>
          <div className="nav-tab"><Tv size={28} /></div>
          <div className="nav-tab"><Store size={28} /></div>
          <Link to="/friends" className={`nav-tab${location.pathname.startsWith('/friends') ? ' active' : ''}`}><Users size={28} /></Link>
          <Link to="/reels" className={`nav-tab${location.pathname.startsWith('/reels') ? ' active' : ''}`}><Film size={28} /></Link>
        </div>

        {/* Góc Phải */}
        <div className="nav-right">
          {user?.isAdmin && (
            <Link to="/admin" className="icon-btn admin-entry-btn" title="Admin">
              <ShieldAlert size={20} />
            </Link>
          )}
          <div className="icon-btn"><Grid size={20} /></div>
          <div className="icon-btn" onClick={() => setChatPanelOpen((prev) => !prev)} title="Messenger">
            <MessageCircle size={20} />
          </div>
          <NotificationBell />
          <UserDropdown />
        </div>
      </nav>

      {/* 2. BODY KHUNG 3 CỘT */}
      <div className="body-container">
        
        {/* Cột Trái: Menu hoặc Saved Sidebar */}
        {renderLeftSidebar()}

        {/* Cột Giữa: Bảng Tin */}
        <main className="feed-container">
          <Outlet />
        </main>

        {/* Cột Phải: Liên hệ */}
        <aside className="sidebar">
          {contacts.length > 0 && (
            <>
              <h4 className="text-gray-500 font-semibold text-[15px] px-2 mt-4 mb-2">Người liên hệ</h4>
              {contacts.map((contact) => (
                <div
                  key={contact.friendshipId}
                  className="menu-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setChatInitialFriend(contact);
                    setChatPanelOpen(true);
                  }}
                >
                  <Avatar src={contact.profile?.avatarUrl || contact.avatarUrl} className="w-8 h-8" />
                  <span className="font-semibold text-[15px]">
                    {contact.profile?.fullName || contact.fullName}
                  </span>
                </div>
              ))}
            </>
          )}
        </aside>

      </div>

      {/* Mobile bottom navigation (hiện trên màn hình nhỏ, thay cho nav-center bị ẩn) */}
      <nav className="mobile-nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''} title="Trang chủ"><Home size={24} /></Link>
        <Link to="/friends" className={location.pathname.startsWith('/friends') ? 'active' : ''} title="Bạn bè"><Users size={24} /></Link>
        <Link to="/reels" className={location.pathname.startsWith('/reels') ? 'active' : ''} title="Reels"><Film size={24} /></Link>
        <div className="mobile-nav-item" onClick={() => setChatPanelOpen((prev) => !prev)} title="Tin nhắn"><MessageCircle size={24} /></div>
        <Link to={`/profile/${user?.id}`} className={location.pathname.startsWith('/profile') ? 'active' : ''} title="Trang cá nhân"><Avatar src={user?.avatarUrl} className="w-6 h-6" /></Link>
      </nav>

      {/* Floating Chat Panel */}
      {chatPanelOpen && (
        <ChatFloatingPanel
          key={chatInitialFriend?.userId || chatInitialFriend?.id || 'panel'}
          initialFriend={chatInitialFriend}
          onClose={() => { setChatPanelOpen(false); setChatInitialFriend(null); }}
        />
      )}
    </div>
  );
};

export default MainLayout;
