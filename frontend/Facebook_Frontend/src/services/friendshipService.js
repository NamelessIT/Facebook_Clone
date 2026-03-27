import axiosClient from './axiosClient';

const friendshipService = {
  getFriends: async (page = 1, limit = 20) => {
    return await axiosClient.get('/friendships/friends', { params: { page, limit } });
  },

  sendFriendRequest: async (receiverId) => {
    return await axiosClient.post(`/friendships/request/${receiverId}`);
  },

  respondToRequest: async (requesterId, accept) => {
    return await axiosClient.post(`/friendships/respond/${requesterId}?accept=${accept}`);
  },

  acceptFriendRequest: async (requesterId) => {
    return await axiosClient.post(`/friendships/respond/${requesterId}?accept=true`);
  },

  rejectFriendRequest: async (requesterId) => {
    return await axiosClient.post(`/friendships/respond/${requesterId}?accept=false`);
  },

  removeFriend: async (friendId) => {
    return await axiosClient.delete(`/friendships/unfriend/${friendId}`);
  },

  getFriendRequests: async (page = 1, limit = 20) => {
    return await axiosClient.get('/friendships/requests/pending', { params: { page, limit } });
  },

  getFriendshipStatus: async (userId) => {
    return await axiosClient.get(`/friendships/status/${userId}`);
  },

  getUserFriends: async (userId, pageNumber = 1, pageSize = 20) => {
    return await axiosClient.get(`/friendships/${userId}/friends`, { params: { pageNumber, pageSize } });
  },
};

export default friendshipService;