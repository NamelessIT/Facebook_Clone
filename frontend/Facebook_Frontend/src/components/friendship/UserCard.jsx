import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import Avatar from '../common/Avatar';
import AddFriendButton from './AddFriendButton';
import './UserCard.css';
import { useLocalization } from '../../contexts/useLocalization';

const UserCard = ({ user }) => {
  const navigate = useNavigate();
  const { t } = useLocalization();

  return (
    <div className="user-card">
      <Link to={`/profile/${user.id}`}>
        <Avatar src={user.avatarUrl} className="user-card-avatar" />
      </Link>
      <Link to={`/profile/${user.id}`} className="user-card-name-link">
        <h4 className="user-card-name">{user.fullName}</h4>
      </Link>
      <div className="user-card-actions">
        <AddFriendButton targetUserId={user.id} />
        <button
          className="user-card-message-btn"
          onClick={() => navigate(`/messages/${user.id}`)}
        >
          <MessageCircle size={16} />
          {t('friends.message')}
        </button>
      </div>
    </div>
  );
};

export default UserCard;
