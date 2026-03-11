import axiosClient from './axiosClient';

const postService = {
  // Lấy danh sách bài viết trên Bảng tin
  getFeed: async (pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  }
};
// 👇HÀM ĐỂ ĐĂNG BÀI
createPost: async (formData) => {
    return await axiosClient.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Bắt buộc khi gửi file
      },
    });
  }

export default postService;