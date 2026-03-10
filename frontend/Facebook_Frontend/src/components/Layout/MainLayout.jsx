import { Outlet, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getImageUrl } from "../../utils/formatUrl";
import { Home, Tv, Store, Users, Search, Bell, MessageCircle, Grid } from "lucide-react"; // BỘ ICON XỊN SÒ
import "./MainLayout.css";
import Avatar from '../common/Avatar';

const MainLayout = () => {
  const { user, logout } = useAuth();
  // Tạm thời mock data. Sau này bạn fetch từ API Chat/Friends gán vào đây
  const [contacts, setContacts] = useState([
    { id: 1, fullName: "Bob Nguyễn", avatarUrl: null },
    { id: 2, fullName: "Alice Trần", avatarUrl: "f30955c0-791e-4e87-bd36-30b46e2eaa4d.png" },]);

  return (
    <div className="main-layout">
      {/* 1. NAVBAR */}
      <nav className="navbar">
        {/* Góc Trái */}
        <div className="nav-left">
          <Link to="/">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/1024px-2021_Facebook_icon.svg.png" className="nav-logo" alt="logo" />
          </Link>
          <div className="search-container">
            <Search size={18} className="search-icon text-gray-500" />
            <input type="text" className="nav-search" placeholder="Tìm kiếm trên Facebook" />
          </div>
        </div>

        {/* Giữa */}
        <div className="nav-center">
          <div className="nav-tab active"><Home size={28} /></div>
          <div className="nav-tab"><Tv size={28} /></div>
          <div className="nav-tab"><Store size={28} /></div>
          <div className="nav-tab"><Users size={28} /></div>
        </div>

        {/* Góc Phải */}
        <div className="nav-right">
          <div className="icon-btn"><Grid size={20} /></div>
          <div className="icon-btn"><MessageCircle size={20} /></div>
          <div className="icon-btn"><Bell size={20} /></div>
          <Avatar 
            src={user?.avatarUrl} 
            className="user-avatar" 
            onClick={logout}
            title="Đăng xuất"
          />
        </div>
      </nav>

      {/* 2. BODY KHUNG 3 CỘT */}
      <div className="body-container">
        
        {/* Cột Trái: Menu */}
        <aside className="sidebar">
          <div className="menu-item mt-4">
            <Avatar src={user?.avatarUrl} className="w-9 h-9" />
            <span className="font-semibold">{user?.fullName}</span>
          </div>
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
              {contacts.map(contact => (
                <div key={contact.id} className="menu-item">
                  {/* 👇 DÙNG COMPONENT AVATAR Ở ĐÂY */}
                  <Avatar src={contact.avatarUrl} className="w-8 h-8" />
                  <span className="font-semibold text-[15px]">{contact.fullName}</span>
                </div>
              ))}
            </>
          )}
        </aside>

      </div>
    </div>
  );
};

// Khai báo thêm vài icon dùng ở Sidebar cho tiện
import { Clock, Bookmark } from "lucide-react";

export default MainLayout;