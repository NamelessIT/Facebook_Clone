import * as signalR from '@microsoft/signalr';
import axiosClient from './axiosClient';
import { LIVE_HUB_URL } from '../config/env';
import { STORAGE_KEYS, UPLOAD_CHUNKS } from '../shared/generated/constants';

const liveService = {
  list: (includeEnded = true) => axiosClient.get('/lives', { params: { includeEnded } }),
  get: (id) => axiosClient.get(`/lives/${id}`),
  start: (payload) => axiosClient.post('/lives', payload),
  changePrivacy: (id, privacy) => axiosClient.put(`/lives/${id}/privacy`, { privacy }),
  getComments: (id, limit) => axiosClient.get(`/lives/${id}/comments`, { params: { limit } }),
  addComment: (id, payload) => axiosClient.post(`/lives/${id}/comments`, payload),
  stop: (id) => axiosClient.put(`/lives/${id}/stop`),
  uploadRecording: async (id, blob, onUploadProgress) => {
    const chunkSize = UPLOAD_CHUNKS.defaultChunkSizeBytes;
    const totalChunks = Math.ceil(blob.size / chunkSize);
    const initialized = await axiosClient.post(`/lives/${id}/recording/uploads`, {
      fileName: `live-${id}.webm`,
      contentType: blob.type || 'video/webm',
      totalSize: blob.size,
      totalChunks,
    });
    const ticket = initialized.data.data;
    let completedBytes = 0;
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * ticket.chunkSizeBytes;
      const part = blob.slice(start, Math.min(start + ticket.chunkSizeBytes, blob.size));
      const form = new FormData();
      form.append('chunk', part, `live-${id}-${chunkIndex}.part`);
      await axiosClient.post(`/lives/${id}/recording/uploads/${ticket.uploadId}/chunks/${chunkIndex}`, form, {
        onUploadProgress: (event) => onUploadProgress?.({
          loaded: Math.min(completedBytes + event.loaded, blob.size),
          total: blob.size,
          chunkIndex,
          totalChunks,
        }),
      });
      completedBytes += part.size;
      onUploadProgress?.({ loaded: completedBytes, total: blob.size, chunkIndex, totalChunks });
    }
    return axiosClient.post(`/lives/${id}/recording/uploads/${ticket.uploadId}/complete`);
  },
  prepareConversion: (id) => axiosClient.post(`/lives/${id}/prepare-conversion`),
  discard: (id) => axiosClient.delete(`/lives/${id}`),
  convertToPost: (id, payload) => axiosClient.post(`/lives/${id}/convert-to-post`, payload),
  createConnection: () => new signalR.HubConnectionBuilder()
    .withUrl(LIVE_HUB_URL, {
      accessTokenFactory: () => localStorage.getItem(STORAGE_KEYS.accessToken) || '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build(),
};

export default liveService;
