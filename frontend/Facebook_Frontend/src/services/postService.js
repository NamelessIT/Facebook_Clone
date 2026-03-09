import axiosClient from './axiosClient';

const postService = {
  // Lấy danh sách bài viết trên Bảng tin
  getFeed: async (pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  }
};

export default postService;