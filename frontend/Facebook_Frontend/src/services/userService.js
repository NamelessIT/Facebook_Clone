import axiosClient from './axiosClient'; // Giả sử đã config axios có interceptor kèm Token

const userService = {
  getMe: async () => {
    const url = '/users/me';
    return await axiosClient.get(url);
  },

  heartbeat: async () => {
    return await axiosClient.post('/users/me/heartbeat');
  },

  updateProfile: async (data) => {
    const url = '/users/profile';
    return await axiosClient.put(url, data);
  },

  updateCoverPhoto: async (coverFile) => {
    const formData = new FormData();
    formData.append('cover', coverFile);
    return await axiosClient.put('/users/cover', formData);
  },

  updateProfileForm: async (formData) => {
    return await axiosClient.put('/users/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getUserById: async (id) => {
    const url = `/users/${id}`;
    return await axiosClient.get(url);
  },

  searchUsers: async (query = "", page = 1, pageSize = 20) => {
    const q = typeof query === "string" ? query : "";
    return await axiosClient.get('/search/users', { params: { q, pageNumber: page, pageSize } });
  },

  updatePrivacy: async (data) => {
    return await axiosClient.put('/users/me/privacy', data);
  },

  updatePreferences: async (data) => {
    return await axiosClient.put('/users/me/preferences', data);
  },

  changePassword: async (currentPassword, newPassword) => {
    return await axiosClient.put('/users/me/password', { currentPassword, newPassword });
  },
  getBlock: (id) => axiosClient.get(`/users/${id}/block`),
  setBlock: (id, level) => axiosClient.put(`/users/${id}/block`, { level }),
  removeBlock: (id) => axiosClient.delete(`/users/${id}/block`),
};

export default userService;
