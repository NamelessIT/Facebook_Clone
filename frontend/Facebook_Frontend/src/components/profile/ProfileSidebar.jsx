import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Mail, Users } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Avatar from '../common/Avatar';
import friendshipService from '../../services/friendshipService';
import { getImageUrl } from '../../utils/formatUrl';
import './ProfileSidebar.css';

const ProfileSidebar = ({ profileUser }) => {
  const [friends, setFriends] = useState([]);
  const [friendsTotal, setFriendsTotal] = useState(0);

  useEffect(() => {
    if (!profileUser?.id) return;
    friendshipService.getUserFriends(profileUser.id, 1, 8)
      .then((res) => {
        const data = res.data?.data || [];
        setFriends(data);
        setFriendsTotal(res.data?.pagination?.total || data.length);
      })
      .catch(() => setFriends([]));
  }, [profileUser?.id]);

  const joinDate = profileUser?.createdAt
    ? format(new Date(profileUser.createdAt), 'MMMM yyyy', { locale: vi })
    : null;

  return (
    <aside className="profile-sidebar">
      {/* Gioi thieu */}
      <div className="psb-card">
        <h3 className="psb-card-title">Giới thiệu</h3>
        {profileUser?.bio && (
          <p className="psb-bio">{profileUser.bio}</p>
        )}
        <ul className="psb-info-list">
          {profileUser?.location && (
            <li className="psb-info-item">
              <MapPin size={16} />
              <span>Sống tại <strong>{profileUser.location}</strong></span>
            </li>
          )}
          {profileUser?.email && (
            <li className="psb-info-item">
              <Mail size={16} />
              <span>{profileUser.email}</span>
            </li>
          )}
          {joinDate && (
            <li className="psb-info-item">
              <Calendar size={16} />
              <span>Tham gia vào <strong>{joinDate}</strong></span>
            </li>
          )}
        </ul>
      </div>

      {/* Danh sach ban be */}
      {friends.length > 0 && (
        <div className="psb-card">
          <div className="psb-card-header">
            <h3 className="psb-card-title">
              <Users size={16} /> Bạn bè
            </h3>
            <span className="psb-friends-count">{friendsTotal} người</span>
          </div>
          <div className="psb-friends-grid">
            {friends.map((f) => {
              const friendUser = f.profile;
              if (!friendUser) return null;
              return (
                <Link
                  key={f.userId}
                  to={`/profile/${f.userId}`}
                  className="psb-friend-item"
                  title={friendUser.fullName}
                >
                  <Avatar
                    src={friendUser.avatarUrl}
                    className="psb-friend-avatar"
                    alt={friendUser.fullName}
                  />
                  <span className="psb-friend-name">
                    {friendUser.fullName?.split(' ').pop()}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default ProfileSidebar;
