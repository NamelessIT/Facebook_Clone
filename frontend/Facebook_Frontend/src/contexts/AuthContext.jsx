import { createContext, useContext, useState, useEffect } from "react";
import userService from "../services/userService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hàm login: Lưu token và fetch profile
  const login = async (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    await fetchProfile();
  };

  // Hàm logout
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  // Hàm lấy thông tin user từ Token
  const fetchProfile = async () => {
    try {
      const response = await userService.getMe();
      setUser(response.data); // data chứa { firstName, lastName, ... }
    } catch (error) {
      console.error("Lỗi lấy profile:", error);
      logout(); // Nếu lỗi (token hết hạn) thì logout luôn
    } finally {
      setLoading(false);
    }
  };

  // Tự động chạy khi F5 trang web
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook custom để dùng nhanh
export const useAuth = () => useContext(AuthContext);