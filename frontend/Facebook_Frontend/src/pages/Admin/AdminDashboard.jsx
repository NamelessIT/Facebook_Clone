import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, FileText, Film, KeyRound, MessageSquare, ShieldOff, TrendingUp, Users, UsersRound } from 'lucide-react';
import adminService from '../../services/adminService';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then((response) => setData(response.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">{translateCatalogKey('common.loading')}</div>;
  if (!data) return <div className="admin-empty">{translateCatalogKey('ui.pages.admin.admindashboard.khong-the-tai-du-lieu.fe4fcb3f')}</div>;

  const { users, content, security, rbac } = data;
  const stats = [
    { label: translateCatalogKey('chat.userFallback'), value: users.total, sub: translateCatalogKey('admin.dashboard.newUsers7Days', { count: users.newLast7Days }), Icon: Users },
    { label: translateCatalogKey('ui.pages.admin.admindashboard.ang-online.47e929f9'), value: users.activeNow, sub: translateCatalogKey('admin.dashboard.current'), Icon: Activity, variant: 'success' },
    { label: translateCatalogKey('ui.pages.admin.admindashboard.a-bi-ban.1dc82dfe'), value: users.banned, sub: translateCatalogKey('admin.dashboard.accounts'), Icon: ShieldOff, variant: 'danger' },
    { label: translateCatalogKey('admin.posts.title'), value: content.totalPosts, sub: translateCatalogKey('admin.dashboard.todayCount', { count: content.postsToday }), Icon: FileText },
    { label: 'Reels', value: content.totalReels, sub: translateCatalogKey('admin.dashboard.deletedCount', { count: content.deletedReels ?? 0 }), Icon: Film },
    { label: translateCatalogKey('post.comment'), value: content.totalComments, sub: translateCatalogKey('admin.dashboard.systemWide'), Icon: MessageSquare },
    { label: translateCatalogKey('ui.pages.admin.admindashboard.nhom.a35c3d84'), value: content.totalGroups, sub: 'Community modules', Icon: UsersRound },
    { label: translateCatalogKey('ui.pages.admin.admindashboard.rbac.623e54e4'), value: rbac?.roleCount ?? 0, sub: `${rbac?.permissionCount ?? 0} permissions`, Icon: KeyRound, variant: 'success' },
    { label: translateCatalogKey('ui.pages.admin.admindashboard.ip-bi-chan.75eaaed0'), value: security.blockedIps, sub: translateCatalogKey('admin.dashboard.activeNow'), Icon: AlertTriangle, variant: 'danger' },
    { label: translateCatalogKey('ui.pages.admin.admindashboard.su-kien-24h.8ff64066'), value: security.eventsLast24h, sub: `${security.rateLimitHitsLast1h} rate limit/1h`, Icon: TrendingUp, variant: 'warn' },
  ];

  return (
    <div>
      <h1 className="admin-page-title">{translateCatalogKey('admin.dashboard.title')}</h1>

      <div className="admin-stats-grid">
        {stats.map(({ label, value, sub, Icon, variant }) => (
          <div key={label} className={`admin-stat-card ${variant ? `admin-stat-card--${variant}` : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={16} style={{ color: '#888' }} />
              <span className="admin-stat-label">{label}</span>
            </div>
            <span className="admin-stat-value">{value?.toLocaleString() ?? 0}</span>
            <span className="admin-stat-sub">{sub}</span>
          </div>
        ))}
      </div>

      {Object.keys(security.topAttackerIps || {}).length > 0 && (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <div className="admin-table-header">
              <span className="admin-table-title">{translateCatalogKey('ui.pages.admin.admindashboard.top-ip-ang-ngo-24h.32431fca')}</span>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{translateCatalogKey('ui.pages.admin.admindashboard.ip-address.33dedda4')}</th>
                  <th>{translateCatalogKey('ui.pages.admin.admindashboard.so-su-kien.c3305359')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(security.topAttackerIps)
                  .sort(([, a], [, b]) => b - a)
                  .map(([ip, count], index) => (
                    <tr key={ip}>
                      <td>{index + 1}</td>
                      <td><code style={{ color: '#e74c3c' }}>{ip}</code></td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: '#555', marginTop: 20 }}>
        {translateCatalogKey('ui.pages.admin.admindashboard.mot-so-du-lieu-bao-mat-runtime-van-l.857d97a3')}
      </div>
    </div>
  );
};

export default AdminDashboard;
