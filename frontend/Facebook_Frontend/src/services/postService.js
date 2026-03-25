import axiosClient from './axiosClient';

const postService = {
  getFeed: async (pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  },
  
  createPost: async (formData) => {
    return await axiosClient.post('/posts', formData);
  },

  reactPost: async (postId, reactionType) => {
    return await axiosClient.post(`/posts/${postId}/reactions`, { reactionType });
  },

  updatePost: async (postId, data) => {
    return await axiosClient.put(`/posts/${postId}`, data);
  },

  deletePost: async (postId) => {
    return await axiosClient.delete(`/posts/${postId}`);
  },

  searchPosts: async (query, page = 1, limit = 10) => {
    return await axiosClient.get(`/search/posts`, { params: { q: query, page, limit } });
  },
};

export default postService;