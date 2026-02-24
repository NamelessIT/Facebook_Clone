import { useEffect, useState } from 'react';
import userService from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';

const ProfileTest = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const { logout } = useAuth(); // Lấy hàm logout từ context

  useEffect(() => {
    userService.getMe()
      .then(res => setUser(res.data))
      .catch(err => {
          console.error(err);
          setError('Không tải được profile. Kiểm tra Token hoặc Backend!');
      });
  }, []);

  if (error) return (
    <div className="text-center mt-10">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={logout} className="bg-blue-500 text-white px-4 py-2 rounded">Quay lại Login</button>
    </div>
  );

  if (!user) return <div className="text-center mt-10 text-xl font-semibold">Đang tải dữ liệu...</div>;

  return (
    <div className="p-4 border rounded shadow-md max-w-sm mx-auto mt-10 bg-white">
      <div className="flex justify-end">
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Đăng xuất</button>
      </div>
      <img 
        src={user.avatarUrl || "https://via.placeholder.com/150"} 
        alt="Avatar" 
        className="w-24 h-24 rounded-full mx-auto object-cover"
      />
      <h2 className="text-xl font-bold text-center mt-2">{user.fullName}</h2>
      <p className="text-gray-500 text-center">@{user.firstName}</p>
      <div className="mt-4 bg-gray-50 p-3 rounded">
        <p><strong>📍 Vị trí:</strong> {user.location || "Chưa cập nhật"}</p>
        <p><strong>💼 Tiểu sử:</strong> {user.bio || "Chưa cập nhật"}</p>
      </div>
    </div>
  );
};

export default ProfileTest;