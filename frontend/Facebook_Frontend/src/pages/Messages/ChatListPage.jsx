import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import friendshipService from '../../services/friendshipService';
import chatService from '../../services/chatService';
import Avatar from '../../components/common/Avatar';
import ChatWindow from '../../components/Chat/ChatWindow';
import './ChatListPage.css';

const ChatListPage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [conversationMap, setConversationMap] = useState({});

  // Load friends list
  useEffect(() => {
    const loadFriends = async () => {
      setLoading(true);
      try {
        const res = await friendshipService.getFriends(1, 100);
        const data = res.data?.data || [];
        setFriends(data);
      } catch {
        toast.error('Không thể tải danh sách bạn bè.');
      } finally {
        setLoading(false);
      }
    };
    loadFriends();
  }, []);

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
    return friends.filter((f) => f.fullName?.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    navigate(`/messages/${friend.id}`, { replace: true });
  };

  const handleConversationCreated = (convId) => {
    if (selectedFriend) {
      setConversationMap((prev) => ({ ...prev, [selectedFriend.id]: convId }));
    }
  };

  const activeConversationId = selectedFriend
    ? conversationMap[selectedFriend.id] || null
    : null;

  return (
    <div className="chat-page">
      {/* Left Panel — Friend/Conversation List */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Chat</h2>
          <div className="chat-search-form">
            <Search size={16} className="chat-search-icon" />
            <input
              type="text"
              className="chat-search-input"
              placeholder="Tìm kiếm trên Messenger"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="chat-contact-list">
          {loading ? (
            <div className="chat-sidebar-loading">Đang tải...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="chat-sidebar-empty">
              <Users size={40} />
              <p>{searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có bạn bè nào'}</p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <button
                key={friend.id}
                className={`chat-contact-item ${selectedFriend?.id === friend.id ? 'chat-contact-item--active' : ''}`}
                onClick={() => handleSelectFriend(friend)}
              >
                <div className="chat-contact-avatar">
                  <Avatar src={friend.avatarUrl} className="w-12 h-12" />
                </div>
                <div className="chat-contact-info">
                  <p className="chat-contact-name">{friend.fullName}</p>
                  <p className="chat-contact-preview">Nhấn để bắt đầu trò chuyện</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Chat Window */}
      <div className="chat-main">
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
