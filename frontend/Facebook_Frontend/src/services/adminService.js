import axiosClient from './axiosClient';

const adminService = {
  // Dashboard
  getDashboard: () => axiosClient.get('/admin/dashboard'),
  getMe: () => axiosClient.get('/admin/me'),

  // Users
  getUsers: (params = {}) => axiosClient.get('/admin/users', { params }),
  getUserCreationOptions: () => axiosClient.get('/admin/users/creation-options'),
  createUser: (data) => axiosClient.post('/admin/users', data),
  banUser: (id, reason) => axiosClient.put(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id) => axiosClient.put(`/admin/users/${id}/unban`),
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

  // Live moderation
  getLives: () => axiosClient.get('/admin/lives'),
  terminateLive: (id, reason) => axiosClient.post(`/admin/lives/${id}/terminate`, { reason }),
  setLiveEvidenceHold: (id, hold) => axiosClient.put(`/admin/lives/${id}/evidence-hold`, { hold }),
  restoreLiveAccess: (userId) => axiosClient.post(`/admin/lives/users/${userId}/restore`),

  // Marketplace moderation
  getMarketplaceListings: (params = {}) => axiosClient.get('/admin/marketplace/listings', { params }),
  getMerchantStats: (userId) => axiosClient.get(`/admin/marketplace/merchants/${userId}/stats`),
  reviewMarketplaceListing: (id, status, note) =>
    axiosClient.put(`/admin/marketplace/listings/${id}/review`, { status, note }),
  setMarketplaceSellerSuspension: (userId, suspended, reason = '') =>
    axiosClient.put(`/admin/marketplace/merchants/${userId}/suspension`, { suspended, reason }),

  // Cross-module reports
  getReports: (params = {}) => axiosClient.get('/admin/reports', { params }),
  reviewReport: (id) => axiosClient.put(`/admin/reports/${id}/review`),
  resolveReport: (id, action, note, dismiss = false) =>
    axiosClient.post(`/admin/reports/${id}/resolve`, { action, note, dismiss }),

  // Security
  getSecurityEvents: (count = 200, type) =>
    axiosClient.get('/admin/security/events', { params: { count, type } }),
  getBlockedIps: () => axiosClient.get('/admin/security/blocked-ips'),
  blockIp: (ip, reason, durationHours) =>
    axiosClient.post('/admin/security/block-ip', { ip, reason, durationHours }),
  unblockIp: (ip) => axiosClient.delete('/admin/security/blocked-ips', { params: { ip } }),
  resetRateLimit: (ip) => axiosClient.delete('/admin/security/rate-limit', { params: { ip } }),
  getSecurityStats: () => axiosClient.get('/admin/security/stats'),
  getSuspiciousIps: (params = {}) => axiosClient.get('/admin/security/suspicious-ips', { params }),

  // Localization
  getLocalization: (params = {}) => axiosClient.get('/admin/localization', { params }),
  createLocaleLanguage: (data) => axiosClient.post('/admin/localization/languages', data),
  updateLocaleLanguage: (id, data) => axiosClient.put(`/admin/localization/languages/${id}`, data),
  createLocalizationEntry: (data) => axiosClient.post('/admin/localization/entries', data),
  updateLocalizationEntry: (id, data) => axiosClient.put(`/admin/localization/entries/${id}`, data),
  upsertLocalizationEntries: (entries) => axiosClient.post('/admin/localization/entries/bulk', { entries }),
  deleteLocalizationEntry: (id) => axiosClient.delete(`/admin/localization/entries/${id}`),
  translateLocalization: (data) => axiosClient.post('/admin/localization/translate', data),
};

export default adminService;
