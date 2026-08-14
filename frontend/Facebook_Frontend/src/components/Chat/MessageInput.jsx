import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader, X, Reply, Pencil } from 'lucide-react';
import toast from '../../shared/appToast';
import chatService from '../../services/chatService';
import { useLocalization } from '../../contexts/useLocalization';
import { LIMITS, TIMERS } from '../../shared/generated/constants';
import './MessageInput.css';

const MessageInput = ({ conversationId, receiverId, onMessageSent, replyTo, editingMessage, onMessageEdited, onCancelAction }) => {
  const { t } = useLocalization();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const typingTimerRef = useRef(null);

  const editIdRef = useRef(null);

  useEffect(() => {
    if (editingMessage?.id) {
      editIdRef.current = editingMessage.id;
      setContent(editingMessage.content || '');
    } else if (editIdRef.current) {
      editIdRef.current = null;
      setContent('');
    }
  }, [editingMessage]);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  const handleTyping = useCallback((value) => {
    setContent(value);

    if (!receiverId) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      chatService.sendTypingNotification(receiverId).catch(() => {});
    }, TIMERS.chatTypingDebounceMs);
  }, [receiverId]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = editingMessage
        ? await chatService.editMessage(editingMessage.id, trimmed)
        : await chatService.sendMessage({
            conversationId,
            receiverId: conversationId ? undefined : receiverId,
            content: trimmed,
            replyToMessageId: replyTo?.id,
          });
      const message = editingMessage ? res.data?.data?.message : res.data?.data;
      setContent('');
      if (editingMessage) onMessageEdited?.(editingMessage.id, message);
      else onMessageSent?.(message);
      onCancelAction?.();
    } catch (error) {
      toast.apiError(error, t('chat.sendFailed'), { context: "chat.message.send" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = content.trim().length > 0 && content.length <= LIMITS.messageMaxLength && !sending;

  return (
    <div className="message-input-container">
      {(replyTo || editingMessage) && (
        <div className="message-composer-context">
          <div>{editingMessage ? <Pencil size={15} /> : <Reply size={15} />}</div>
          <div className="message-composer-context__body">
            <strong>{editingMessage ? 'Chỉnh sửa tin nhắn' : `Trả lời ${replyTo?.sender?.fullName || replyTo?.senderName || 'tin nhắn'}`}</strong>
            <span>{(editingMessage?.content || replyTo?.content || '').slice(0, 120)}</span>
          </div>
          <button type="button" onClick={onCancelAction} aria-label="Hủy thao tác"><X size={16} /></button>
        </div>
      )}
      <div className="message-input-wrapper">
        <textarea
          className="message-input-field"
          placeholder={t('chat.messagePlaceholder')}
          value={content}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={LIMITS.messageMaxLength}
          rows={1}
          disabled={sending}
        />
        {content.length > LIMITS.messageMaxLength * 0.8 && (
          <span className={`message-input-char-count ${content.length >= LIMITS.messageMaxLength ? 'message-input-char-count--warning' : ''}`}>
            {content.length}/{LIMITS.messageMaxLength}
          </span>
        )}
      </div>

      <button
        className="message-send-btn"
        onClick={handleSend}
        disabled={!canSend}
        title={t('chat.send')}
      >
        {sending ? (
          <Loader size={20} className="message-send-btn--loading" />
        ) : (
          <Send size={20} />
        )}
      </button>
    </div>
  );
};

export default MessageInput;
