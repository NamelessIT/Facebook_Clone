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

  updatePost: async (postId, formData) => {
    return await axiosClient.put(`/posts/${postId}`, formData);
  },

  deletePost: async (postId) => {
    return await axiosClient.delete(`/posts/${postId}`);
  },

  searchPosts: async (query, pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get('/search/posts', { params: { q: query, pageNumber, pageSize } });
  },

  getComments: async (postId, pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts/${postId}/comments`, { params: { pageNumber, pageSize } });
  },

  createComment: async (postId, data) => {
    return await axiosClient.post(`/posts/${postId}/comments`, data);
  },

  reactComment: async (commentId, reactionType) => {
    return await axiosClient.post(`/posts/comments/${commentId}/reactions`, { reactionType });
  },

  sharePost: async (data) => {
    return await axiosClient.post('/posts', data);
  },

  getUserPosts: async (userId, pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts/user/${userId}`, { params: { pageNumber, pageSize } });
  },
};

export default postService;