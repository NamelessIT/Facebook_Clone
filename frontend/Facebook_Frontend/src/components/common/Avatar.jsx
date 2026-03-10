import { useState, useEffect } from 'react';
import { getImageUrl } from '../../utils/formatUrl';
import './Avatar.css'; // Gọi CSS vào

const Avatar = ({ src, className, alt = "Avatar", onClick }) => {
  const fallbackAvatar = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
  
  // Mặc định type là 'avatars' để lấy đúng thư mục
  const [imgSrc, setImgSrc] = useState(getImageUrl(src, 'avatars'));

  useEffect(() => {
    setImgSrc(getImageUrl(src, 'avatars'));
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      /* Nếu không truyền className, nó sẽ dùng avatar-default để không bị khổng lồ */
      className={`avatar-img ${className || 'avatar-default'}`} 
      onClick={onClick}
      onError={() => setImgSrc(fallbackAvatar)}
    />
  );
};

export default Avatar;