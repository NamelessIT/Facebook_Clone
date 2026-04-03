import axiosClient from './axiosClient';

const savedItemsService = {
  getSavedPosts: async (pageNumber = 1, pageSize = 20) => {
    return await axiosClient.get('/posts/saved', { params: { pageNumber, pageSize } });
  },

  unsavePost: async (postId) => {
    return await axiosClient.delete(`/posts/${postId}/save`);
  },
};

export default savedItemsService;
