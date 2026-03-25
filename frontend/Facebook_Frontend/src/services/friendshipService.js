import axiosClient from './axiosClient';

const friendshipService = {
  getFriends: async (page = 1, limit = 20) => {
    return await axiosClient.get('/friendships/friends', { params: { page, limit } });
  },

  sendFriendRequest: async (userId) => {
    return await axiosClient.post('/friendships/request', { toUserId: userId });
  },

  acceptFriendRequest: async (requestId) => {
    return await axiosClient.put(`/friendships/request/${requestId}/accept`);
  },

  rejectFriendRequest: async (requestId) => {
    return await axiosClient.put(`/friendships/request/${requestId}/reject`);
  },

  cancelFriendRequest: async (requestId) => {
    return await axiosClient.delete(`/friendships/request/${requestId}`);
  },

  removeFriend: async (friendId) => {
    return await axiosClient.delete(`/friendships/${friendId}`);
  },

  getFriendRequests: async (page = 1, limit = 20) => {
    return await axiosClient.get('/friendships/requests', { params: { page, limit } });
  },

  getFriendshipStatus: async (userId) => {
    return await axiosClient.get(`/friendships/status/${userId}`);
  },
};

export default friendshipService;