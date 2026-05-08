import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import chatService from '../../services/chatService';
import Avatar from '../common/Avatar';
import MessageInput from './MessageInput';
import './ChatWindow.css';

const formatMessageTime = (dateStr) => {
  const date = new Date(dateStr);
  return format(date, 'HH:mm');
};

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hôm nay';
  if (isYesterday(date)) return 'Hôm qua';
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
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [activeConvId, setActiveConvId] = useState(conversationId);
  const messagesEndRef = useRef(null);
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
        toast.error('Không thể tải tin nhắn.');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [activeConvId]);

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
      toast.error('Không thể tải thêm tin nhắn.');
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
        const senderName = message.sender?.fullName || 'Ai đó';
        toast(`${senderName}: ${message.content?.substring(0, 50)}`, { icon: '💬' });
      }
    };

    chatService.onReceiveMessage(handleReceiveMessage);

    return () => {
      chatService.offReceiveMessage(handleReceiveMessage);
    };
  }, [activeConvId, friend, onConversationCreated]);

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
          <h3>Chọn một cuộc trò chuyện</h3>
          <p>Chọn bạn bè từ danh sách bên trái để bắt đầu trò chuyện</p>
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
        </div>
      </div>

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <div className="chat-messages-loading">Đang tải tin nhắn...</div>
      ) : messages.length === 0 ? (
        <div className="chat-messages-empty">
          Chưa có tin nhắn. Hãy gửi lời chào!
        </div>
      ) : (
        <div className="chat-messages">
          {hasMore && (
            <div className="chat-load-more">
              <button className="chat-load-more-btn" onClick={loadMore} disabled={loading}>
                {loading ? 'Đang tải...' : 'Xem tin nhắn cũ hơn'}
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
                    {formatDateLabel(msg.createdAt)}
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
