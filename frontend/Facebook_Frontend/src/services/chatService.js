import * as signalR from '@microsoft/signalr';
import axiosClient from './axiosClient';
import { CHAT_HUB_URL } from '../config/env';
import { STORAGE_KEYS } from '../shared/generated/constants';

const SIGNALR_HUB_URL = CHAT_HUB_URL;

let connection = null;
let isConnecting = false;

const chatService = {
  // ========== SignalR Connection ==========
  
  getConnection: () => connection,

  startConnection: async () => {
    if (isConnecting) return connection;
    if (connection?.state === signalR.HubConnectionState.Connected) return connection;

    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) return null;

    isConnecting = true;
    connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        accessTokenFactory: () => localStorage.getItem(STORAGE_KEYS.accessToken),
      })
      .withAutomaticReconnect([2000, 5000, 15000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.onreconnecting(() => {});
    connection.onreconnected(() => {});
    connection.onclose(() => { connection = null; });

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

  onReceiveMessage: (callback) => {
    connection?.on('ReceiveMessage', callback);
  },

  offReceiveMessage: (callback) => {
    connection?.off('ReceiveMessage', callback);
  },

  onUserOnline: (callback) => {
    connection?.on('UserOnline', callback);
  },

  offUserOnline: (callback) => {
    connection?.off('UserOnline', callback);
  },

  onUserOffline: (callback) => {
    connection?.on('UserOffline', callback);
  },

  offUserOffline: (callback) => {
    connection?.off('UserOffline', callback);
  },

  onTypingIndicator: (callback) => {
    connection?.on('TypingIndicator', callback);
  },

  offTypingIndicator: (callback) => {
    connection?.off('TypingIndicator', callback);
  },

  // ========== SignalR Invoke ==========

  sendTypingNotification: async (receiverId) => {
    if (connection?.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('TypingNotification', receiverId);
    }
  },

  // ========== REST API ==========

  sendMessage: async ({ conversationId, receiverId, content, messageType = 1 }) => {
    return await axiosClient.post('/chat/messages', {
      conversationId,
      receiverId,
      content,
      messageType,
    });
  },

  getMessages: async (conversationId, pageNumber = 1, pageSize = 20) => {
    return await axiosClient.get(`/chat/conversations/${conversationId}/messages`, {
      params: { pageNumber, pageSize },
    });
  },

  getConversations: async () => {
    return await axiosClient.get('/chat/conversations');
  },
};

export default chatService;
