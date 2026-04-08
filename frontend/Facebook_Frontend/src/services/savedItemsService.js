import axiosClient from './axiosClient';

const savedItemsService = {
  getSavedPosts: async (pageNumber = 1, pageSize = 20) => {
    return await axiosClient.get('/posts/saved', { params: { pageNumber, pageSize } });
  },

  savePost: async (postId) => {
    return await axiosClient.post(`/posts/${postId}/save`);
  },

  unsavePost: async (postId) => {
    return await axiosClient.delete(`/posts/${postId}/save`);
  },

  // --- Collection APIs ---
  getCollections: async () => {
    return await axiosClient.get('/collections');
  },

  createCollection: async (name) => {
    return await axiosClient.post('/collections', { name });
  },

  deleteCollection: async (collectionId) => {
    return await axiosClient.delete(`/collections/${collectionId}`);
  },

  addPostToCollection: async (collectionId, postId) => {
    return await axiosClient.post(`/collections/${collectionId}/posts`, { postId });
  },

  removePostFromCollection: async (collectionId, postId) => {
    return await axiosClient.delete(`/collections/${collectionId}/posts/${postId}`);
  },

  getCollectionPosts: async (collectionId, pageNumber = 1, pageSize = 20) => {
    return await axiosClient.get(`/collections/${collectionId}/posts`, { params: { pageNumber, pageSize } });
  },
};

export default savedItemsService;
