import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/useLocalization';
import chatService from '../../services/chatService';
import Avatar from '../common/Avatar';
import MessageInput from './MessageInput';
import { TIMERS } from '../../shared/generated/constants';
import './ChatWindow.css';

const formatMessageTime = (dateStr) => {
  const date = new Date(dateStr);
  return format(date, 'HH:mm');
};

const formatDateLabel = (dateStr, t) => {
  const date = new Date(dateStr);
  if (isToday(date)) return t('chat.today');
  if (isYesterday(date)) return t('chat.yesterday');
  return format(date, 'dd/MM/yyyy');
};

const shouldShowDateSeparator = (current, previous) => {
  if (!previous) return true;
  const d1 = new Date(current.createdAt).toDateString();
  const d2 = new Date(previous.createdAt).toDateString();
  return d1 !== d2;
};

const ChatWindow = ({ friend, conversationId, onConversationCreated }) => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [activeConvId, setActiveConvId] = useState(conversationId);
  const [isOnline, setIsOnline] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load messages
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setHasMore(false);
      setPage(1);
      isInitialLoad.current = true;
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await chatService.getMessages(activeConvId, 1, 20);
        const data = res.data?.data || [];
        setMessages(data.reverse());
        setHasMore(data.length >= 20);
        setPage(1);
        isInitialLoad.current = true;
      } catch {
        toast.error(t('chat.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [activeConvId, t]);

  // Update activeConvId when prop changes
  useEffect(() => {
    setActiveConvId(conversationId);
  }, [conversationId]);

  // Tìm conversation đã tồn tại khi mở chat với bạn bè nhưng chưa có conversationId
  useEffect(() => {
    const friendId = friend?.userId || friend?.id;
    if (!friendId || conversationId) return; // Đã có conversationId thì không cần tìm nữa

    const findExistingConversation = async () => {
      try {
        const res = await chatService.getConversations();
        const convs = res.data?.data || [];
        const existing = convs.find((c) => c.otherUser?.id === friendId);
        if (existing?.conversationId) {
          setActiveConvId(existing.conversationId);
          onConversationCreated?.(existing.conversationId);
        }
      } catch {
        // Chưa có conversation — sẽ tạo khi gửi tin nhắn đầu tiên
      }
    };

    findExistingConversation();
  }, [friend?.userId, friend?.id, conversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(isInitialLoad.current ? 'instant' : 'smooth');
      isInitialLoad.current = false;
    }
  }, [messages, scrollToBottom]);

  // Query initial online status when friend changes
  useEffect(() => {
    const friendId = friend?.userId || friend?.id;
    if (!friendId) return;

    const queryOnlineStatus = async () => {
      try {
        const userService = (await import('../../services/userService')).default;
        const res = await userService.getUserById(friendId);
        const userData = res.data?.data;
        if (userData?.lastSeenAt) {
          const lastSeen = new Date(userData.lastSeenAt);
          const now = new Date();
          const minutesAgo = (now - lastSeen) / (1000 * 60);
          setIsOnline(userData.isOnline !== undefined ? userData.isOnline : minutesAgo < 5);
        } else {
          setIsOnline(false);
        }
      } catch {
        setIsOnline(false);
      }
    };

    queryOnlineStatus();
  }, [friend?.userId, friend?.id]);

  // Load older messages
  const loadMore = async () => {
    if (!activeConvId || loading) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await chatService.getMessages(activeConvId, nextPage, 20);
      const data = res.data?.data || [];
      setMessages((prev) => [...data.reverse(), ...prev]);
      setHasMore(data.length >= 20);
      setPage(nextPage);
    } catch {
      toast.error(t('chat.loadMoreFailed'));
    } finally {
      setLoading(false);
    }
  };

  // ========== SignalR Events ==========
  useEffect(() => {
    const handleReceiveMessage = (message) => {
      const senderId = message.sender?.id || message.senderId;
      const convId = message.conversationId;
      const friendId = friend?.userId || friend?.id;

      if (convId === activeConvId) {
        setMessages((prev) => [...prev, message]);
      } else if (senderId === friendId) {
        // Message from this friend but different conversation
        setMessages((prev) => [...prev, message]);
        if (!activeConvId && convId) {
          setActiveConvId(convId);
          onConversationCreated?.(convId);
        }
      } else {
        // Message from another friend — show toast
        const senderName = message.sender?.fullName || t('chat.someone');
        toast(`${senderName}: ${message.content?.substring(0, 50)}`, { icon: '💬' });
      }
    };

    const handleUserOnline = (userId) => {
      if (userId === (friend?.userId || friend?.id)) setIsOnline(true);
    };

    const handleUserOffline = (userId) => {
      if (userId === (friend?.userId || friend?.id)) setIsOnline(false);
    };

    const handleTyping = (userId) => {
      if (userId !== (friend?.userId || friend?.id)) return;
      setTypingUser(friend?.profile?.fullName || friend?.fullName || t('chat.userFallback'));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), TIMERS.chatTypingTimeoutMs);
    };

    chatService.onReceiveMessage(handleReceiveMessage);
    chatService.onUserOnline(handleUserOnline);
    chatService.onUserOffline(handleUserOffline);
    chatService.onTypingIndicator(handleTyping);

    return () => {
      chatService.offReceiveMessage(handleReceiveMessage);
      chatService.offUserOnline(handleUserOnline);
      chatService.offUserOffline(handleUserOffline);
      chatService.offTypingIndicator(handleTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeConvId, friend, onConversationCreated, t]);

  // ========== Handle message sent ==========
  const handleMessageSent = (message) => {
    if (message) {
      setMessages((prev) => [...prev, message]);
      if (!activeConvId && message.conversationId) {
        setActiveConvId(message.conversationId);
        onConversationCreated?.(message.conversationId);
      }
    }
  };

  // No friend selected
  if (!friend) {
    return (
      <div className="chat-window">
        <div className="chat-window-empty">
          <MessageCircle size={64} className="chat-window-empty-icon" />
          <h3>{t('chat.selectConversation')}</h3>
          <p>{t('chat.selectConversationDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window-header">
        <Avatar src={friend.profile?.avatarUrl || friend.avatarUrl} className="w-10 h-10" />
        <div className="chat-header-info">
          <h4 className="chat-header-name">{friend.profile?.fullName || friend.fullName}</h4>
          <p className="chat-header-status">
            {isOnline && <span className="online-dot" />}
            {isOnline ? t('chat.online') : t('chat.offline')}
          </p>
        </div>
      </div>

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <div className="chat-messages-loading">{t('chat.loadingMessages')}</div>
      ) : messages.length === 0 ? (
        <div className="chat-messages-empty">
          {t('chat.noMessages')}
        </div>
      ) : (
        <div className="chat-messages">
          {hasMore && (
            <div className="chat-load-more">
              <button className="chat-load-more-btn" onClick={loadMore} disabled={loading}>
                {loading ? t('common.loading') : t('chat.loadOlder')}
              </button>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isOwn = (msg.sender?.id || msg.senderId) === user?.id;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDate = shouldShowDateSeparator(msg, prevMsg);

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="message-date-separator">
                    {formatDateLabel(msg.createdAt, t)}
                  </div>
                )}
                <div className={`message-row ${isOwn ? 'message-row--own' : 'message-row--other'}`}>
                  {!isOwn && (
                    <Avatar src={friend.profile?.avatarUrl || friend.avatarUrl} className="w-7 h-7" />
                  )}
                  <div className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--other'}`}>
                    {msg.content}
                  </div>
                </div>
                <div className={`message-time ${isOwn ? 'message-time--own' : 'message-time--other'}`}>
                  {formatMessageTime(msg.createdAt)}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Typing indicator */}
      {typingUser && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          {t('chat.typing', undefined, { name: typingUser })}
        </div>
      )}

      {/* Input */}
      <MessageInput
        conversationId={activeConvId}
        receiverId={friend.userId || friend.id}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
};

export default ChatWindow;
