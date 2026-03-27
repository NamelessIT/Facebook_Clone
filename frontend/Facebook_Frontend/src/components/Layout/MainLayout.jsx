import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getImageUrl } from "../../utils/formatUrl";
import { Home, Tv, Store, Users, MessageCircle, Grid, Clock, Bookmark } from "lucide-react";
import "./MainLayout.css";
import Avatar from '../common/Avatar';
import SearchBar from '../common/SearchBar';
import NotificationBell from '../Notifications/NotificationBell';
import UserDropdown from './UserDropdown';
import ChatFloatingPanel from '../Chat/ChatFloatingPanel';
import friendshipService from '../../services/friendshipService';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [contacts, setContacts] = useState([]);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatInitialFriend, setChatInitialFriend] = useState(null);

  // Load real contacts from API
  useEffect(() => {
    let cancelled = false;
    friendshipService.getFriends(1, 20)
      .then((res) => { if (!cancelled) setContacts(res.data?.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
        </div>

        {/* Góc Phải */}
        <div className="nav-right">
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
        
        {/* Cột Trái: Menu */}
        <aside className="sidebar">
          <Link to={`/profile/${user?.id}`} className="menu-item mt-4" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Avatar src={user?.avatarUrl} className="w-9 h-9" />
            <span className="font-semibold">{user?.fullName}</span>
          </Link>
          <div className="menu-item"><Users size={28} className="text-blue-500 mr-2" /> Bạn bè</div>
          <div className="menu-item"><Clock size={28} className="text-blue-500 mr-2" /> Kỷ niệm</div>
          <div className="menu-item"><Bookmark size={28} className="text-purple-500 mr-2" /> Đã lưu</div>
        </aside>

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