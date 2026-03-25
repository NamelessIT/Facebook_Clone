import axiosClient from './axiosClient'; // Giả sử đã config axios có interceptor kèm Token

const userService = {
  getMe: async () => {
    const url = '/users/me';
    return await axiosClient.get(url);
  },

  updateProfile: async (data) => {
    const url = '/users/me';
    return await axiosClient.put(url, data);
  },

  getUserById: async (id) => {
    const url = `/users/${id}`;
    return await axiosClient.get(url);
  },

  searchUsers: async (query, pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get('/search/users', { params: { q: query, pageNumber, pageSize } });
  },

  updatePrivacy: async (data) => {
    return await axiosClient.put('/users/privacy', data);
  },

  updatePreferences: async (data) => {
    return await axiosClient.put('/users/preferences', data);
  },
};

export default userService;