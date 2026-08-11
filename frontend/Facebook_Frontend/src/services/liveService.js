import * as signalR from '@microsoft/signalr';
import axiosClient from './axiosClient';
import { LIVE_HUB_URL } from '../config/env';
import { STORAGE_KEYS } from '../shared/generated/constants';

const liveService = {
  list: (includeEnded = true) => axiosClient.get('/lives', { params: { includeEnded } }),
  get: (id) => axiosClient.get(`/lives/${id}`),
  start: (payload) => axiosClient.post('/lives', payload),
  changePrivacy: (id, privacy) => axiosClient.put(`/lives/${id}/privacy`, { privacy }),
  getComments: (id, limit) => axiosClient.get(`/lives/${id}/comments`, { params: { limit } }),
  addComment: (id, payload) => axiosClient.post(`/lives/${id}/comments`, payload),
  stop: (id) => axiosClient.put(`/lives/${id}/stop`),
  uploadRecording: (id, blob, onUploadProgress) => {
    const form = new FormData();
    form.append('recording', blob, `live-${id}.webm`);
    return axiosClient.post(`/lives/${id}/recording`, form, { onUploadProgress });
  },
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
