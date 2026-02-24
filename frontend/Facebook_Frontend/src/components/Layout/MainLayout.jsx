import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./MainLayout.css"; // IMPORT CSS

const MainLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="main-layout">
      {/* 1. NAVBAR */}
      <nav className="navbar">
        {/* Góc Trái */}
        <div className="nav-left">
          <Link to="/">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/1024px-2021_Facebook_icon.svg.png" className="nav-logo" alt="logo" />
          </Link>
          <input type="text" className="nav-search" placeholder="Tìm kiếm trên Facebook" />
        </div>

        {/* Giữa */}
        <div className="nav-center">
          <div className="nav-tab active">🏠</div>
          <div className="nav-tab">📺</div>
          <div className="nav-tab">🏪</div>
          <div className="nav-tab">👥</div>
        </div>

        {/* Góc Phải */}
        <div className="nav-right">
          <div className="icon-btn">🔲</div>
          <div className="icon-btn">💬</div>
          <div className="icon-btn">🔔</div>
          <img 
            src={user?.avatarUrl || "https://via.placeholder.com/150"} 
            className="user-avatar" 
            alt="User" 
            onClick={logout}
            title="Đăng xuất"
          />
        </div>
      </nav>

      {/* 2. BODY KHUNG 3 CỘT */}
      <div className="body-container">
        
        {/* Cột Trái: Menu */}
        <aside className="sidebar">
          <div className="menu-item">
            <img src={user?.avatarUrl || "https://via.placeholder.com/150"} className="user-avatar" style={{width: 36, height: 36}}/>
            <span>{user?.fullName}</span>
          </div>
          <div className="menu-item"><span className="menu-icon">👥</span> Bạn bè</div>
          <div className="menu-item"><span className="menu-icon">⏱️</span> Kỷ niệm</div>
          <div className="menu-item"><span className="menu-icon">🔖</span> Đã lưu</div>
          <div className="menu-item"><span className="menu-icon">🏳️</span> Trang</div>
        </aside>

        {/* Cột Giữa: Bảng Tin (Outlet render từ Router) */}
        <main className="feed-container">
          <Outlet />
        </main>

        {/* Cột Phải: Quảng cáo & Bạn bè */}
        <aside className="sidebar">
          <h4 style={{color: '#65676b', fontSize: '15px', paddingLeft: '8px'}}>Được tài trợ</h4>
          <div className="menu-item">
             <div style={{width: 100, height: 100, backgroundColor: '#ddd', borderRadius: 8}}></div>
             <div>
                <b style={{fontSize: 14}}>Mua sắm thả ga</b>
                <div style={{fontSize: 12, color: '#65676b'}}>shopee.vn</div>
             </div>
          </div>
          <hr style={{margin: '10px 8px', border: 'none', borderBottom: '1px solid #ced0d4'}} />
          <h4 style={{color: '#65676b', fontSize: '15px', paddingLeft: '8px'}}>Người liên hệ</h4>
          <div className="menu-item">
            <img src="https://via.placeholder.com/150" className="user-avatar" style={{width: 32, height: 32}}/>
            <span>Bob Nguyễn</span>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default MainLayout;