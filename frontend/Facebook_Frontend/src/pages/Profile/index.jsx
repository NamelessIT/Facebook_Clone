import { useEffect, useState } from 'react';
import userService from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { reportApiError } from '../../shared/apiError';

const ProfileTest = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const { logout } = useAuth(); // Lấy hàm logout từ context

  useEffect(() => {
    userService.getMe()
      .then(res => setUser(res.data))
      .catch(err => {
          reportApiError(err, translateCatalogKey('ui.pages.profile.index.khong-tai-uoc-profile-kiem-tra-token.7ce63bf1'), 'profile.test.load');
          setError(translateCatalogKey('ui.pages.profile.index.khong-tai-uoc-profile-kiem-tra-token.7ce63bf1'));
      });
  }, []);

  if (error) return (
    <div className="text-center mt-10">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={logout} className="bg-blue-500 text-white px-4 py-2 rounded">{translateCatalogKey('ui.pages.profile.index.quay-lai-login.147cabc1')}</button>
    </div>
  );

  if (!user) return <div className="text-center mt-10 text-xl font-semibold">{translateCatalogKey('ui.pages.profile.index.ang-tai-du-lieu.51a662dd')}</div>;

  return (
    <div className="p-4 border rounded shadow-md max-w-sm mx-auto mt-10 bg-white">
      <div className="flex justify-end">
          <button onClick={logout} className="text-sm text-red-500 hover:underline">{translateCatalogKey('account.logout')}</button>
      </div>
      <img 
        src={user.avatarUrl || "https://via.placeholder.com/150"} 
        alt={translateCatalogKey('ui.pages.profile.index.avatar.94838f9e')}
        className="w-24 h-24 rounded-full mx-auto object-cover"
      />
      <h2 className="text-xl font-bold text-center mt-2">{user.fullName}</h2>
      <p className="text-gray-500 text-center">@{user.firstName}</p>
      <div className="mt-4 bg-gray-50 p-3 rounded">
        <p><strong>{translateCatalogKey('ui.pages.profile.index.vi-tri.a1350bd6')}</strong> {user.location || translateCatalogKey('ui.pages.profile.index.chua-cap-nhat.fb5c29cc')}</p>
        <p><strong>{translateCatalogKey('ui.pages.profile.index.tieu-su.004cb5c8')}</strong> {user.bio || translateCatalogKey('ui.pages.profile.index.chua-cap-nhat.fb5c29cc')}</p>
      </div>
    </div>
  );
};

export default ProfileTest;
