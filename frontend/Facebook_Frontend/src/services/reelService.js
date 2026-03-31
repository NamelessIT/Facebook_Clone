import axiosClient from './axiosClient';

const reelService = {
  uploadReel: (formData, onUploadProgress) =>
    axiosClient.post('/reels', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
};

export default reelService;
