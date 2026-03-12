import axiosClient from './axiosClient';

const postService = {
  getFeed: async (pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  },
  
  // 👇 ĐỂ AXIOS TỰ ĐỘNG XỬ LÝ HEADER MULTIPART
  createPost: async (formData) => {
    return await axiosClient.post('/posts', formData);
  }
};

export default postService;