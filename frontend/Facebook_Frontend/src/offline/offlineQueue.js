import { OFFLINE, UPLOAD_CHUNKS } from '../shared/generated/constants';
import {
  OFFLINE_STORES,
  getAllFromStore,
  putInStore,
  deleteFromStore,
} from './indexedDb';
import { createFileFingerprint, createIdempotencyKey } from './idempotency';

const DAY_MS = 24 * 60 * 60 * 1000;

const nowIso = () => new Date().toISOString();

const addDaysIso = (days) => new Date(Date.now() + days * DAY_MS).toISOString();

const isExpired = (item, maxAgeDays) => {
  const expiresAt = item.expiresAt ? Date.parse(item.expiresAt) : NaN;
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return true;

  const createdAt = Date.parse(item.createdAt || item.updatedAt || 0);
  return Number.isFinite(createdAt) && createdAt <= Date.now() - maxAgeDays * DAY_MS;
};

const sortNewestFirst = (a, b) =>
  Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0);

const normalizeActionStatus = (status) =>
  OFFLINE.actionStatuses.includes(status) ? status : 'pending';

const normalizeChunkStatus = (status) =>
  UPLOAD_CHUNKS.statuses.includes(status) ? status : 'pending';

export const enqueueOfflineAction = async (action) => {
  const timestamp = nowIso();
  const record = {
    id: action.id || createIdempotencyKey(),
    idempotencyKey: action.idempotencyKey || createIdempotencyKey(),
    type: action.type,
    method: action.method || 'POST',
    url: action.url,
    body: action.body ?? null,
    headers: action.headers ?? {},
    entityType: action.entityType ?? null,
    entityId: action.entityId ?? null,
    localEntityId: action.localEntityId ?? null,
    status: normalizeActionStatus(action.status),
    attemptCount: action.attemptCount ?? 0,
    createdAt: action.createdAt || timestamp,
    updatedAt: timestamp,
    lastAttemptAt: action.lastAttemptAt ?? null,
    expiresAt: action.expiresAt || addDaysIso(OFFLINE.maxAgeDays),
    errorCode: action.errorCode ?? null,
    errorMessage: action.errorMessage ?? null,
    rollbackStrategy: action.rollbackStrategy ?? null,
    completedAt: action.completedAt ?? null,
    serverEntityId: action.serverEntityId ?? null,
  };

  await putInStore(OFFLINE_STORES.actions, record);
  await cleanupOfflineActions();
  return record;
};

export const updateOfflineAction = async (id, patch) => {
  const actions = await getAllFromStore(OFFLINE_STORES.actions);
  const existing = actions.find((item) => item.id === id);
  if (!existing) return null;

  const next = {
    ...existing,
    ...patch,
    status: normalizeActionStatus(patch.status || existing.status),
    updatedAt: nowIso(),
  };

  if (next.status === 'completed' && !next.completedAt) {
    next.completedAt = nowIso();
  }

  await putInStore(OFFLINE_STORES.actions, next);
  return next;
};

export const getOfflineActions = async ({ statuses } = {}) => {
  const actions = await getAllFromStore(OFFLINE_STORES.actions);
  const allowed = statuses ? new Set(statuses) : null;
  return actions
    .filter((action) => !allowed || allowed.has(action.status))
    .sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0));
};

export const getPendingOfflineActions = async (limit = OFFLINE.syncBatchSize) => {
  const retryable = new Set(OFFLINE.retryableStatuses);
  const actions = await getOfflineActions();
  return actions
    .filter((action) => retryable.has(action.status) && !isExpired(action, OFFLINE.maxAgeDays))
    .slice(0, limit);
};

export const cleanupOfflineActions = async () => {
  const actions = await getAllFromStore(OFFLINE_STORES.actions);
  const sorted = [...actions].sort(sortNewestFirst);
  const keepIds = new Set(sorted.slice(0, OFFLINE.maxActions).map((item) => item.id));
  let removed = 0;

  for (const action of actions) {
    const terminal = OFFLINE.terminalStatuses.includes(action.status);
    const shouldRemove = !keepIds.has(action.id) || (terminal && isExpired(action, OFFLINE.maxAgeDays));
    if (shouldRemove) {
      await deleteFromStore(OFFLINE_STORES.actions, action.id);
      removed += 1;
    }
  }

  return { total: actions.length, removed };
};

