import axiosClient from './axiosClient';

const postService = {
  getFeed: async (pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  },

  getById: async (postId) => {
    return await axiosClient.get(`/posts/${postId}`);
  },
  
  createPost: async (formData) => {
    return await axiosClient.post('/posts', formData, {
      offlineAction: { enabled: true, type: 'post.create', entityType: 'post' },
    });
  },

  reactPost: async (postId, reactionType) => {
    return await axiosClient.post(`/posts/${postId}/reactions`, { reactionType }, {
      offlineAction: { enabled: true, type: 'reaction.set', entityType: 'post', entityId: postId },
    });
  },

  updatePost: async (postId, formData) => {
    return await axiosClient.put(`/posts/${postId}`, formData, {
      offlineAction: { enabled: true, type: 'post.update', entityType: 'post', entityId: postId },
    });
  },

  deletePost: async (postId) => {
    return await axiosClient.delete(`/posts/${postId}`, {
      offlineAction: { enabled: true, type: 'post.delete', entityType: 'post', entityId: postId },
    });
  },

  searchPosts: async (query, pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get('/search/posts', { params: { q: query, pageNumber, pageSize } });
  },

  getComments: async (postId, pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts/${postId}/comments`, { params: { pageNumber, pageSize } });
  },

  createComment: async (postId, data) => {
    return await axiosClient.post(`/posts/${postId}/comments`, data, {
      offlineAction: { enabled: true, type: 'comment.create', entityType: 'post', entityId: postId },
    });
  },

  reactComment: async (commentId, reactionType) => {
    return await axiosClient.post(`/posts/comments/${commentId}/reactions`, { reactionType }, {
      offlineAction: { enabled: true, type: 'reaction.set', entityType: 'comment', entityId: commentId },
    });
  },

  sharePost: async (postId, data) => {
    return await axiosClient.post(`/posts/${postId}/share`, data, {
      offlineAction: { enabled: true, type: 'post.share', entityType: 'post', entityId: postId },
    });
  },

  getUserPosts: async (userId, pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts/user/${userId}`, { params: { pageNumber, pageSize } });
  },
};

export default postService;
