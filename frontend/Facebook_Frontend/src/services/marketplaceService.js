import axiosClient from './axiosClient';

const marketplaceService = {
  list: (params = {}) => axiosClient.get('/marketplace', { params }),
  get: (id) => axiosClient.get(`/marketplace/${id}`),
  getTerms: () => axiosClient.get('/marketplace/terms'),
  create: (formData) => axiosClient.post('/marketplace', formData),
  getMyListings: () => axiosClient.get('/marketplace/me/listings'),
  getMyStats: () => axiosClient.get('/marketplace/me/stats'),
  toggleFavorite: (id) => axiosClient.post(`/marketplace/${id}/favorite`),
  markSold: (id) => axiosClient.put(`/marketplace/${id}/sold`),
};

export default marketplaceService;
