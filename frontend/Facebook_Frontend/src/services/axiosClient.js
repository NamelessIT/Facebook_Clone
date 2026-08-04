import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { STORAGE_KEYS } from '../shared/generated/constants';
import { createIdempotencyKey } from '../offline/idempotency';
import { enqueueOfflineAction } from '../offline/offlineQueue';
import { reportApiError } from '../shared/apiError';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((pending) => {
    if (error) pending.reject(error);
    else pending.resolve(token);
  });
  failedQueue = [];
};

export const clearAuthClientState = () => {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  delete axiosClient.defaults.headers.common.Authorization;
  delete axiosClient.defaults.headers.common.authorization;
  isRefreshing = false;
  processQueue(new Error('Authentication state cleared'), null);
};

const isAuthEndpoint = (url = '') => {
  return url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh-token');
};

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const RETRYABLE_OFFLINE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const isMutatingRequest = (config = {}) => MUTATING_METHODS.has((config.method || 'get').toLowerCase());

const isRetryableOfflineError = (error) => {
  if (!error.response) return true;
  return RETRYABLE_OFFLINE_STATUS_CODES.has(error.response.status);
};

const shouldQueueOffline = (error, config = {}) => {
  if (!config.offlineAction?.enabled) return false;
  if (config._offlineQueued) return false;
  if (isAuthEndpoint(config.url || '')) return false;
  if (!isMutatingRequest(config)) return false;
  if (config.data instanceof FormData && !config.offlineAction.allowFormData) return false;
  return isRetryableOfflineError(error);
};

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);

  if (isAuthEndpoint(config.url)) {
    delete config.headers.Authorization;
    delete config.headers.authorization;
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
    delete config.headers.authorization;
  }

  if (config.data instanceof FormData) {
    if (config.headers && config.headers.delete) {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }

  if (isMutatingRequest(config) && !isAuthEndpoint(config.url || '')) {
    config.headers = config.headers || {};
    config.headers['Idempotency-Key'] = config.headers['Idempotency-Key'] || config.idempotencyKey || createIdempotencyKey();
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    if (!originalRequest || isAuthEndpoint(requestUrl)) {
      return Promise.reject(error);
    }

    if (shouldQueueOffline(error, originalRequest)) {
      originalRequest._offlineQueued = true;
      try {
        await enqueueOfflineAction({
          idempotencyKey: originalRequest.headers?.['Idempotency-Key'] || originalRequest.idempotencyKey,
          type: originalRequest.offlineAction.type,
          method: originalRequest.method?.toUpperCase() || 'POST',
          url: originalRequest.url,
          body: originalRequest.data ?? null,
          headers: originalRequest.offlineAction.headers || {},
          entityType: originalRequest.offlineAction.entityType,
          entityId: originalRequest.offlineAction.entityId,
          localEntityId: originalRequest.offlineAction.localEntityId,
          rollbackStrategy: originalRequest.offlineAction.rollbackStrategy,
          status: navigator.onLine === false ? 'paused' : 'failed',
          errorCode: error.response?.status || 'NETWORK',
          errorMessage: error.response?.data?.message || error.message || 'Request queued for offline sync',
        });
      } catch (queueError) {
        reportApiError(queueError, 'The failed request could not be added to the offline queue.', 'offline.queue.enqueue');
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((queueError) => Promise.reject(queueError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (!refreshToken) {
        clearAuthClientState();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
        localStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);

        axiosClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        return axiosClient(originalRequest);
      } catch (refreshError) {
        clearAuthClientState();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
