import { createContext, useCallback, useContext, useEffect, useState } from "react";
import userService from "../services/userService";
import axiosClient, { clearAuthClientState } from "../services/axiosClient";
import { STORAGE_KEYS, TIMERS } from "../shared/generated/constants";
import { reportApiError } from '../shared/apiError';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (refreshToken) {
      await axiosClient.post("/auth/logout", { refreshToken }).catch((error) => {
        reportApiError(error, 'Could not close the server session.', 'auth.logout');
      });
    }
    clearAuthClientState();
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async ({ throwOnError = false } = {}) => {
    try {
      const response = await userService.getMe();
      setUser(response.data);
      return response.data;
    } catch (error) {
      reportApiError(error, 'Could not load the authenticated profile.', 'auth.profile.load');
      logout();
      if (throwOnError) throw error;
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = async (accessToken, refreshToken) => {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);

    try {
      return await fetchProfile({ throwOnError: true });
    } catch (error) {
      clearAuthClientState();
      setUser(null);
      throw error;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    if (!user?.id) return;

    const sendHeartbeat = () => {
      userService.heartbeat().catch((error) => {
        reportApiError(error, 'Could not update online presence.', 'presence.heartbeat');
      });
    };

    sendHeartbeat();
    const timerId = window.setInterval(sendHeartbeat, TIMERS.presenceHeartbeatMs);
    return () => window.clearInterval(timerId);
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
