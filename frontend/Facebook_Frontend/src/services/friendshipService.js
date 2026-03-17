import axiosClient from './axiosClient';

const friendshipService = {
  // Lấy danh sách bạn bè (Status = 1 là đã kết bạn)
  getFriends: async () => {
    return await axiosClient.get('/friendships/friends');
  }
};

export default friendshipService;