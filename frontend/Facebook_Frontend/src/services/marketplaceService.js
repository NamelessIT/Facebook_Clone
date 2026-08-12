import axiosClient from './axiosClient';

const marketplaceService = {
  list: (params = {}) => axiosClient.get('/marketplace', { params }),
  get: (id) => axiosClient.get(`/marketplace/${id}`),
  getTerms: () => axiosClient.get('/marketplace/terms'),
  create: (formData) => axiosClient.post('/marketplace', formData),
  update: (id, formData) => axiosClient.put(`/marketplace/${id}`, formData),
  withdraw: (id) => axiosClient.put(`/marketplace/${id}/withdraw`),
  createPayment: (listingId) => axiosClient.post(`/marketplace/${listingId}/payments`),
  getPayment: (id) => axiosClient.get(`/marketplace/payments/${id}`),
  submitPayment: (id) => axiosClient.post(`/marketplace/payments/${id}/submit`),
  cancelPayment: (id) => axiosClient.post(`/marketplace/payments/${id}/cancel`),
  getMyListings: () => axiosClient.get('/marketplace/me/listings'),
  getMyStats: () => axiosClient.get('/marketplace/me/stats'),
  toggleFavorite: (id) => axiosClient.post(`/marketplace/${id}/favorite`),
  contactSeller: (id) => axiosClient.post(`/marketplace/${id}/contact`),
  markSold: (id) => axiosClient.put(`/marketplace/${id}/sold`),
  relist: (id, data) => axiosClient.post(`/marketplace/${id}/relist`, data),
};

export default marketplaceService;
