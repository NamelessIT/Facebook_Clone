import { useState, useEffect } from 'react';
import userService from '../services/userService';

export const useUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const response = await userService.getMe();
      setUser(response.data); // Tùy cấu trúc response của bạn
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  return { user, loading, error, refetch: fetchCurrentUser };
};