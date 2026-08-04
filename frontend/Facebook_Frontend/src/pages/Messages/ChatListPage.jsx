import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, Users, ChevronLeft } from 'lucide-react';
import toast from '../../shared/appToast';
import friendshipService from '../../services/friendshipService';
import chatService from '../../services/chatService';
import Avatar from '../../components/common/Avatar';
import ChatWindow from '../../components/Chat/ChatWindow';
import { useLocalization } from '../../contexts/useLocalization';
import './ChatListPage.css';

const ChatListPage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { t } = useLocalization();

  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [conversationMap, setConversationMap] = useState({});
  const [sidebarWidth, setSidebarWidth] = useState(40);

  // Load friends list
  useEffect(() => {
    const loadFriends = async () => {
      setLoading(true);
      try {
        const res = await friendshipService.getFriends(1, 100);
        const data = res.data?.data || [];
        setFriends(data);
      } catch (error) {
        toast.apiError(error, t('chat.loadFriendsFailed'), { context: 'chat.friends.load' });
      } finally {
        setLoading(false);
      }
    };
    loadFriends();
  }, [t]);

  // Start SignalR connection
  useEffect(() => {
    chatService.startConnection();
    return () => {
      chatService.stopConnection();
    };
  }, []);

  // Select friend from URL param
  useEffect(() => {
    if (friendId && friends.length > 0) {
      const found = friends.find((f) => f.id === friendId);
      if (found) {
        setSelectedFriend(found);
      }
    }
  }, [friendId, friends]);

  // Filter friends by search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f) =>
      (f.profile?.fullName || f.fullName || '').toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    navigate(`/messages/${friend.id}`, { replace: true });
  };

  const handleConversationCreated = (convId) => {
    if (selectedFriend) {
      const key = selectedFriend.userId || selectedFriend.id;
      setConversationMap((prev) => ({ ...prev, [key]: convId }));
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const chatPageEl = document.querySelector('.chat-page');
    const pageWidth = chatPageEl?.offsetWidth || window.innerWidth;

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const diffPercent = (diff / pageWidth) * 100;
      const newWidth = Math.max(20, Math.min(80, startWidth + diffPercent));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const activeConversationId = selectedFriend
    ? conversationMap[selectedFriend.userId || selectedFriend.id] || null
    : null;

  return (
    <div className="chat-page">
      {/* Left Panel — Friend/Conversation List */}
      <div className="chat-sidebar" style={{ width: `${sidebarWidth}%` }}>
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title-row">
            <button className="chat-back-btn" onClick={() => navigate('/')} title={t('common.back')}>
              <ChevronLeft size={22} />
            </button>
            <h2>{t('chat.title')}</h2>
          </div>
          <div className="chat-search-form">
            <Search size={16} className="chat-search-icon" />
            <input
              type="text"
              className="chat-search-input"
              placeholder={t('chat.searchMessenger')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="chat-contact-list">
          {loading ? (
            <div className="chat-sidebar-loading">{t('common.loading')}</div>
          ) : filteredFriends.length === 0 ? (
            <div className="chat-sidebar-empty">
              <Users size={40} />
              <p>{searchQuery ? t('common.noResults') : t('friends.none')}</p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <button
                key={friend.friendshipId}
                className={`chat-contact-item ${
                  selectedFriend?.userId === friend.userId
                    ? 'chat-contact-item--active'
                    : ''
                }`}
                onClick={() => handleSelectFriend(friend)}
              >
                <div className="chat-contact-avatar">
                  <Link to={`/profile/${friend.userId || friend.id}`} onClick={(e) => e.stopPropagation()}>
                    <Avatar src={friend.profile?.avatarUrl || friend.avatarUrl} className="w-12 h-12" />
                  </Link>
                </div>
                <div className="chat-contact-info">
                  <p className="chat-contact-name">{friend.profile?.fullName || friend.fullName}</p>
                  <p className="chat-contact-preview">{t('chat.startConversation')}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="chat-divider" onMouseDown={handleMouseDown}></div>

      {/* Right Panel — Chat Window */}
      <div className="chat-main" style={{ width: `${100 - sidebarWidth}%` }}>
        <ChatWindow
          friend={selectedFriend}
          conversationId={activeConversationId}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
};

export default ChatListPage;
