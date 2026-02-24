import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5286/api/v1', // ⚠️ SỬA PORT THÀNH PORT BACKEND CỦA BẠN NẾU KHÁC
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Tự động gắn Token vào mỗi request gửi đi
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Xử lý lỗi (Ví dụ: 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Unauthorized! Token hết hạn hoặc không hợp lệ.");
      // Có thể thêm logic tự động logout ở đây sau này
    }
    return Promise.reject(error);
  }
);

export default axiosClient;