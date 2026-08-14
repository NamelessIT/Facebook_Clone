import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle, Trash2, ShieldCheck, UserPlus, Eye, EyeOff, Copy, X, ClipboardList, FileText, Film, Radio, MessageCircle, Flag, MessagesSquare, ExternalLink, LockKeyhole, Image as ImageIcon, Users } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from '../../shared/appToast';
import { LIMITS, TIMERS } from '../../shared/generated/constants';
import { useConfirm } from '../../contexts/useConfirm';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getImageUrl } from '../../utils/formatUrl';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import useNonOverlappingPolling from '../../hooks/useNonOverlappingPolling';

const normalizeInvestigation = (value) => ({
  ...value,
  summary: { conversations: 0, messages: 0, ...(value?.summary || {}) },
  posts: value?.posts || [],
  reels: value?.reels || [],
  lives: value?.lives || [],
  postComments: value?.postComments || [],
  liveComments: value?.liveComments || [],
  conversations: value?.conversations || [],
  reports: value?.reports || [],
});

const AdminUsers = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [creationRoles, setCreationRoles] = useState([]);
  const [canCreateUsers, setCanCreateUsers] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', email: '', password: '', roleIds: [] });
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [banModal, setBanModal] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [investigation, setInvestigation] = useState(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [investigationTab, setInvestigationTab] = useState('posts');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, creationOptionsResponse] = await Promise.all([
        adminService.getUsers({ page, pageSize: 20, search: debouncedSearch || undefined, filter: filter || undefined, targetId: searchParams.get('targetId') || undefined }),
        adminService.getUserCreationOptions().catch((error) => {
          if (error.response?.status === 403) return null;
          throw error;
        }),
      ]);
      setUsers(usersResponse.data.data);
      setPagination(usersResponse.data.pagination);
      setCanCreateUsers(Boolean(creationOptionsResponse?.data?.data?.canCreateUsers));
      setCreationRoles(creationOptionsResponse?.data?.data?.roles || []);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.pages.admin.adminusers.khong-the-tai-danh-sach-nguoi-dung.e5a7c59d'), { context: "admin.users.load" });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filter, searchParams]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const targetId = searchParams.get('targetId');
    if (!targetId) return;
    setInvestigationLoading(true);
    adminService.getUserInvestigation(targetId)
      .then((response) => { setInvestigation(normalizeInvestigation(response.data.data)); setInvestigationTab('posts'); })
      .catch((error) => toast.apiError(error, 'Không thể tải hồ sơ điều tra người dùng.', { context: 'admin.users.investigation' }))
      .finally(() => setInvestigationLoading(false));
  }, [searchParams]);

  const openInvestigation = async (userId) => {
    setInvestigationLoading(true);
    try {
      const response = await adminService.getUserInvestigation(userId);
      setInvestigation(normalizeInvestigation(response.data.data));
      setInvestigationTab('posts');
    } catch (error) {
      toast.apiError(error, 'Không thể tải hồ sơ điều tra người dùng.', { context: 'admin.users.investigation' });
    } finally {
      setInvestigationLoading(false);
    }
  };

  useNonOverlappingPolling(load, TIMERS.adminUsersRefreshMs, { immediate: false });

  const handleBan = async () => {
    if (!banModal || !banReason.trim()) return;
    try {
      await adminService.banUser(banModal.id, banReason);
      toast.success(translateCatalogKey('ui.pages.admin.adminusers.a-ban-value0.78c7e386', { value0: banModal.firstName }));
      setBanModal(null);
      setBanReason('');
      load();
    } catch (e) {
      toast.apiError(e, translateCatalogKey('ui.pages.admin.adminusers.loi-ban-user.516a1edb'), { context: "admin.users.ban" });
    }
  };

  const handleUnban = async (u) => {
    try {
      await adminService.unbanUser(u.id);
      toast.success(translateCatalogKey('ui.pages.admin.adminusers.a-unban-value0.cf6ea679', { value0: u.firstName }));
      load();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.pages.admin.adminusers.loi-unban-user.fbe5c264'), { context: "admin.users.unban" });
    }
  };

  const handleDelete = async (u) => {
    const accepted = await confirm({
      title: translateCatalogKey('ui.pages.admin.adminusers.xoa-tai-khoan.63f27e9b'),
      message: translateCatalogKey('admin.users.deleteDescription', { name: `${u.firstName} ${u.lastName}`.trim() }),
      detail: translateCatalogKey('reels.irreversible'),
      confirmText: translateCatalogKey('ui.pages.admin.adminusers.xoa-tai-khoan.e0c1ab6e'),
    });
    if (!accepted) return;
    try {
      await adminService.deleteUser(u.id);
      toast.success(translateCatalogKey('ui.pages.admin.adminusers.a-xoa-nguoi-dung.e72142e0'));
      load();
    } catch (e) {
      toast.apiError(e, translateCatalogKey('ui.pages.admin.adminusers.loi-xoa-user.6292a721'), { context: "admin.users.delete" });
    }
  };

  const handleAssignRole = async (u, roleId) => {
    try {
      await adminService.setUserRoles(u.id, roleId ? [roleId] : []);
      toast.success(translateCatalogKey('admin.roles.assignmentUpdated'));
      load();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('admin.roles.assignmentFailed'), { context: "admin.users.roles.update" });
    }
  };

  const updateCreateForm = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const toggleCreateRole = (roleId) => {
    setCreateForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  };

  const closeCreateModal = () => {
    if (createSubmitting) return;
    setCreateModalOpen(false);
    setShowCreatePassword(false);
    setCreateForm({ firstName: '', lastName: '', email: '', password: '', roleIds: [] });
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim() ||
        createForm.password.length < LIMITS.passwordMinLength || createForm.roleIds.length === 0) {
      toast.error(translateCatalogKey('admin.users.createValidation'));
      return;
    }

    setCreateSubmitting(true);
    try {
      await adminService.createUser({
        ...createForm,
        email: createForm.email.trim(),
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
      });
      setCreatedCredentials({ username: createForm.email.trim(), password: createForm.password });
      setCreateModalOpen(false);
      setShowCreatePassword(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: '', roleIds: [] });
      toast.success(translateCatalogKey('admin.users.createSuccess'));
      await load();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('admin.users.createFailed'), { context: "admin.users.create" });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(
      `${translateCatalogKey('admin.users.username')}: ${createdCredentials.username}\n${translateCatalogKey('admin.users.password')}: ${createdCredentials.password}`
    );
    toast.success(translateCatalogKey('admin.users.credentialsCopied'));
  };

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <h1 className="admin-page-title">{translateCatalogKey('admin.users.title')}</h1>
          <p className="admin-page-subtitle">{translateCatalogKey('admin.users.createHierarchyHint')}</p>
        </div>
        {canCreateUsers && creationRoles.length > 0 && (
          <button className="admin-btn admin-btn--primary admin-btn--bulk" type="button" onClick={() => setCreateModalOpen(true)}>
            <UserPlus size={16} /> {translateCatalogKey('admin.users.createAccount')}
          </button>
        )}
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">{translateCatalogKey('ui.pages.admin.adminusers.danh-sach-nguoi-dung.0905277e')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: '#666' }} />
            <input
              className="admin-search"
              style={{ paddingLeft: 28 }}
              placeholder={translateCatalogKey('chat.search')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="admin-filter-select" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
            <option value="">{translateCatalogKey('ui.pages.admin.adminusers.tat-ca.bb1e6fd0')}</option>
            <option value="online">{translateCatalogKey('ui.pages.admin.adminusers.online.5ed1c623')}</option>
            <option value="banned">{translateCatalogKey('ui.pages.admin.adminusers.a-ban.0218bad9')}</option>
            <option value="admin">{translateCatalogKey('ui.components.layout.mainlayout.admin.ac03e484')}</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">{translateCatalogKey('common.loading')}</div>
        ) : users.length === 0 ? (
          <div className="admin-empty">{translateCatalogKey('ui.pages.admin.adminusers.khong-co-nguoi-dung-nao.e4e19948')}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{translateCatalogKey('chat.userFallback')}</th>
                <th>{translateCatalogKey('ui.pages.admin.adminusers.email.518b5ead')}</th>
                <th>{translateCatalogKey('ui.pages.admin.adminusers.trang-thai.50048e05')}</th>
                <th>{translateCatalogKey('ui.pages.admin.adminusers.ngay-tao.029fd07b')}</th>
                <th>{translateCatalogKey('ui.pages.admin.adminsecurity.hanh-ong.075838aa')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const currentRoleId = (u.roles || [])[0]?.id || '';
                const currentRole = (u.roles || [])[0] || null;
                const isProtectedAdmin = u.isAdmin || (currentRole?.level ?? 0) >= LIMITS.adminRoleMinLevel;
                const canAssignCurrentRole = !currentRoleId || creationRoles.some((role) => role.id === currentRoleId);
                return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div className="admin-user-avatar-fallback">{u.firstName?.[0]}</div>
                      }
                      <div>
                        <div className="admin-user-display-name">{u.firstName} {u.lastName}</div>
                        {(u.roles || []).map((role) => (
                          <span key={role.id} className="badge badge--admin">{role.displayName}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="admin-user-email">{u.email}</td>
                  <td>
                    {u.isBanned
                      ? <span className="badge badge--banned">{translateCatalogKey('ui.pages.admin.adminusers.bi-ban.522f1fc7')}</span>
                      : u.isOnline
                        ? <span className="badge badge--active">{translateCatalogKey('ui.pages.admin.adminusers.online.5ed1c623')}</span>
                        : <span className="admin-user-meta">{translateCatalogKey('ui.pages.admin.adminusers.offline.c13ccecc')}</span>
                    }
                  </td>
                  <td className="admin-user-meta">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--reset" onClick={() => openInvestigation(u.id)}>
                        <ClipboardList size={12} /> Điều tra
                      </button>
                      {u.isBanned
                        ? <button className="admin-btn admin-btn--unban" onClick={() => handleUnban(u)}>
                            <CheckCircle size={12} /> {translateCatalogKey('ui.pages.admin.adminusers.unban.1cd691f5')}
                          </button>
                        : !isProtectedAdmin && (
                          <button className="admin-btn admin-btn--ban" onClick={() => setBanModal(u)}>
                            <Ban size={12} /> {translateCatalogKey('ui.pages.admin.adminusers.ban.9c469b98')}
                          </button>
                        )
                      }
                      <label className="admin-role-assign">
                        <ShieldCheck size={12} />
                        <select
                          value={currentRoleId}
                          onChange={(event) => handleAssignRole(u, event.target.value)}
                          aria-label={translateCatalogKey('admin.roles.assignRole')}
                          disabled={!canAssignCurrentRole}
                        >
                          <option value="">{translateCatalogKey('admin.roles.unassigned')}</option>
                          {!canAssignCurrentRole && currentRole && (
                            <option value={currentRole.id}>{currentRole.displayName}</option>
                          )}
                          {creationRoles.map((role) => (
                            <option key={role.id} value={role.id}>{role.displayName}</option>
                          ))}
                        </select>
                      </label>
                      {!isProtectedAdmin && (
                        <button className="admin-btn admin-btn--delete" onClick={() => handleDelete(u)}>
                          <Trash2 size={12} /> {translateCatalogKey('common.delete')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{translateCatalogKey('ui.pages.admin.adminusers.truoc.a49056c7')}</button>
            <span className="admin-pagination-info">{translateCatalogKey('ui.components.friendship.friendlist.trang.6d3a285d')} {page} / {pagination.totalPages}</span>
            <button className="admin-pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>{translateCatalogKey('ui.pages.admin.adminusers.sau.4b739fb7')}</button>
          </div>
        )}
      </div>

      {createModalOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={closeCreateModal}>
          <form className="admin-account-modal" onSubmit={handleCreateUser} onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-role-modal-header">
              <div>
                <h2>{translateCatalogKey('admin.users.createAccount')}</h2>
                <p>{translateCatalogKey('admin.users.passwordOneTimeHint')}</p>
              </div>
              <button className="admin-icon-btn" type="button" onClick={closeCreateModal} aria-label={translateCatalogKey('common.close')}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-account-form">
              <label>
                <span>{translateCatalogKey('admin.users.firstName')}</span>
                <input autoFocus value={createForm.firstName} onChange={(event) => updateCreateForm('firstName', event.target.value)} maxLength={50} required />
              </label>
              <label>
                <span>{translateCatalogKey('admin.users.lastName')}</span>
                <input value={createForm.lastName} onChange={(event) => updateCreateForm('lastName', event.target.value)} maxLength={50} required />
              </label>
              <label className="admin-account-field--wide">
                <span>{translateCatalogKey('admin.users.usernameEmail')}</span>
                <input type="email" value={createForm.email} onChange={(event) => updateCreateForm('email', event.target.value)} maxLength={255} autoComplete="off" required />
              </label>
              <label className="admin-account-field--wide">
                <span>{translateCatalogKey('admin.users.initialPassword')}</span>
                <div className="admin-password-input">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(event) => updateCreateForm('password', event.target.value)}
                    minLength={LIMITS.passwordMinLength}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" onClick={() => setShowCreatePassword((visible) => !visible)} aria-label={translateCatalogKey('admin.users.togglePassword')}>
                    {showCreatePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <small>{translateCatalogKey('admin.users.passwordRules', { count: LIMITS.passwordMinLength })}</small>
              </label>

              <fieldset className="admin-account-roles">
                <legend>{translateCatalogKey('admin.users.assignLowerRoles')}</legend>
                {creationRoles.map((role) => (
                  <label key={role.id} className="admin-account-role-option">
                    <input type="checkbox" checked={createForm.roleIds.includes(role.id)} onChange={() => toggleCreateRole(role.id)} />
                    <span>{role.displayName}</span>
                    <small>{translateCatalogKey('admin.roles.level')} {role.level}</small>
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="admin-role-modal-footer">
              <button className="admin-btn admin-btn--reset" type="button" onClick={closeCreateModal}>{translateCatalogKey('common.cancel')}</button>
              <button className="admin-btn admin-btn--primary" type="submit" disabled={createSubmitting}>
                <UserPlus size={14} /> {createSubmitting ? translateCatalogKey('common.loading') : translateCatalogKey('admin.users.createAccount')}
              </button>
            </div>
          </form>
        </div>
      )}

      {createdCredentials && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-credentials-modal" role="dialog" aria-modal="true">
            <div className="admin-role-modal-header">
              <div>
                <h2>{translateCatalogKey('admin.users.accountReady')}</h2>
                <p>{translateCatalogKey('admin.users.credentialsWarning')}</p>
              </div>
            </div>
            <div className="admin-credentials-list">
              <div><span>{translateCatalogKey('admin.users.username')}</span><strong>{createdCredentials.username}</strong></div>
              <div><span>{translateCatalogKey('admin.users.password')}</span><strong>{createdCredentials.password}</strong></div>
            </div>
            <div className="admin-role-modal-footer">
              <button className="admin-btn admin-btn--reset" type="button" onClick={copyCredentials}><Copy size={14} /> {translateCatalogKey('admin.users.copyCredentials')}</button>
              <button className="admin-btn admin-btn--primary" type="button" onClick={() => setCreatedCredentials(null)}>{translateCatalogKey('admin.users.savedCredentials')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-ban-dialog">
            <h3>Ban: {banModal.firstName} {banModal.lastName}</h3>
            <p>{translateCatalogKey('ui.pages.admin.adminusers.ly-do-ban-se-uoc-luu-va-gui-en-nguoi.eb04c0ea')}</p>
            <input
              className="admin-search"
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
              placeholder={translateCatalogKey('ui.pages.admin.adminusers.nhap-ly-do-ban.0d7f00fd')}
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
            />
            <div className="admin-ban-actions">
              <button className="admin-btn admin-btn--reset" onClick={() => { setBanModal(null); setBanReason(''); }}>{translateCatalogKey('common.cancel')}</button>
              <button className="admin-btn admin-btn--ban" disabled={!banReason.trim()} onClick={handleBan}>{translateCatalogKey('ui.pages.admin.adminusers.xac-nhan-ban.98982c75')}</button>
            </div>
          </div>
        </div>
      )}

      {(investigation || investigationLoading) && (
        <div className="admin-modal-backdrop admin-investigation-backdrop" role="presentation" onMouseDown={() => !investigationLoading && setInvestigation(null)}>
          <section className="admin-investigation-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="admin-investigation-header">
              <div>
                <span className="admin-investigation-kicker"><ClipboardList size={15} /> Hồ sơ điều tra</span>
                <h2>{investigation ? `${investigation.user.firstName} ${investigation.user.lastName}` : 'Đang tải...'}</h2>
                <p>Hiển thị cả nội dung riêng tư hoặc đã xóa để phục vụ kiểm duyệt.</p>
              </div>
              <button type="button" className="admin-icon-btn" onClick={() => setInvestigation(null)} disabled={investigationLoading} aria-label="Đóng"><X size={18} /></button>
            </header>
            {investigation && <div className="admin-investigation-body">
              <div className="admin-investigation-summary admin-investigation-summary--six">
                <div><FileText /><span>Bài viết</span><strong>{investigation.summary.posts}</strong><small>{investigation.summary.deletedPosts} đã xóa</small></div>
                <div><Film /><span>Reels</span><strong>{investigation.summary.reels}</strong><small>{investigation.summary.deletedReels} đã xóa</small></div>
                <div><Radio /><span>Live</span><strong>{investigation.summary.lives}</strong></div>
                <div><MessageCircle /><span>Bình luận</span><strong>{investigation.summary.comments}</strong></div>
                <div><MessagesSquare /><span>Messenger</span><strong>{investigation.summary.messages}</strong><small>{investigation.summary.conversations} cuộc trò chuyện</small></div>
                <div><Flag /><span>Báo cáo</span><strong>{investigation.summary.reports}</strong></div>
              </div>

              <nav className="admin-investigation-tabs" aria-label="Nội dung hồ sơ điều tra">
                {[
                  ['posts', 'Bài viết và bình luận', FileText],
                  ['comments', 'Bình luận của người dùng', MessageCircle],
                  ['lives', 'Livestream', Radio],
                  ['messages', 'Messenger', MessagesSquare],
                  ['reports', 'Báo cáo & hình phạt', Flag],
                ].map(([value, label, Icon]) => <button key={value} type="button" className={investigationTab === value ? 'active' : ''} onClick={() => setInvestigationTab(value)}><Icon size={15} />{label}</button>)}
              </nav>

              {investigationTab === 'posts' && <section className="admin-investigation-panel">
                <header><div><h3>Toàn bộ bài viết</h3><p>Bao gồm nội dung riêng tư, đã xóa, media và mọi bình luận trong bài.</p></div></header>
                <div className="admin-investigation-content-list">
                  {investigation.posts.length === 0 ? <p className="admin-empty">Người dùng chưa có bài viết.</p> : investigation.posts.map((post) => <article className="admin-investigation-post" key={post.id}>
                    <div className="admin-investigation-item-head">
                      <div><strong>Bài viết #{post.id.slice(0, 8)}</strong>{post.isDeleted && <span className="badge badge--banned">Đã xóa</span>}{post.privacy === 3 && <span className="badge"><LockKeyhole size={11} /> Chỉ mình tôi</span>}</div>
                      <button type="button" onClick={() => navigate(`/admin/posts?targetId=${post.id}`)}><ExternalLink size={14} /> Mở chi tiết</button>
                    </div>
                    <p className="admin-investigation-post-content">{post.content || 'Bài viết không có nội dung chữ.'}</p>
                    {post.medias?.length > 0 && <div className="admin-investigation-media">{post.medias.map((media) => media.mediaType === 1
                      ? <video key={media.id} controls preload="metadata" src={getImageUrl(media.url, 'videos')} />
                      : <img key={media.id} loading="lazy" src={getImageUrl(media.url, 'posts')} alt="Bằng chứng trong bài viết" />)}</div>}
                    <div className="admin-investigation-meta"><span>{post.commentCount} bình luận</span><span>{post.mediaCount} media</span><time>{new Date(post.createdAt).toLocaleString('vi-VN')}</time></div>
                    <div className="admin-investigation-comments">
                      <h4><MessageCircle size={14} /> Bình luận trong bài</h4>
                      {post.comments?.length === 0 ? <p>Chưa có bình luận.</p> : post.comments.map((comment) => <div key={comment.id} className="admin-investigation-comment">
                        <strong>{comment.authorName}</strong>{comment.isDeleted && <span className="badge badge--banned">Đã xóa</span>}
                        <p>{comment.content}</p><time>{new Date(comment.createdAt).toLocaleString('vi-VN')}</time>
                      </div>)}
                    </div>
                  </article>)}
                </div>
              </section>}

              {investigationTab === 'comments' && <section className="admin-investigation-panel">
                <header><div><h3>Bình luận do người dùng gửi</h3><p>Đối chiếu bình luận với bài viết hoặc livestream gốc.</p></div></header>
                <div className="admin-investigation-content-list">
                  {[...investigation.postComments.map((comment) => ({ ...comment, source: 'post' })), ...investigation.liveComments.map((comment) => ({ ...comment, source: 'live' }))]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((comment) => <article key={`${comment.source}-${comment.id}`} className="admin-investigation-comment-card">
                      <div className="admin-investigation-item-head"><div><strong>{comment.source === 'post' ? 'Bình luận bài viết' : 'Bình luận livestream'}</strong>{comment.isDeleted && <span className="badge badge--banned">Đã xóa</span>}</div>
                        {comment.source === 'post'
                          ? <button type="button" onClick={() => navigate(`/admin/posts?targetId=${comment.postId}`)}><ExternalLink size={14} /> Mở bài viết</button>
                          : (comment.liveStatus === 1 || comment.recordingUrl)
                            ? <button type="button" onClick={() => navigate(`/admin/lives?targetId=${comment.liveSessionId}`)}><ExternalLink size={14} /> {comment.liveStatus === 1 ? 'Xem trực tiếp' : 'Xem bản ghi'}</button>
                            : <span className="admin-investigation-unavailable">Đã hết – không còn bản ghi</span>}
                      </div>
                      <blockquote>{comment.content}</blockquote>
                      <p>{comment.source === 'post' ? `Trong bài của ${comment.postOwnerName}: ${comment.postContent || 'không có nội dung chữ'}` : `Trong live: ${comment.liveTitle || 'Không có tiêu đề'}`}</p>
                      <time>{new Date(comment.createdAt).toLocaleString('vi-VN')}</time>
                    </article>)}
                </div>
              </section>}

              {investigationTab === 'lives' && <section className="admin-investigation-panel">
                <header><div><h3>Lịch sử livestream</h3><p>Live đã hết hạn bằng chứng vẫn được ghi nhận trong lịch sử, nhưng không thể phát lại.</p></div></header>
                <div className="admin-investigation-content-list admin-investigation-live-grid">
                  {investigation.lives.map((live) => <article key={live.id}>
                    <div className="admin-investigation-item-head"><div><strong>{live.title || 'Livestream không có tiêu đề'}</strong><span className="badge">#{live.status}</span></div>
                      {(live.status === 1 || live.recordingUrl) ? <button type="button" onClick={() => navigate(`/admin/lives?targetId=${live.id}`)}><ExternalLink size={14} /> {live.status === 1 ? 'Xem trực tiếp' : 'Xem lại'}</button> : null}
                    </div>
                    <p>{live.description || 'Không có mô tả.'}</p>
                    <div className="admin-investigation-meta"><span>{live.commentCount} bình luận</span><span>{live.isEvidenceOnHold ? 'Đang giữ bằng chứng' : live.recordingUrl ? 'Còn bản ghi' : 'Đã hết – không còn bản ghi'}</span></div>
                    <time>{new Date(live.startedAt).toLocaleString('vi-VN')}</time>
                  </article>)}
                </div>
              </section>}

              {investigationTab === 'messages' && <section className="admin-investigation-panel">
                <header><div><h3>Lịch sử Messenger phục vụ kiểm duyệt</h3><p>Hiển thị cả tin đã chỉnh sửa, thu hồi hoặc bị ẩn phía người dùng. Quyền này chỉ dành cho kiểm duyệt viên có quyền xem người dùng.</p></div></header>
                <div className="admin-investigation-conversations">
                  {investigation.conversations.length === 0 ? <p className="admin-empty">Chưa có cuộc trò chuyện.</p> : investigation.conversations.map((conversation) => <details key={conversation.id}>
                    <summary><span><Users size={15} />{conversation.members.map((member) => member.name).join(', ')}</span><small>{conversation.messages.length} tin gần nhất</small></summary>
                    <div className="admin-investigation-message-list">{conversation.messages.map((message) => <div key={message.id} className="admin-investigation-message">
                      <div><strong>{message.senderName}</strong>{message.isDeleted && <span className="badge badge--banned">Bản cũ đã ẩn</span>}{message.isRecalled && <span className="badge">Đã thu hồi</span>}{message.isPinned && <span className="badge">Đã ghim</span>}</div>
                      <p>{message.content || 'Không có nội dung chữ'}</p>
                      <time>{new Date(message.createdAt).toLocaleString('vi-VN')}{message.editedAt ? ` · sửa ${new Date(message.editedAt).toLocaleString('vi-VN')}` : ''}</time>
                    </div>)}</div>
                  </details>)}
                </div>
              </section>}

              {investigationTab === 'reports' && <section className="admin-investigation-panel">
                <header><div><h3>Lịch sử báo cáo và hình phạt</h3><p>Căn cứ, quyết định, thời hạn và trạng thái khôi phục.</p></div></header>
                <div className="admin-investigation-content-list">
                  {investigation.reports.length === 0 ? <p className="admin-empty">Chưa có báo cáo.</p> : investigation.reports.map((report) => <article key={report.id}>
                    <div><strong>{report.reason}</strong><span className="badge">Trạng thái #{report.status}</span><span className="badge">Xử lý #{report.resolutionAction}</span></div>
                    <p>{report.details || report.resolutionNote || 'Không có ghi chú'}</p>
                    <time>{new Date(report.createdAt).toLocaleString('vi-VN')}{report.punishmentEndsAt ? ` · hết hạn ${new Date(report.punishmentEndsAt).toLocaleString('vi-VN')}` : ''}</time>
                  </article>)}
                </div>
              </section>}
            </div>}
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
