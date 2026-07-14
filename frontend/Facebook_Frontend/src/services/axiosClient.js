import axios from 'axios';
import { API_BASE_URL } from '../config/env';

const axiosClient = axios.create({
  baseURL: API_BASE_URL, // Cấu hình qua VITE_API_BASE_URL / VITE_API_ORIGIN
  headers: {
    'Content-Type': 'application/json',
  },
});

// Biến khóa để ngăn việc gọi API refresh nhiều lần cùng lúc
let isRefreshing = false;
// Hàng đợi chứa các request bị lỗi 401 đang chờ token mới
let failedQueue = [];

// Hàm xử lý hàng đợi
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Interceptor: Tự động gắn Token vào mỗi request gửi đi
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 👇 BÍ QUYẾT ĐỂ TRỊ TẬN GỐC LỖI FORM DATA CHÍNH LÀ ĐÂY:
  // Nếu dữ liệu gửi đi là FormData (chứa file/ảnh), ta phải XÓA ép kiểu JSON đi!
  // Khi không có Content-Type, Trình duyệt sẽ tự động nội suy ra "multipart/form-data" 
  // và tự động gắn cái vách ngăn (boundary) chuẩn xác 100%.
  if (config.data instanceof FormData) {
    if (config.headers && config.headers.delete) {
      config.headers.delete('Content-Type'); // Cho Axios đời mới
    } else {
      delete config.headers['Content-Type']; // Cho Axios đời cũ
    }
  }

  return config;
});

// 2. Interceptor: Xử lý lỗi (Đặc trị 401)
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi là 401 và chưa từng được thử lại (chưa có cờ _retry)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      
      // Nếu chính cái API refresh bị 401 -> Token refresh cũng hết hạn -> Đá văng ra Login
      if (originalRequest.url.includes('/auth/refresh-token')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Nếu đang trong quá trình refresh token, các request khác sẽ bị tống vào hàng đợi
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return axiosClient(originalRequest); // Chạy lại request sau khi có token mới
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      // Đánh dấu request này đang được xử lý để không bị lặp vô hạn
      originalRequest._retry = true;
      isRefreshing = true;

      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
         localStorage.removeItem('accessToken');
         localStorage.removeItem('refreshToken');
         window.location.href = '/login';
         return Promise.reject(error);
      }

      try {
        // Gọi API Refresh (Dùng axios gốc thay vì axiosClient để không bị kẹt vào interceptor)
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          accessToken: accessToken,
          refreshToken: refreshToken
        });

        // Lấy Token mới từ Backend
        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken;

        // Lưu lại vào LocalStorage
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Gắn token mới vào request hiện tại
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Báo cho các request trong hàng đợi biết là "Có token mới rồi, chạy tiếp đi ae!"
        processQueue(null, newAccessToken);
        
        // Chạy lại cái request bị lỗi lúc nãy
        return axiosClient(originalRequest);
        
      } catch (refreshError) {
        // Cầu chì cuối cùng: Nếu Refresh Token cũng lỗi -> Đăng nhập lại
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // Mở khóa
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;