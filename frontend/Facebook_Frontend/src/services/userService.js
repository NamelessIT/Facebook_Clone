import axiosClient from './axiosClient'; // Giả sử đã config axios có interceptor kèm Token

const userService = {
  getMe: async () => {
    const url = '/users/me';
    return await axiosClient.get(url);
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
};

export default userService;