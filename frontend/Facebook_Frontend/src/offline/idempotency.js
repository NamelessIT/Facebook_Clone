export const createIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 12);
  return `${timestamp}-${random}`;
};

export const createFileFingerprint = (file) => {
  if (!file) return null;
  return [
    file.name,
    file.size,
    file.type || 'application/octet-stream',
    file.lastModified || 0,
  ].join(':');
};

