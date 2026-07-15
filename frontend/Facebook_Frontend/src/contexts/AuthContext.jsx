import { createContext, useCallback, useContext, useEffect, useState } from "react";
import userService from "../services/userService";
import { clearAuthClientState } from "../services/axiosClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearAuthClientState();
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async ({ throwOnError = false } = {}) => {
    try {
      const response = await userService.getMe();
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Fetch profile failed:", error);
      logout();
      if (throwOnError) throw error;
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = async (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    try {
      return await fetchProfile({ throwOnError: true });
    } catch (error) {
      clearAuthClientState();
      setUser(null);
      throw error;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
