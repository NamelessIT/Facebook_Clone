import * as signalR from '@microsoft/signalr';
import axiosClient from './axiosClient';

const SIGNALR_HUB_URL = 'http://localhost:5286/hubs/notification';

let connection = null;
let isConnecting = false;

const notificationService = {
  // ========== SignalR Connection ==========

  getConnection: () => connection,

  startConnection: async () => {
    if (isConnecting) return connection;
    if (connection?.state === signalR.HubConnectionState.Connected) return connection;

    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    isConnecting = true;
    connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('accessToken'),
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    try {
      await connection.start();
      return connection;
    } catch {
      connection = null;
      return null;
    } finally {
      isConnecting = false;
    }
  },

  stopConnection: async () => {
    if (isConnecting) return; // Không dừng khi đang kết nối
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      await connection.stop();
      connection = null;
    }
  },

  // ========== SignalR Event Listeners ==========

  onReceiveNotification: (callback) => {
    connection?.on('ReceiveNotification', callback);
  },

  offReceiveNotification: (callback) => {
    connection?.off('ReceiveNotification', callback);
  },

  // ========== REST API ==========

  getNotifications: async (pageNumber = 1, pageSize = 10) => {
    return await axiosClient.get('/notifications', {
      params: { pageNumber, pageSize },
    });
  },

  markAsRead: async (notificationId) => {
    return await axiosClient.post(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async () => {
    return await axiosClient.post('/notifications/all/read');
  },
};

export default notificationService;