export const createUploadSession = async ({ file, targetType, targetId, uploadId }) => {
  if (!UPLOAD_CHUNKS.targetTypes.includes(targetType)) {
    throw new Error(`Unsupported upload target type: ${targetType}`);
  }

  const sessionId = uploadId || createIdempotencyKey();
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNKS.defaultChunkSizeBytes));
  const timestamp = nowIso();
  const fingerprint = createFileFingerprint(file);
  const records = [];

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const record = {
      id: `${sessionId}:${chunkIndex}`,
      uploadId: sessionId,
      fileFingerprint: fingerprint,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      targetType,
      targetId: targetId ?? null,
      chunkIndex,
      totalChunks,
      chunkSizeBytes: UPLOAD_CHUNKS.defaultChunkSizeBytes,
      status: 'pending',
      etag: null,
      serverPartId: null,
      attemptCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastAttemptAt: null,
      expiresAt: addDaysIso(UPLOAD_CHUNKS.maxAgeDays),
      errorMessage: null,
    };
    await putInStore(OFFLINE_STORES.uploadChunks, record);
    records.push(record);
  }

  await cleanupUploadChunks();
  return { uploadId: sessionId, fileFingerprint: fingerprint, totalChunks, chunks: records };
};

export const updateUploadChunk = async (uploadId, chunkIndex, patch) => {
  const chunks = await getAllFromStore(OFFLINE_STORES.uploadChunks);
  const existing = chunks.find((item) => item.uploadId === uploadId && item.chunkIndex === chunkIndex);
  if (!existing) return null;

  const next = {
    ...existing,
    ...patch,
    status: normalizeChunkStatus(patch.status || existing.status),
    updatedAt: nowIso(),
  };
  await putInStore(OFFLINE_STORES.uploadChunks, next);
  return next;
};

export const getUploadSessionChunks = async (uploadId) => {
  const chunks = await getAllFromStore(OFFLINE_STORES.uploadChunks);
  return chunks
    .filter((chunk) => chunk.uploadId === uploadId)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
};

export const getNextUploadChunk = async (uploadId) => {
  const chunks = await getUploadSessionChunks(uploadId);
  return chunks.find((chunk) => chunk.status !== 'completed') || null;
};

export const getResumableUploadSessions = async () => {
  const chunks = await getAllFromStore(OFFLINE_STORES.uploadChunks);
  const resumable = new Map();

  for (const chunk of chunks) {
    if (chunk.status === 'completed' || chunk.status === 'expired') continue;
    if (isExpired(chunk, UPLOAD_CHUNKS.maxAgeDays)) continue;
    if (!resumable.has(chunk.uploadId)) {
      resumable.set(chunk.uploadId, {
        uploadId: chunk.uploadId,
        fileFingerprint: chunk.fileFingerprint,
        fileName: chunk.fileName,
        fileSize: chunk.fileSize,
        targetType: chunk.targetType,
        targetId: chunk.targetId,
        totalChunks: chunk.totalChunks,
        pendingChunks: 0,
      });
    }
    resumable.get(chunk.uploadId).pendingChunks += 1;
  }

  return [...resumable.values()];
};

export const cleanupUploadChunks = async () => {
  const chunks = await getAllFromStore(OFFLINE_STORES.uploadChunks);
  const sorted = [...chunks].sort(sortNewestFirst);
  const keepIds = new Set(sorted.slice(0, UPLOAD_CHUNKS.maxRecords).map((item) => item.id));
  let removed = 0;

  for (const chunk of chunks) {
    const removable = chunk.status === 'completed' || chunk.status === 'expired';
    const shouldRemove = !keepIds.has(chunk.id) || (removable && isExpired(chunk, UPLOAD_CHUNKS.maxAgeDays));
    if (shouldRemove) {
      await deleteFromStore(OFFLINE_STORES.uploadChunks, chunk.id);
      removed += 1;
    }
  }

  return { total: chunks.length, removed };
};

