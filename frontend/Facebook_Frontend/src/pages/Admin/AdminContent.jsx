import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, RotateCcw, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../services/adminService';
import { useConfirm, usePrompt } from '../../contexts/useConfirm';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const CONFIG = {
  posts: {
    titleKey: 'admin.posts.title',
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
    titleKey: 'admin.reels.title',
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
  const confirm = useConfirm();
  const prompt = usePrompt();
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
      toast.error(error.response?.data?.message || translateCatalogKey('ui.pages.admin.admincontent.khong-the-tai-value0.93bc95f1', { value0: type }));
    } finally {
      setLoading(false);
    }
  }, [config, page, search, type]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item) => {
    const accepted = await confirm({
      title: translateCatalogKey('ui.pages.admin.admincontent.an-noi-dung.4ce59a62'),
      message: translateCatalogKey('admin.content.deleteDescription', { type: config.itemLabel }),
      detail: translateCatalogKey('ui.pages.admin.admincontent.admin-co-the-khoi-phuc-noi-dung-sau-.947a8b16'),
      confirmText: translateCatalogKey('ui.pages.admin.admincontent.an-noi-dung.ecf3d765'),
    });
    if (!accepted) return;
    try {
      await config.remove(item.id);
      toast.success(translateCatalogKey('ui.pages.admin.admincontent.da-xoa-noi-dung.dfe7002c'));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || translateCatalogKey('ui.pages.admin.admincontent.khong-the-xoa-noi-dung.8c11aa67'));
    }
  };

  const handleRestore = async (item) => {
    try {
      await config.restore(item.id);
      toast.success(translateCatalogKey('ui.pages.admin.admincontent.da-khoi-phuc-noi-dung.b3ff83f8'));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || translateCatalogKey('ui.pages.admin.admincontent.khong-the-khoi-phuc-noi-dung.d021c501'));
    }
  };

  const handleBanAuthor = async (item) => {
    const email = item.author?.email || 'user nay';
    const reason = await prompt({
      title: translateCatalogKey('ui.pages.admin.admincontent.cam-tac-gia.9e5a3360'),
      message: translateCatalogKey('admin.content.banReasonPrompt', { email }),
      defaultValue: translateCatalogKey('admin.content.defaultBanReason', { type: config.itemLabel, id: item.id }),
      confirmText: translateCatalogKey('ui.pages.admin.admincontent.xac-nhan-cam.bc27991c'),
    });
    if (reason === null) return;
    try {
      await config.banAuthor(item.id, reason || `Vi pham noi dung tren ${config.itemLabel}`);
      toast.success(translateCatalogKey('ui.pages.admin.admincontent.da-cam-tac-gia.5cf94dae'));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || translateCatalogKey('ui.pages.admin.admincontent.khong-the-cam-tac-gia.29688cbb'));
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">{translateCatalogKey(config.titleKey)}</h1>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">{config.tableTitle}</span>
          <div className="admin-search-wrap">
            <Search size={14} className="admin-search-icon" />
            <input
              className="admin-search admin-search--with-icon"
              placeholder={translateCatalogKey('ui.pages.admin.admincontent.tim-kiem.7a23b6a3')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">{translateCatalogKey('ui.pages.admin.admincontent.dang-tai.8efbffa5')}</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">{config.empty}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{translateCatalogKey('ui.pages.admin.admincontent.tac-gia.6bf22a17')}</th>
                <th>{config.contentLabel}</th>
                <th>{translateCatalogKey('ui.pages.admin.admincontent.trang-thai.949ccef0')}</th>
                <th>{translateCatalogKey('ui.pages.admin.admincontent.tuong-tac.6eff8174')}</th>
                <th>{translateCatalogKey('ui.pages.admin.admincontent.ngay-tao.a23e5564')}</th>
                <th>{translateCatalogKey('ui.pages.admin.admincontent.hanh-dong.bf3443dc')}</th>
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
                    {item.author?.isBanned && <span className="badge badge--banned">{translateCatalogKey('ui.pages.admin.admincontent.da-bi-cam.ff9a4521')}</span>}
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    <div className="admin-content-snippet">
                      {type === "posts"
                        ? item.content
                        : item.caption || item.title || translateCatalogKey('ui.pages.admin.admincontent.khong-co-noi-dung.e471b2db')}
                    </div>
                  </td>
                  <td>
                    {item.isDeleted ? (
                      <span className="badge badge--banned">{translateCatalogKey('ui.pages.admin.admincontent.da-xoa.6612ebd2')}</span>
                    ) : (
                      <span className="badge badge--active">{translateCatalogKey('ui.pages.admin.admincontent.dang-hien-thi.5f3d7cad')}</span>
                    )}
                  </td>
                  <td style={{ color: '#888', fontSize: 12 }}>
                    {type === "posts"
                      ? translateCatalogKey('ui.pages.admin.admincontent.value0-binh-luan-value1-reaction.e098c3b8', { value0: item.comments ?? 0, value1: item.reactions ?? 0 })
                      : translateCatalogKey('ui.pages.admin.admincontent.value0-likes-value1-views.01f3de1c', { value0: item.likes ?? 0, value1: item.viewsCount ?? 0 })}
                  </td>
                  <td style={{ color: '#666', fontSize: 12 }}>
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td>
                    <div className="admin-actions">
                      {item.isDeleted ? (
                        <button className="admin-btn admin-btn--unban" type="button" onClick={() => handleRestore(item)}>
                          <RotateCcw size={12} /> {translateCatalogKey('ui.pages.admin.admincontent.khoi-phuc.fa177086')}
                        </button>
                      ) : (
                        <button className="admin-btn admin-btn--delete" type="button" onClick={() => handleDelete(item)}>
                          <Trash2 size={12} /> {translateCatalogKey('ui.pages.admin.admincontent.xoa.6deddac5')}
                        </button>
                      )}
                      <button
                        className="admin-btn admin-btn--ban"
                        type="button"
                        disabled={item.author?.isBanned}
                        onClick={() => handleBanAuthor(item)}
                      >
                        <Ban size={12} /> {translateCatalogKey('ui.pages.admin.admincontent.cam-tac-gia.27f37b16')}
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
              {translateCatalogKey('ui.pages.admin.admincontent.truoc.82d6836c')}
            </button>
            <span className="admin-pagination-info">{translateCatalogKey('ui.components.friendship.friendlist.trang.6d3a285d')} {page} / {pagination.totalPages}</span>
            <button className="admin-pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              {translateCatalogKey('ui.pages.admin.admincontent.sau.40f64e76')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContent;
