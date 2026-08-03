import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getPendingOfflineActions, getResumableUploadSessions, startOfflineSyncListeners } from '../offline';

const OfflineSyncContext = createContext(null);

export const OfflineSyncProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [pendingActionCount, setPendingActionCount] = useState(0);
  const [resumableUploadCount, setResumableUploadCount] = useState(0);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshCounts = async () => {
      try {
        const [actions, uploads] = await Promise.all([
          getPendingOfflineActions(),
          getResumableUploadSessions(),
        ]);
        if (!cancelled) {
          setPendingActionCount(actions.length);
          setResumableUploadCount(uploads.length);
        }
      } catch {
        if (!cancelled) {
          setPendingActionCount(0);
          setResumableUploadCount(0);
        }
      }
    };

    refreshCounts();
    const intervalId = window.setInterval(refreshCounts, 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [lastSyncResult]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    return startOfflineSyncListeners({
      onSyncComplete: (result) => {
        setLastSyncResult({ ...result, at: new Date().toISOString() });
      },
    });
  }, [isAuthenticated]);

  const value = useMemo(() => ({
    isOnline,
    lastSyncResult,
    pendingActionCount,
    resumableUploadCount,
  }), [isOnline, lastSyncResult, pendingActionCount, resumableUploadCount]);

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOfflineSync = () => useContext(OfflineSyncContext);
