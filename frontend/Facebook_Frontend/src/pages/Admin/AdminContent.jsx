import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, RotateCcw, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../services/adminService';

const CONFIG = {
  posts: {
    title: 'Quan ly bai viet',
    tableTitle: 'Danh sach bai viet',
    load: adminService.getPosts,
    remove: adminService.deletePost,
    restore: adminService.restorePost,
    banAuthor: adminService.banPostAuthor,
    empty: 'Khong co bai viet nao.',
    contentLabel: 'Noi dung',
    itemLabel: 'post',
  },
  reels: {
    title: 'Quan ly reels',
    tableTitle: 'Danh sach reels',
    load: adminService.getReels,
    remove: adminService.deleteReel,
    restore: adminService.restoreReel,
    banAuthor: adminService.banReelAuthor,
    empty: 'Khong co reel nao.',
    contentLabel: 'Caption / tieu de',
    itemLabel: 'reel',
  },
};

const AdminContent = ({ type }) => {
  const config = useMemo(() => CONFIG[type], [type]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await config.load({ page, pageSize: 20, search: search || undefined });
      setItems(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || `Khong the tai ${type}`);
    } finally {
      setLoading(false);
    }
  }, [config, page, search, type]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item) => {
    if (!window.confirm(`Xoa ${config.itemLabel} nay khoi he thong hien thi?`)) return;
    try {
      await config.remove(item.id);
      toast.success('Da xoa noi dung');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Khong the xoa noi dung');
    }
  };

  const handleRestore = async (item) => {
    try {
      await config.restore(item.id);
      toast.success('Da khoi phuc noi dung');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Khong the khoi phuc noi dung');
    }
  };

  const handleBanAuthor = async (item) => {
    const email = item.author?.email || 'user nay';
    const reason = window.prompt(`Ly do cam ${email}?`, `Vi pham noi dung tren ${config.itemLabel} ${item.id}`);
    if (reason === null) return;
    try {
      await config.banAuthor(item.id, reason || `Vi pham noi dung tren ${config.itemLabel}`);
      toast.success('Da cam tac gia');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Khong the cam tac gia');
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">{config.title}</h1>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">{config.tableTitle}</span>
          <div className="admin-search-wrap">
            <Search size={14} className="admin-search-icon" />
            <input
              className="admin-search admin-search--with-icon"
              placeholder="Tim kiem..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">Dang tai...</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">{config.empty}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tac gia</th>
                <th>{config.contentLabel}</th>
                <th>Trang thai</th>
                <th>Tuong tac</th>
                <th>Ngay tao</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                      {item.author?.firstName} {item.author?.lastName}
                    </div>
                    <div style={{ fontSize: 12, color: '#777' }}>{item.author?.email}</div>
                    {item.author?.isBanned && <span className="badge badge--banned">Da bi cam</span>}
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    <div className="admin-content-snippet">
                      {type === 'posts'
                        ? item.content
                        : item.caption || item.title || 'Khong co noi dung'}
                    </div>
                  </td>
                  <td>
                    {item.isDeleted ? (
                      <span className="badge badge--banned">Da xoa</span>
                    ) : (
                      <span className="badge badge--active">Dang hien thi</span>
                    )}
                  </td>
                  <td style={{ color: '#888', fontSize: 12 }}>
                    {type === 'posts'
                      ? `${item.comments ?? 0} binh luan, ${item.reactions ?? 0} reaction`
                      : `${item.likes ?? 0} likes, ${item.viewsCount ?? 0} views`}
                  </td>
                  <td style={{ color: '#666', fontSize: 12 }}>
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <div className="admin-actions">
                      {item.isDeleted ? (
                        <button className="admin-btn admin-btn--unban" type="button" onClick={() => handleRestore(item)}>
                          <RotateCcw size={12} /> Khoi phuc
                        </button>
                      ) : (
                        <button className="admin-btn admin-btn--delete" type="button" onClick={() => handleDelete(item)}>
                          <Trash2 size={12} /> Xoa
                        </button>
                      )}
                      <button
                        className="admin-btn admin-btn--ban"
                        type="button"
                        disabled={item.author?.isBanned}
                        onClick={() => handleBanAuthor(item)}
                      >
                        <Ban size={12} /> Cam tac gia
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Truoc
            </button>
            <span className="admin-pagination-info">Trang {page} / {pagination.totalPages}</span>
            <button className="admin-pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContent;
