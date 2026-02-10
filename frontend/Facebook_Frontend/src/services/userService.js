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
  }
};

export default userService;