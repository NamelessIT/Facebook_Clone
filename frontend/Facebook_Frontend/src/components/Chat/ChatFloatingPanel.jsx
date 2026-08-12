import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, Search, Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import friendshipService from '../../services/friendshipService';
import chatService from '../../services/chatService';
import { useLocalization } from '../../contexts/useLocalization';
import Avatar from '../common/Avatar';
import ChatWindow from './ChatWindow';
import './ChatFloatingPanel.css';
import { conversationMapFrom, mergeChatContacts } from '../../utils/chatContacts';

const ChatFloatingPanel = ({ initialFriend = null, onClose }) => {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(initialFriend);
  const [conversationMap, setConversationMap] = useState({});

  // Load friends + start SignalR
  useEffect(() => {
    let cancelled = false;
    const loadFriends = async () => {
      try {
        const [friendResponse, conversationResponse] = await Promise.all([
          friendshipService.getFriends(1, 100),
          chatService.getConversations(),
        ]);
        if (!cancelled) {
          const conversations = conversationResponse.data?.data || [];
          setFriends(mergeChatContacts(friendResponse.data?.data || [], conversations));
          setConversationMap(conversationMapFrom(conversations));
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadFriends();
    chatService.startConnection();
    return () => { cancelled = true; };
  }, []);

  // Update selected friend when prop changes (e.g., clicking contact in sidebar)
  useEffect(() => {
    if (initialFriend) setSelectedFriend(initialFriend);
  }, [initialFriend]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f) =>
      (f.profile?.fullName || f.fullName || '').toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setSearchQuery('');
  };

  const handleConversationCreated = (convId) => {
    if (selectedFriend) {
      const key = selectedFriend.userId || selectedFriend.id;
      setConversationMap((prev) => ({ ...prev, [key]: convId }));
    }
  };

  const activeConversationId = selectedFriend
    ? conversationMap[selectedFriend.userId || selectedFriend.id] || null
    : null;

  return (
    <div className="cfp">
      {/* Header */}
      <div className="cfp-header">
        {selectedFriend ? (
          <button className="cfp-btn" onClick={() => setSelectedFriend(null)} title={t('common.back')}>
            <ChevronLeft size={18} />
          </button>
        ) : null}

        <span className="cfp-title">
          {selectedFriend
            ? (selectedFriend.profile?.fullName || selectedFriend.fullName)
            : t('chat.messages')}
        </span>

        <button
          className="cfp-btn"
          onClick={() => { onClose?.(); navigate('/messages'); }}
          title={t('chat.openFull')}
        >
          <ExternalLink size={16} />
        </button>
        <button className="cfp-btn" onClick={onClose} title={t('common.close')}>
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      {!selectedFriend ? (
        <div className="cfp-list">
          <div className="cfp-search">
            <Search size={14} />
            <input
              placeholder={t('chat.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="cfp-contacts">
            {loading ? (
              <div className="cfp-state">{t('common.loading')}</div>
            ) : filteredFriends.length === 0 ? (
              <div className="cfp-state">
                <Users size={32} />
                <p>{searchQuery ? t('common.noResults') : t('friends.none')}</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <button
                  key={friend.friendshipId || friend.userId || friend.id}
                  className="cfp-contact"
                  onClick={() => handleSelectFriend(friend)}
                >
                  <Avatar
                    src={friend.profile?.avatarUrl || friend.avatarUrl}
                    className="w-10 h-10"
                  />
                  <span>{friend.profile?.fullName || friend.fullName}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="cfp-chat">
          <ChatWindow
            friend={selectedFriend}
            conversationId={activeConversationId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      )}
    </div>
  );
};

export default ChatFloatingPanel;
