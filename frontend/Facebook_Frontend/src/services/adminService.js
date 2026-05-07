import axiosClient from './axiosClient';

const adminService = {
  // Dashboard
  getDashboard: () => axiosClient.get('/admin/dashboard'),

  // Users
  getUsers: (params = {}) => axiosClient.get('/admin/users', { params }),
  banUser: (id, reason) => axiosClient.put(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id) => axiosClient.put(`/admin/users/${id}/unban`),
  toggleAdmin: (id) => axiosClient.put(`/admin/users/${id}/toggle-admin`),
  deleteUser: (id) => axiosClient.delete(`/admin/users/${id}`),

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
