import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, FileText, Film, KeyRound, MessageSquare, ShieldOff, TrendingUp, Users, UsersRound } from 'lucide-react';
import adminService from '../../services/adminService';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then((response) => setData(response.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">Đang tải...</div>;
  if (!data) return <div className="admin-empty">Không thể tải dữ liệu.</div>;

  const { users, content, security, rbac } = data;
  const stats = [
    { label: 'Người dùng', value: users.total, sub: `+${users.newLast7Days} trong 7 ngày`, Icon: Users },
    { label: 'Đang online', value: users.activeNow, sub: 'Hiện tại', Icon: Activity, variant: 'success' },
    { label: 'Đã bị ban', value: users.banned, sub: 'Tài khoản', Icon: ShieldOff, variant: 'danger' },
    { label: 'Bài viết', value: content.totalPosts, sub: `${content.postsToday} hôm nay`, Icon: FileText },
    { label: 'Reels', value: content.totalReels, sub: `${content.deletedReels ?? 0} đã xóa`, Icon: Film },
    { label: 'Bình luận', value: content.totalComments, sub: 'Toàn hệ thống', Icon: MessageSquare },
    { label: 'Nhóm', value: content.totalGroups, sub: 'Community modules', Icon: UsersRound },
    { label: 'RBAC', value: rbac?.roleCount ?? 0, sub: `${rbac?.permissionCount ?? 0} permissions`, Icon: KeyRound, variant: 'success' },
    { label: 'IP bị chặn', value: security.blockedIps, sub: 'Đang active', Icon: AlertTriangle, variant: 'danger' },
    { label: 'Sự kiện 24h', value: security.eventsLast24h, sub: `${security.rateLimitHitsLast1h} rate limit/1h`, Icon: TrendingUp, variant: 'warn' },
  ];

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>

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
              <span className="admin-table-title">Top IP đáng ngờ (24h)</span>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>IP Address</th>
                  <th>Số sự kiện</th>
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
        Một số dữ liệu bảo mật runtime vẫn là in-memory và sẽ reset khi restart server.
      </div>
    </div>
  );
};

export default AdminDashboard;
