import { useState, useCallback } from 'react';
import { Send, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import chatService from '../../services/chatService';
import './MessageInput.css';

const MAX_LENGTH = 1000;

const MessageInput = ({ conversationId, receiverId, onMessageSent }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleChange = useCallback((value) => {
    setContent(value);
  }, []);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await chatService.sendMessage({
        conversationId,
        receiverId: conversationId ? undefined : receiverId,
        content: trimmed,
      });
      const message = res.data?.data;
      setContent('');
      onMessageSent?.(message);
    } catch {
      toast.error('Gửi tin nhắn thất bại. Vui lòng thử lại.');
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

  const canSend = content.trim().length > 0 && content.length <= MAX_LENGTH && !sending;

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <textarea
          className="message-input-field"
          placeholder="Aa"
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_LENGTH}
          rows={1}
          disabled={sending}
        />
        {content.length > MAX_LENGTH * 0.8 && (
          <span className={`message-input-char-count ${content.length >= MAX_LENGTH ? 'message-input-char-count--warning' : ''}`}>
            {content.length}/{MAX_LENGTH}
          </span>
        )}
      </div>

      <button
        className="message-send-btn"
        onClick={handleSend}
        disabled={!canSend}
        title="Gửi"
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
