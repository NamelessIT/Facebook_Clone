import axiosClient from './axiosClient';

const adminService = {
  // Dashboard
  getDashboard: () => axiosClient.get('/admin/dashboard'),
  getMe: () => axiosClient.get('/admin/me'),

  // Users
  getUsers: (params = {}) => axiosClient.get('/admin/users', { params }),
  banUser: (id, reason) => axiosClient.put(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id) => axiosClient.put(`/admin/users/${id}/unban`),
  toggleAdmin: (id) => axiosClient.put(`/admin/users/${id}/toggle-admin`),
  setUserRoles: (id, roleIds) => axiosClient.put(`/admin/users/${id}/roles`, { roleIds }),
  deleteUser: (id) => axiosClient.delete(`/admin/users/${id}`),

  // RBAC
  getRoles: () => axiosClient.get('/admin/roles'),
  createRole: (data) => axiosClient.post('/admin/roles', data),
  updateRole: (id, data) => axiosClient.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => axiosClient.delete(`/admin/roles/${id}`),
  setRolePermissions: (id, permissionIds) =>
    axiosClient.put(`/admin/roles/${id}/permissions`, { permissionIds }),

  // Content
  getPosts: (params = {}) => axiosClient.get('/admin/posts', { params }),
  getReels: (params = {}) => axiosClient.get('/admin/reels', { params }),
  deletePost: (id) => axiosClient.put(`/admin/posts/${id}/delete`),
  restorePost: (id) => axiosClient.put(`/admin/posts/${id}/restore`),
  banPostAuthor: (id, reason) => axiosClient.put(`/admin/posts/${id}/ban-author`, { reason }),
  deleteReel: (id) => axiosClient.put(`/admin/reels/${id}/delete`),
  restoreReel: (id) => axiosClient.put(`/admin/reels/${id}/restore`),
  banReelAuthor: (id, reason) => axiosClient.put(`/admin/reels/${id}/ban-author`, { reason }),

  // Security
  getSecurityEvents: (count = 200, type) =>
    axiosClient.get('/admin/security/events', { params: { count, type } }),
  getBlockedIps: () => axiosClient.get('/admin/security/blocked-ips'),
  blockIp: (ip, reason, durationHours) =>
    axiosClient.post('/admin/security/block-ip', { ip, reason, durationHours }),
  unblockIp: (ip) => axiosClient.delete(`/admin/security/blocked-ips/${encodeURIComponent(ip)}`),
  resetRateLimit: (ip) => axiosClient.delete(`/admin/security/rate-limit/${encodeURIComponent(ip)}`),
  getSecurityStats: () => axiosClient.get('/admin/security/stats'),
};

export default adminService;
