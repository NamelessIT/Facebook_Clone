import axiosClient from './axiosClient';

const postService = {
  getFeed: async (pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  },
  
  createPost: async (formData) => {
    return await axiosClient.post('/posts', formData);
  },

  // 👇 THÊM HÀM NÀY ĐỂ THẢ CẢM XÚC
  // reactionType có thể là số (1: Thích, 2: Tim, 3: Haha...) tùy backend của bạn
  reactPost: async (postId, reactionType) => {
    return await axiosClient.post(`/posts/${postId}/reactions`, { reactionType });
  }
};

export default postService;