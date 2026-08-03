import axiosClient from '../services/axiosClient';
import { OFFLINE } from '../shared/generated/constants';
import {
  cleanupOfflineActions,
  cleanupUploadChunks,
  getPendingOfflineActions,
  updateOfflineAction,
} from './offlineQueue';

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableSyncError = (error) => {
  if (!error.response) return true;
  return RETRYABLE_STATUS_CODES.has(error.response.status);
};

export const syncOfflineAction = async (action) => {
  await updateOfflineAction(action.id, {
    status: 'syncing',
    attemptCount: (action.attemptCount || 0) + 1,
    lastAttemptAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  });

  try {
    const response = await axiosClient.request({
      method: action.method,
      url: action.url,
      data: action.body,
      headers: {
        ...action.headers,
        'Idempotency-Key': action.idempotencyKey,
      },
    });

    await updateOfflineAction(action.id, {
      status: 'completed',
      serverEntityId: response.data?.data?.id || action.serverEntityId || null,
    });

    return { ok: true, actionId: action.id, response };
  } catch (error) {
    const retryable = isRetryableSyncError(error);
    await updateOfflineAction(action.id, {
      status: retryable ? 'failed' : 'conflict',
      errorCode: error.response?.status || 'NETWORK',
      errorMessage: error.response?.data?.message || error.message || 'Sync failed',
    });

    return { ok: false, actionId: action.id, retryable, error };
  }
};

export const syncPendingOfflineActions = async ({ limit = OFFLINE.syncBatchSize } = {}) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, failed: 0, skipped: true };
  }

  const actions = await getPendingOfflineActions(limit);
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    const result = await syncOfflineAction(action);
    if (result.ok) {
      synced += 1;
    } else {
      failed += 1;
      if (result.retryable) {
        const backoffIndex = Math.min(action.attemptCount || 0, OFFLINE.retryBackoffMs.length - 1);
        await sleep(OFFLINE.retryBackoffMs[backoffIndex]);
      }
    }
  }

  await cleanupOfflineActions();
  await cleanupUploadChunks();
  return { synced, failed, skipped: false };
};

export const startOfflineSyncListeners = ({ onSyncComplete } = {}) => {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await syncPendingOfflineActions();
      onSyncComplete?.(result);
    } finally {
      running = false;
    }
  };

  window.addEventListener('online', run);
  const intervalId = window.setInterval(run, 5 * 60 * 1000);
  run();

  return () => {
    window.removeEventListener('online', run);
    window.clearInterval(intervalId);
  };
};

