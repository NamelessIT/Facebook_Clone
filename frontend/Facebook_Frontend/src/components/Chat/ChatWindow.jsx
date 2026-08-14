import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronDown, MessageCircle, Copy, Forward, Pencil, Pin, PinOff, Reply, Trash2, Undo2, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from '../../shared/appToast';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/useLocalization';
import chatService from '../../services/chatService';
import userService from '../../services/userService';
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
  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardTargets, setForwardTargets] = useState([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [isPinnedMenuOpen, setIsPinnedMenuOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const messageRefs = useRef(new Map());
  const pinnedMenuRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
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
      } catch (error) {
        toast.apiError(error, t('chat.loadFailed'), { context: "chat.messages.load" });
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [activeConvId, t]);

  useEffect(() => {
    setContextMenu(null);
    setReplyTo(null);
    setEditingMessage(null);
    setForwardMessage(null);
    setIsPinnedMenuOpen(false);
    setHighlightedMessageId(null);
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
  }, [friend?.userId, friend?.id, conversationId, onConversationCreated]);

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
    } catch (error) {
      toast.apiError(error, t('chat.loadMoreFailed'), { context: "chat.messages.loadMore" });
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

    const handleMessageEdited = ({ oldMessageId, conversationId: convId, message }) => {
      if (convId !== activeConvId) return;
      setMessages((current) => current.map((item) => item.id === oldMessageId ? message : item));
    };

    const handleMessageRecalled = ({ messageId, conversationId: convId }) => {
      if (convId !== activeConvId) return;
      setMessages((current) => current.map((item) => item.id === messageId
        ? { ...item, isRecalled: true, isPinned: false }
        : item));
    };

    const handleMessagePinned = ({ messageId, conversationId: convId, isPinned, pinnedById, pinnedAt }) => {
      if (convId !== activeConvId) return;
      setMessages((current) => current.map((item) => item.id === messageId
        ? { ...item, isPinned, pinnedById, pinnedAt }
        : item));
    };

    chatService.onReceiveMessage(handleReceiveMessage);
    chatService.onUserOnline(handleUserOnline);
    chatService.onUserOffline(handleUserOffline);
    chatService.onTypingIndicator(handleTyping);
    chatService.onMessageEdited(handleMessageEdited);
    chatService.onMessageRecalled(handleMessageRecalled);
    chatService.onMessagePinned(handleMessagePinned);

    return () => {
      chatService.offReceiveMessage(handleReceiveMessage);
      chatService.offUserOnline(handleUserOnline);
      chatService.offUserOffline(handleUserOffline);
      chatService.offTypingIndicator(handleTyping);
      chatService.offMessageEdited(handleMessageEdited);
      chatService.offMessageRecalled(handleMessageRecalled);
      chatService.offMessagePinned(handleMessagePinned);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeConvId, friend, onConversationCreated, t]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!isPinnedMenuOpen) return undefined;

    const closeWhenOutside = (event) => {
      if (!pinnedMenuRef.current?.contains(event.target)) setIsPinnedMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsPinnedMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeWhenOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isPinnedMenuOpen]);

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

  const replaceMessage = useCallback((oldMessageId, replacement) => {
    if (!replacement) return;
    setMessages((current) => current.map((item) => item.id === oldMessageId ? replacement : item));
  }, []);

  const runMessageAction = async (action, message) => {
    setContextMenu(null);
    try {
      if (action === 'copy') {
        await navigator.clipboard.writeText(message.content || '');
        toast.success('Đã sao chép tin nhắn.');
      } else if (action === 'reply') {
        setReplyTo(message); setEditingMessage(null);
      } else if (action === 'edit') {
        setEditingMessage(message); setReplyTo(null);
      } else if (action === 'delete') {
        await chatService.hideMessage(message.id);
        setMessages((current) => current.filter((item) => item.id !== message.id));
        toast.success('Tin nhắn chỉ được xóa ở phía bạn.');
      } else if (action === 'recall') {
        await chatService.recallMessage(message.id);
        setMessages((current) => current.map((item) => item.id === message.id ? { ...item, isRecalled: true, isPinned: false } : item));
        toast.success('Đã thu hồi tin nhắn.');
      } else if (action === 'pin') {
        const isPinned = !message.isPinned;
        await chatService.setMessagePinned(message.id, isPinned);
        setMessages((current) => current.map((item) => item.id === message.id ? { ...item, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null } : item));
      } else if (action === 'forward') {
        setForwardLoading(true);
        setForwardMessage(message);
        const response = await chatService.getConversations();
        setForwardTargets(response.data?.data || []);
      }
    } catch (error) {
      toast.apiError(error, 'Không thể thực hiện thao tác với tin nhắn.', { context: 'chat.message.action' });
      if (action === 'forward') setForwardMessage(null);
    } finally {
      setForwardLoading(false);
    }
  };

  const submitForward = async (target) => {
    if (!forwardMessage) return;
    setForwardLoading(true);
    try {
      await chatService.forwardMessage(forwardMessage.id, { conversationId: target.conversationId });
      toast.success(`Đã chuyển tiếp tới ${target.displayName || target.otherUser?.fullName || 'cuộc trò chuyện'}.`);
      setForwardMessage(null);
    } catch (error) {
      toast.apiError(error, 'Không thể chuyển tiếp tin nhắn.', { context: 'chat.message.forward' });
    } finally {
      setForwardLoading(false);
    }
  };

  const openContextMenu = (event, message) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ message, x: Math.min(event.clientX, window.innerWidth - 230), y: Math.min(event.clientY, window.innerHeight - 320) });
  };

  const startLongPress = (event, message) => {
    const point = event.touches?.[0] || event;
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      setContextMenu({ message, x: Math.min(point.clientX, window.innerWidth - 230), y: Math.min(point.clientY, window.innerHeight - 320) });
    }, 550);
  };

  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = null;
  };

  const pinnedMessages = useMemo(() => messages
    .filter((message) => message.isPinned && !message.isRecalled)
    .sort((first, second) => new Date(second.pinnedAt || second.createdAt) - new Date(first.pinnedAt || first.createdAt)), [messages]);

  const focusPinnedMessage = useCallback((messageId) => {
    const messageElement = messageRefs.current.get(messageId);
    setIsPinnedMenuOpen(false);
    if (!messageElement) return;

    const scrollContainer = messageElement.closest('.chat-messages');
    const messageRect = messageElement.getBoundingClientRect();
    const containerRect = scrollContainer?.getBoundingClientRect();
    const isVisible = containerRect
      ? messageRect.top >= containerRect.top && messageRect.bottom <= containerRect.bottom
      : messageRect.top >= 0 && messageRect.bottom <= window.innerHeight;

    if (!isVisible) messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    setHighlightedMessageId(messageId);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 2200);
  }, []);

  const handlePinnedTrigger = () => {
    if (pinnedMessages.length === 1) {
      focusPinnedMessage(pinnedMessages[0].id);
      return;
    }
    setIsPinnedMenuOpen((current) => !current);
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

      {pinnedMessages.length > 0 && (
        <div className={`chat-pinned ${isPinnedMenuOpen ? 'chat-pinned--open' : ''}`} ref={pinnedMenuRef}>
          <button
            type="button"
            className="chat-pinned-trigger"
            onClick={handlePinnedTrigger}
            aria-expanded={pinnedMessages.length > 1 ? isPinnedMenuOpen : undefined}
            aria-haspopup={pinnedMessages.length > 1 ? 'menu' : undefined}
            title={pinnedMessages.length === 1 ? 'Đi tới tin nhắn đã ghim' : 'Xem các tin nhắn đã ghim'}
          >
            <span className="chat-pinned-icon"><Pin size={14} /></span>
            <span className="chat-pinned-summary">
              <strong>{pinnedMessages.length} tin nhắn đã ghim</strong>
              <span>{pinnedMessages[0]?.content?.slice(0, 80)}</span>
            </span>
            {pinnedMessages.length > 1 && <ChevronDown className="chat-pinned-chevron" size={16} />}
          </button>

          {isPinnedMenuOpen && pinnedMessages.length > 1 && (
            <div className="chat-pinned-menu" role="menu" aria-label="Tin nhắn đã ghim">
              <div className="chat-pinned-menu-header">
                <strong>Tin nhắn đã ghim</strong>
                <span>{pinnedMessages.length} tin nhắn</span>
              </div>
              <div className="chat-pinned-menu-list">
                {pinnedMessages.map((message) => {
                  const isOwn = (message.sender?.id || message.senderId) === user?.id;
                  return (
                    <button
                      type="button"
                      role="menuitem"
                      className="chat-pinned-menu-item"
                      key={message.id}
                      onClick={() => focusPinnedMessage(message.id)}
                    >
                      <span className="chat-pinned-menu-marker"><Pin size={13} /></span>
                      <span className="chat-pinned-menu-copy">
                        <strong>{isOwn ? 'Bạn' : (message.sender?.fullName || friend.profile?.fullName || friend.fullName)}</strong>
                        <span>{message.content || 'Tin nhắn'}</span>
                      </span>
                      <time>{formatMessageTime(message.createdAt)}</time>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
              <div
                key={msg.id}
                ref={(node) => {
                  if (node) messageRefs.current.set(msg.id, node);
                  else messageRefs.current.delete(msg.id);
                }}
                className={`message-entry ${highlightedMessageId === msg.id ? 'message-entry--highlighted' : ''}`}
                data-message-id={msg.id}
              >
                {showDate && (
                  <div className="message-date-separator">
                    {formatDateLabel(msg.createdAt, t)}
                  </div>
                )}
                <div
                  className={`message-row ${isOwn ? 'message-row--own' : 'message-row--other'}`}
                  onContextMenu={(event) => openContextMenu(event, msg)}
                  onTouchStart={(event) => startLongPress(event, msg)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                >
                  {!isOwn && (
                    <Avatar src={friend.profile?.avatarUrl || friend.avatarUrl} className="w-7 h-7" />
                  )}
                  <div className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--other'} ${msg.isRecalled ? 'message-bubble--recalled' : ''}`}>
                    {msg.replyTo && !msg.isRecalled && <div className="message-reply-preview"><strong>{msg.replyTo.senderName || 'Tin nhắn'}</strong><span>{msg.replyTo.content}</span></div>}
                    {msg.isForwarded && !msg.isRecalled && <small className="message-forwarded-label"><Forward size={12} /> Đã chuyển tiếp</small>}
                    {msg.isRecalled ? <em>Tin nhắn đã được thu hồi</em> : msg.content}
                  </div>
                </div>
                <div className={`message-time ${isOwn ? 'message-time--own' : 'message-time--other'}`}>
                  {msg.isPinned && <span><Pin size={10} /> Đã ghim · </span>}{msg.isEdited && <span>Đã chỉnh sửa · </span>}{formatMessageTime(msg.createdAt)}
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
        replyTo={replyTo}
        editingMessage={editingMessage}
        onMessageEdited={replaceMessage}
        onCancelAction={() => { setReplyTo(null); setEditingMessage(null); }}
      />

      {contextMenu && (() => {
        const message = contextMenu.message;
        const isOwn = (message.sender?.id || message.senderId) === user?.id;
        const isLatest = messages.at(-1)?.id === message.id;
        const canEdit = isOwn && isLatest && !message.isRecalled && Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;
        return <div className="message-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          {!message.isRecalled && <button onClick={() => runMessageAction('reply', message)}><Reply /> Trả lời</button>}
          {canEdit && <button onClick={() => runMessageAction('edit', message)}><Pencil /> Chỉnh sửa</button>}
          {!message.isRecalled && <button onClick={() => runMessageAction('copy', message)}><Copy /> Sao chép</button>}
          {!message.isRecalled && <button onClick={() => runMessageAction('forward', message)}><Forward /> Chuyển tiếp</button>}
          {!message.isRecalled && <button onClick={() => runMessageAction('pin', message)}>{message.isPinned ? <PinOff /> : <Pin />}{message.isPinned ? 'Bỏ ghim' : 'Ghim'}</button>}
          <button onClick={() => runMessageAction('delete', message)}><Trash2 /> Xóa ở phía bạn</button>
          {isOwn && !message.isRecalled && <button className="danger" onClick={() => runMessageAction('recall', message)}><Undo2 /> Thu hồi với mọi người</button>}
        </div>;
      })()}

      {forwardMessage && <div className="message-forward-backdrop" onMouseDown={() => !forwardLoading && setForwardMessage(null)}>
        <section className="message-forward-dialog" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><strong>Chuyển tiếp tin nhắn</strong><p>Chọn một người dùng hoặc nhóm đã có cuộc trò chuyện.</p></div><button onClick={() => setForwardMessage(null)}><X /></button></header>
          <div className="message-forward-source">{forwardMessage.content}</div>
          <div className="message-forward-targets">
            {forwardTargets.filter((target) => target.conversationId !== activeConvId).map((target) => <button key={target.conversationId} disabled={forwardLoading} onClick={() => submitForward(target)}>
              <span>{target.displayName || target.otherUser?.fullName || 'Cuộc trò chuyện'}</span><small>{target.type === 2 ? `${target.memberCount} thành viên` : 'Người dùng'}</small>
            </button>)}
            {!forwardLoading && forwardTargets.filter((target) => target.conversationId !== activeConvId).length === 0 && <p>Chưa có cuộc trò chuyện khác để chuyển tiếp.</p>}
          </div>
        </section>
      </div>}
    </div>
  );
};

export default ChatWindow;
