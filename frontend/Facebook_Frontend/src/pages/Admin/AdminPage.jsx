import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { FileText, Film, Home, KeyRound, Languages, LayoutDashboard, LogOut, Menu, ShieldAlert, Users, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminSecurity from './AdminSecurity';
import AdminContent from './AdminContent';
import AdminRoles from './AdminRoles';
import AdminLocalization from './AdminLocalization';
import './AdminPage.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const NAV = [
  { to: '/admin/dashboard', labelKey: 'admin.dashboard.title', Icon: LayoutDashboard },
  { to: '/admin/users', labelKey: 'admin.users.title', Icon: Users },
  { to: '/admin/posts', labelKey: 'admin.posts.title', Icon: FileText },
  { to: '/admin/reels', labelKey: 'admin.reels.title', Icon: Film },
  { to: '/admin/roles', labelKey: 'admin.roles.title', Icon: KeyRound },
  { to: '/admin/localization', labelKey: 'admin.localization.title', Icon: Languages },
  { to: '/admin/security', labelKey: 'admin.security.title', Icon: ShieldAlert },
];

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`admin-layout ${collapsed ? 'admin-layout--collapsed' : ''}`}>
      {mobileOpen && <button className="admin-mobile-overlay" type="button" aria-label={translateCatalogKey('ui.pages.admin.adminpage.ong-menu.b59636ea')} onClick={() => setMobileOpen(false)} />}
      <aside className={`admin-sidebar ${mobileOpen ? 'admin-sidebar--mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <ShieldAlert size={22} className="admin-logo-icon" />
          {!collapsed && <span className="admin-logo-text">Admin Panel</span>}
          <button className="admin-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={translateCatalogKey('ui.pages.admin.adminpage.thu-gon.b8ed9740')}>
            <ChevronRight size={16} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
          <button className="admin-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label={translateCatalogKey('ui.pages.admin.adminpage.ong-menu.b59636ea')}>
            <X size={20} />
          </button>
        </div>

        <button className="admin-home-btn" onClick={() => navigate('/')} title={translateCatalogKey('ui.pages.admin.adminpage.ve-facebook.7d84fe74')}>
          <Home size={18} />
          {!collapsed && <span>{translateCatalogKey('ui.pages.admin.adminpage.ve-facebook.7d84fe74')}</span>}
        </button>

        <nav className="admin-nav">
          {NAV.map(({ to, labelKey, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              {!collapsed && <span>{translateCatalogKey(labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {!collapsed && (
            <div className="admin-user-info">
              <span className="admin-user-name">{displayName}</span>
              <span className="admin-user-role">{translateCatalogKey('ui.pages.admin.adminpage.administrator.36b99f8c')}</span>
            </div>
          )}
          <button className="admin-logout-btn" onClick={handleLogout} title={translateCatalogKey('account.logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-mobile-bar">
          <button className="admin-icon-btn" type="button" onClick={() => { setCollapsed(false); setMobileOpen(true); }} aria-label={translateCatalogKey('ui.pages.admin.adminpage.mo-menu-quan-tri.47192ff7')}>
            <Menu size={20} />
          </button>
          <div>
            <strong>Admin Panel</strong>
            <span>{displayName}</span>
          </div>
        </div>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="posts" element={<AdminContent type="posts" />} />
          <Route path="reels" element={<AdminContent type="reels" />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="localization" element={<AdminLocalization />} />
          <Route path="security" element={<AdminSecurity />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminPage;
