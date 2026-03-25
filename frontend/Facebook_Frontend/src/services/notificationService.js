import * as signalR from '@microsoft/signalr';
import axiosClient from './axiosClient';

const SIGNALR_HUB_URL = 'http://localhost:5286/hubs/notification';

let connection = null;

const notificationService = {
  // ========== SignalR Connection ==========

  getConnection: () => connection,

  startConnection: async () => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('accessToken'),
      })
      .withAutomaticReconnect([0, 2000, 5000])
      .build();

    try {
      await connection.start();
      return connection;
    } catch {
      connection = null;
      return null;
    }
  },

  stopConnection: async () => {
    if (connection) {
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
    return await axiosClient.put(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async () => {
    return await axiosClient.put('/notifications/read-all');
  },
};

export default notificationService;
