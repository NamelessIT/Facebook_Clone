import axiosClient from './axiosClient';

const postInteractionService = {
  interestPost: (postId) =>
    axiosClient.post(`/posts/${postId}/interested`),

  notInterestedPost: (postId) =>
    axiosClient.post(`/posts/${postId}/not-interested`),

  savePost: (postId) =>
    axiosClient.post(`/posts/${postId}/save`),

  unsavePost: (postId) =>
    axiosClient.delete(`/posts/${postId}/save`),

  reportPost: (postId, reason) =>
    axiosClient.post(`/posts/${postId}/report`, { reportReason: reason }),

  getSavedPosts: (page = 1, pageSize = 20) =>
    axiosClient.get('/posts/saved', { params: { pageNumber: page, pageSize } }),
};

export default postInteractionService;
