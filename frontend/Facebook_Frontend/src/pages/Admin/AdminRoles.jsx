import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../services/adminService';
import { useConfirm } from '../../contexts/useConfirm';
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const emptyRoleForm = { name: '', displayName: '', level: 10, permissionIds: [] };

const AdminRoles = () => {
  const confirm = useConfirm();
  const { t } = useLocalization();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesResponse, usersResponse] = await Promise.all([
        adminService.getRoles(),
        adminService.getUsers({ page: 1, pageSize: 50, search: search || undefined }),
      ]);
      setRoles(rolesResponse.data.data.roles);
      setPermissions(rolesResponse.data.data.permissions);
      setUsers(usersResponse.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin.roles.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    load();
  }, [load]);

  const permissionsByModule = useMemo(() => {
    return permissions.reduce((acc, permission) => {
      acc[permission.module] = acc[permission.module] || [];
      acc[permission.module].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const openCreateRoleModal = () => {
    setEditingRoleId(null);
    setRoleForm(emptyRoleForm);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role) => {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      level: role.level,
      permissionIds: (role.permissions || []).map((permission) => permission.id),
    });
    setIsRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingRoleId(null);
    setRoleForm(emptyRoleForm);
  };

  const toggleFormPermission = (permissionId) => {
    setRoleForm((prev) => {
      const currentIds = new Set(prev.permissionIds);
      if (currentIds.has(permissionId)) currentIds.delete(permissionId);
      else currentIds.add(permissionId);
      return { ...prev, permissionIds: Array.from(currentIds) };
    });
  };

  const handleSaveRole = async (event) => {
    event.preventDefault();
    if (!roleForm.name.trim() || !roleForm.displayName.trim()) {
      toast.error(t('admin.roles.requiredFields'));
      return;
    }

    try {
      if (editingRoleId) {
        await adminService.updateRole(editingRoleId, roleForm);
        await adminService.setRolePermissions(editingRoleId, roleForm.permissionIds);
        toast.success(t('admin.roles.updated'));
      } else {
        const response = await adminService.createRole(roleForm);
        const roleId = response.data.data.id;
        await adminService.setRolePermissions(roleId, roleForm.permissionIds);
        toast.success(t('admin.roles.created'));
      }
      closeRoleModal();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin.roles.saveFailed'));
    }
  };

  const handleDeleteRole = async (role) => {
    const accepted = await confirm({
      title: t('admin.roles.deleteTitle'),
      message: t('admin.roles.deleteMessage', undefined, { name: role.displayName }),
      detail: t('admin.roles.deleteDetail'),
      confirmText: t('admin.roles.deleteAction'),
    });
    if (!accepted) return;
    try {
      await adminService.deleteRole(role.id);
      toast.success(t('admin.roles.deleted'));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin.roles.deleteFailed'));
    }
  };

  const handleToggleUserRole = async (user, roleId) => {
    const currentIds = new Set((user.roles || []).map((role) => role.id));
    if (currentIds.has(roleId)) currentIds.delete(roleId);
    else currentIds.add(roleId);

    try {
      await adminService.setUserRoles(user.id, Array.from(currentIds));
      toast.success(t('admin.roles.assignmentUpdated'));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin.roles.assignmentFailed'));
    }
  };

  return (
    <div>
      <div className="admin-page-heading">
        <h1 className="admin-page-title">{t('admin.roles.title')}</h1>
        <button className="admin-btn admin-btn--primary" type="button" onClick={openCreateRoleModal}>
          <Plus size={14} /> {t('admin.roles.add')}
        </button>
      </div>

      <div className="admin-rbac-grid">
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">{t('admin.roles.byLevel')}</span>
          </div>

          <div className="admin-role-list">
            {roles.map((role) => (
              <div key={role.id} className="admin-role-card">
                <div className="admin-card-heading">
                  <div>
                    <div className="admin-role-title">{role.displayName}</div>
                    <div className="admin-role-meta">
                      {role.name} - {t('admin.roles.level')} {role.level} - {t('admin.roles.usersCount', undefined, { count: role.userCount })}
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button className="admin-btn admin-btn--admin" type="button" onClick={() => openEditRoleModal(role)}>
                      <Edit3 size={12} /> {t('admin.roles.editPermissions')}
                    </button>
                    <button className="admin-btn admin-btn--delete" type="button" onClick={() => handleDeleteRole(role)}>
                      <Trash2 size={12} /> {t('common.delete')}
                    </button>
                  </div>
                </div>

                <div className="admin-role-permissions">
                  {(role.permissions || []).length > 0 ? (
                    role.permissions.map((permission) => (
                      <span key={permission.id} className="badge badge--auto">
                        {permission.key}
                      </span>
                    ))
                  ) : (
                    <span className="admin-muted">{t('admin.roles.noPermissions')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">{t('admin.roles.availablePermissions')}</span>
          </div>

          <div className="admin-permission-modules">
            {Object.entries(permissionsByModule).map(([module, items]) => (
              <div key={module} className="admin-permission-module">
                <h3>{module}</h3>
                {items.map((permission) => (
                  <div key={permission.id} className="admin-permission-row">
                    <code>{permission.key}</code>
                    <span>{permission.description}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-table-wrap admin-section">
        <div className="admin-table-header">
          <span className="admin-table-title">{t('admin.roles.assignToAccounts')}</span>
          <div className="admin-search-wrap">
            <Search size={14} className="admin-search-icon" />
            <input
              className="admin-search admin-search--with-icon"
              placeholder={t('admin.roles.searchUsers')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">{t('common.loading')}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.roles.account')}</th>
                <th>{t('admin.roles.currentRoles')}</th>
                <th>{t('admin.roles.assignRole')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const currentIds = new Set((user.roles || []).map((role) => role.id));
                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ color: '#777', fontSize: 12 }}>{user.email}</div>
                    </td>
                    <td>
                      {(user.roles || []).length > 0 ? (
                        user.roles.map((role) => (
                          <span key={role.id} className="badge badge--admin">
                            {role.displayName}
                          </span>
                        ))
                      ) : (
                        <span className="admin-muted">{t('admin.roles.unassigned')}</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            className={`admin-btn ${currentIds.has(role.id) ? 'admin-btn--primary' : 'admin-btn--admin'}`}
                            type="button"
                            onClick={() => handleToggleUserRole(user, role.id)}
                          >
                            <ShieldCheck size={12} /> {role.displayName}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isRoleModalOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={closeRoleModal}>
          <form className="admin-role-modal" onSubmit={handleSaveRole} onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-role-modal-header">
              <h2>{editingRoleId ? t('admin.roles.edit') : t('admin.roles.addNew')}</h2>
              <button className="admin-icon-btn" type="button" onClick={closeRoleModal} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-role-modal-fields">
              <input
                placeholder={translateCatalogKey('ui.pages.admin.adminroles.name-content-admin.50ade12c')}
                value={roleForm.name}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.display-name.f265139c')}
                value={roleForm.displayName}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, displayName: event.target.value }))}
              />
              <input
                type="number"
                min="1"
                max="100"
                placeholder={translateCatalogKey('ui.pages.admin.adminroles.level.845dac84')}
                value={roleForm.level}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, level: Number(event.target.value) }))}
              />
            </div>

            <div className="admin-role-modal-permissions">
              {Object.entries(permissionsByModule).map(([module, items]) => (
                <div key={module} className="admin-permission-module">
                  <h3>{module}</h3>
                  <div className="admin-permission-checks">
                    {items.map((permission) => (
                      <label key={permission.id} className="admin-permission-check">
                        <input
                          type="checkbox"
                          checked={roleForm.permissionIds.includes(permission.id)}
                          onChange={() => toggleFormPermission(permission.id)}
                        />
                        <span>{permission.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-role-modal-footer">
              <button className="admin-btn admin-btn--reset" type="button" onClick={closeRoleModal}>
                <X size={12} /> {t('common.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                <Save size={12} /> {t('admin.roles.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminRoles;
