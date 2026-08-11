import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle, Trash2, ShieldCheck, UserPlus, Eye, EyeOff, Copy, X } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from '../../shared/appToast';
import { LIMITS, TIMERS } from '../../shared/generated/constants';
import { useConfirm } from '../../contexts/useConfirm';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { useSearchParams } from 'react-router-dom';

const AdminUsers = () => {
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, creationOptionsResponse] = await Promise.all([
        adminService.getUsers({ page, pageSize: 20, search: search || undefined, filter: filter || undefined }),
        adminService.getUserCreationOptions().catch((error) => {
          if (error.response?.status === 403) return null;
          throw error;
        }),
      ]);
      const targetId = searchParams.get('targetId');
      setUsers(targetId ? usersResponse.data.data.filter((item) => item.id === targetId) : usersResponse.data.data);
      setPagination(usersResponse.data.pagination);
      setCanCreateUsers(Boolean(creationOptionsResponse?.data?.data?.canCreateUsers));
      setCreationRoles(creationOptionsResponse?.data?.data?.roles || []);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.pages.admin.adminusers.khong-the-tai-danh-sach-nguoi-dung.e5a7c59d'), { context: "admin.users.load" });
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, searchParams]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timerId = window.setInterval(load, TIMERS.adminUsersRefreshMs);
    return () => window.clearInterval(timerId);
  }, [load]);

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
    </div>
  );
};

export default AdminUsers;
