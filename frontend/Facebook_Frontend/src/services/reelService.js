import axiosClient from './axiosClient';

const reelService = {
  uploadReel: (formData, onUploadProgress) =>
    axiosClient.post('/reels', formData, {
      onUploadProgress,
    }),

  getReelsFeed: (page = 1, size = 12) =>
    axiosClient.get('/reels/feed', {
      params: { pageNumber: page, pageSize: size },
    }),

  getUserReels: (userId, page = 1, size = 12) =>
    axiosClient.get(`/reels/user/${userId}`, {
      params: { pageNumber: page, pageSize: size },
    }),

  getReel: (id) => axiosClient.get(`/reels/${id}`),

  updateReel: (id, data) => axiosClient.put(`/reels/${id}`, data),

  deleteReel: (id) => axiosClient.delete(`/reels/${id}`),

  toggleLike: (id) => axiosClient.post(`/reels/${id}/like`),

  getComments: (id, pageNumber = 1, pageSize = 30) =>
    axiosClient.get(`/reels/${id}/comments`, { params: { pageNumber, pageSize } }),

  createComment: (id, content) =>
    axiosClient.post(`/reels/${id}/comments`, { content }),
};

export default reelService;
