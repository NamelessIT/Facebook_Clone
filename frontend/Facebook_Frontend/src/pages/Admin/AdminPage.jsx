import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { FileText, Film, Flag, KeyRound, Languages, LayoutDashboard, LogOut, Menu, Radio, Settings2, ShieldAlert, Store, Users, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import toast from '../../shared/appToast';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminSecurity from './AdminSecurity';
import AdminContent from './AdminContent';
import AdminRoles from './AdminRoles';
import AdminLocalization from './AdminLocalization';
import AdminLives from './AdminLives';
import AdminMarketplace from './AdminMarketplace';
import AdminReports from './AdminReports';
import AdminSettings from './AdminSettings';
import adminService from '../../services/adminService';
import './AdminPage.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { LIMITS } from '../../shared/generated/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const NAV = [
  { to: '/admin/dashboard', labelKey: 'admin.dashboard.title', permission: 'dashboard.view', Icon: LayoutDashboard },
  { to: '/admin/users', labelKey: 'admin.users.title', permission: 'users.view', Icon: Users },
  { to: '/admin/posts', labelKey: 'admin.posts.title', permission: 'posts.view', Icon: FileText },
  { to: '/admin/reels', labelKey: 'admin.reels.title', permission: 'reels.view', Icon: Film },
  { to: '/admin/lives', labelKey: 'admin.lives.title', permission: 'lives.view', Icon: Radio },
  { to: '/admin/marketplace', labelKey: 'admin.marketplace.title', permission: 'marketplace.view', Icon: Store },
  { to: '/admin/reports', labelKey: 'admin.reports.title', permission: 'reports.view', Icon: Flag },
  { to: '/admin/roles', labelKey: 'admin.roles.title', permission: 'roles.view', Icon: KeyRound },
  { to: '/admin/localization', labelKey: 'admin.localization.title', permission: 'localization.view', Icon: Languages },
  { to: '/admin/security', labelKey: 'admin.security.title', permission: 'security.view', Icon: ShieldAlert },
  { to: '/admin/settings', labelKey: 'admin.settings.title', permission: 'settings.manage', Icon: Settings2 },
];

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [adminMe, setAdminMe] = useState(null);
  const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Admin';
  const permissions = useMemo(() => new Set(adminMe?.permissions || []), [adminMe]);
  const visibleNavigation = useMemo(() => NAV.filter((item) => permissions.has(item.permission)), [permissions]);
  const defaultAdminPath = visibleNavigation[0]?.to || '/admin/login';
  const can = (permission) => permissions.has(permission);

  useEffect(() => {
    let active = true;
    adminService.getMe()
      .then((response) => { if (active) setAdminMe(response.data.data); })
      .catch(async (error) => {
        toast.apiError(error, translateCatalogKey('admin.access.loadFailed'), { context: "admin.access.load" });
        await logout();
        navigate('/admin/login', { replace: true });
      });
    return () => { active = false; };
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(translateCatalogKey('admin.account.passwordMismatch'));
      return;
    }

    setPasswordSubmitting(true);
    try {
      await userService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success(translateCatalogKey('admin.account.passwordChanged'));
      await logout();
      navigate('/admin/login');
    } catch (error) {
      toast.apiError(error, translateCatalogKey('admin.account.passwordChangeFailed'), { context: "admin.password.change" });
    } finally {
      setPasswordSubmitting(false);
    }
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

        <nav className="admin-nav">
          {visibleNavigation.map(({ to, labelKey, Icon }) => (
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
              <span className="admin-user-role">{adminMe?.roles?.[0]
                ? translateCatalogKey(`roles.${adminMe.roles[0].name}.displayName`)
                : translateCatalogKey('ui.pages.admin.adminpage.administrator.36b99f8c')}</span>
            </div>
          )}
          <button className="admin-logout-btn" onClick={() => setPasswordModalOpen(true)} title={translateCatalogKey('admin.account.changePassword')}>
            <KeyRound size={18} />
          </button>
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
        {!adminMe ? (
          <div className="admin-empty-state">{translateCatalogKey('common.loading')}</div>
        ) : <Routes>
          <Route index element={<Navigate to={defaultAdminPath} replace />} />
          <Route path="dashboard" element={can('dashboard.view') ? <AdminDashboard /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="users" element={can('users.view') ? <AdminUsers /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="posts" element={can('posts.view') ? <AdminContent type="posts" /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="reels" element={can('reels.view') ? <AdminContent type="reels" /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="lives" element={can('lives.view') ? <AdminLives /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="marketplace" element={can('marketplace.view') ? <AdminMarketplace /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="reports" element={can('reports.view') ? <AdminReports /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="roles" element={can('roles.view') ? <AdminRoles /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="localization" element={can('localization.view') ? <AdminLocalization /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="security" element={can('security.view') ? <AdminSecurity /> : <Navigate to={defaultAdminPath} replace />} />
          <Route path="settings" element={can('settings.manage') ? <AdminSettings /> : <Navigate to={defaultAdminPath} replace />} />
        </Routes>}
      </main>

      <Dialog open={passwordModalOpen} onOpenChange={(open) => !passwordSubmitting && setPasswordModalOpen(open)}>
        <DialogContent className="admin-password-modal sm:max-w-md" showCloseButton={!passwordSubmitting}>
          <form onSubmit={handlePasswordChange}>
            <DialogHeader>
              <DialogTitle>{translateCatalogKey('admin.account.changePassword')}</DialogTitle>
              <DialogDescription>{translateCatalogKey('admin.account.passwordSignInAgain')}</DialogDescription>
            </DialogHeader>
            <div className="admin-password-form py-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-current-password">{translateCatalogKey('admin.account.currentPassword')}</Label>
                <Input id="admin-current-password" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-new-password">{translateCatalogKey('admin.account.newPassword')}</Label>
                <Input id="admin-new-password" type="password" autoComplete="new-password" minLength={LIMITS.passwordMinLength} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-confirm-password">{translateCatalogKey('admin.account.confirmPassword')}</Label>
                <Input id="admin-confirm-password" type="password" autoComplete="new-password" minLength={LIMITS.passwordMinLength} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setPasswordModalOpen(false)} disabled={passwordSubmitting}>{translateCatalogKey('common.cancel')}</Button>
              <Button type="submit" disabled={passwordSubmitting}>{passwordSubmitting ? translateCatalogKey('common.loading') : translateCatalogKey('admin.account.changePassword')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
