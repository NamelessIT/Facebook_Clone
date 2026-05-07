import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle, Trash2, ShieldCheck } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [banModal, setBanModal] = useState(null);
  const [banReason, setBanReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminService.getUsers({ page, pageSize: 20, search: search || undefined, filter: filter || undefined });
      setUsers(r.data.data);
      setPagination(r.data.pagination);
    } catch {
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);

  const handleBan = async () => {
    if (!banModal || !banReason.trim()) return;
    try {
      await adminService.banUser(banModal.id, banReason);
      toast.success(`Đã ban ${banModal.firstName}`);
      setBanModal(null);
      setBanReason('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi ban user');
    }
  };

  const handleUnban = async (u) => {
    try {
      await adminService.unbanUser(u.id);
      toast.success(`Đã unban ${u.firstName}`);
      load();
    } catch {
      toast.error('Lỗi unban user');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Xóa tài khoản "${u.firstName} ${u.lastName}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await adminService.deleteUser(u.id);
      toast.success('Đã xóa người dùng');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi xóa user');
    }
  };

  const handleToggleAdmin = async (u) => {
    try {
      const r = await adminService.toggleAdmin(u.id);
      toast.success(r.data.message);
      load();
    } catch {
      toast.error('Lỗi thay đổi quyền admin');
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Quản lý người dùng</h1>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Danh sách người dùng</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: '#666' }} />
            <input
              className="admin-search"
              style={{ paddingLeft: 28 }}
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="admin-filter-select" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="banned">Đã ban</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="admin-empty">Không có người dùng nào.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#888' }}>{u.firstName?.[0]}</div>
                      }
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{u.firstName} {u.lastName}</div>
                        {u.isAdmin && <span className="badge badge--admin">Admin</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#888' }}>{u.email}</td>
                  <td>
                    {u.isBanned
                      ? <span className="badge badge--banned">Bị ban</span>
                      : u.isOnline
                        ? <span className="badge badge--active">Online</span>
                        : <span style={{ fontSize: 12, color: '#666' }}>Offline</span>
                    }
                  </td>
                  <td style={{ color: '#666', fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td>
                    <div className="admin-actions">
                      {u.isBanned
                        ? <button className="admin-btn admin-btn--unban" onClick={() => handleUnban(u)}>
                            <CheckCircle size={12} /> Unban
                          </button>
                        : !u.isAdmin && (
                          <button className="admin-btn admin-btn--ban" onClick={() => setBanModal(u)}>
                            <Ban size={12} /> Ban
                          </button>
                        )
                      }
                      <button className="admin-btn admin-btn--admin" onClick={() => handleToggleAdmin(u)}>
                        <ShieldCheck size={12} /> {u.isAdmin ? 'Bỏ Admin' : 'Cấp Admin'}
                      </button>
                      {!u.isAdmin && (
                        <button className="admin-btn admin-btn--delete" onClick={() => handleDelete(u)}>
                          <Trash2 size={12} /> Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
            <span className="admin-pagination-info">Trang {page} / {pagination.totalPages}</span>
            <button className="admin-pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: 24, width: 360 }}>
            <h3 style={{ color: '#fff', margin: '0 0 12px' }}>Ban: {banModal.firstName} {banModal.lastName}</h3>
            <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 16px' }}>Lý do ban sẽ được lưu và gửi đến người dùng.</p>
            <input
              className="admin-search"
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
              placeholder="Nhập lý do ban..."
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="admin-btn" style={{ background: '#2a2d3a', color: '#ccc' }} onClick={() => { setBanModal(null); setBanReason(''); }}>Hủy</button>
              <button className="admin-btn admin-btn--ban" disabled={!banReason.trim()} onClick={handleBan}>Xác nhận Ban</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
