import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { FileText, Film, Home, KeyRound, LayoutDashboard, LogOut, ShieldAlert, Users, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminSecurity from './AdminSecurity';
import AdminContent from './AdminContent';
import AdminRoles from './AdminRoles';
import './AdminPage.css';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/admin/users', label: 'Người dùng', Icon: Users },
  { to: '/admin/posts', label: 'Bài viết', Icon: FileText },
  { to: '/admin/reels', label: 'Reels', Icon: Film },
  { to: '/admin/roles', label: 'Role & quyền', Icon: KeyRound },
  { to: '/admin/security', label: 'Bảo mật', Icon: ShieldAlert },
];

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`admin-layout ${collapsed ? 'admin-layout--collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <ShieldAlert size={22} className="admin-logo-icon" />
          {!collapsed && <span className="admin-logo-text">Admin Panel</span>}
          <button className="admin-collapse-btn" onClick={() => setCollapsed(!collapsed)} title="Thu gọn">
            <ChevronRight size={16} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>

        <button className="admin-home-btn" onClick={() => navigate('/')} title="Về Facebook">
          <Home size={18} />
          {!collapsed && <span>Về Facebook</span>}
        </button>

        <nav className="admin-nav">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
              }
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {!collapsed && (
            <div className="admin-user-info">
              <span className="admin-user-name">{displayName}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          )}
          <button className="admin-logout-btn" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="posts" element={<AdminContent type="posts" />} />
          <Route path="reels" element={<AdminContent type="reels" />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="security" element={<AdminSecurity />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminPage;
