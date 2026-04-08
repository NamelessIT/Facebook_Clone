import { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import Avatar from '../common/Avatar';
import { getImageUrl } from '../../utils/formatUrl';
import userService from '../../services/userService';
import toast from 'react-hot-toast';
import './EditProfileModal.css';

const MAX_BIO_LENGTH = 200;

const EditProfileModal = ({ user, onClose, onUpdated }) => {
  // Handle fullName parsing if firstName/lastName not available
  const nameParts = (user?.firstName && user?.lastName) 
    ? [user.firstName, user.lastName]
    : (user?.fullName || '').split(' ');
  const firstName = user?.firstName || nameParts[0] || '';
  const lastName = user?.lastName || nameParts.slice(1).join(' ') || '';

  const [firstNameState, setFirstNameState] = useState(firstName);
  const [lastNameState, setLastNameState] = useState(lastName);
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  if (!user) return null;

  const validate = () => {
    const newErrors = {};
    if (!firstNameState.trim()) newErrors.firstName = 'Tên không được để trống';
    if (!lastNameState.trim()) newErrors.lastName = 'Họ không được để trống';
    if (bio.length > MAX_BIO_LENGTH) newErrors.bio = `Tiểu sử tối đa ${MAX_BIO_LENGTH} ký tự`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstNameState.trim());
      formData.append('lastName', lastNameState.trim());
      formData.append('bio', bio.trim());
      formData.append('location', location.trim());
      if (avatarFile) formData.append('avatar', avatarFile);
      if (coverFile) formData.append('cover', coverFile);

      await userService.updateProfile(formData);

      toast.success('Cập nhật trang cá nhân thành công!');
      onUpdated?.({
        firstName: firstNameState.trim(),
        lastName: lastNameState.trim(),
        fullName: `${firstNameState.trim()} ${lastNameState.trim()}`,
        bio: bio.trim(),
        location: location.trim(),
        ...(avatarPreview && { avatarUrl: avatarPreview }),
        ...(coverPreview && { coverUrl: coverPreview }),
      });
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile-overlay" onMouseDown={onClose}>
      <div className="edit-profile-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-profile-header">
          <h3>Chỉnh sửa trang cá nhân</h3>
          <button className="edit-profile-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="edit-profile-body">
          {/* Avatar section */}
          <div className="edit-profile-section">
            <div className="edit-profile-section-header">
              <h4>Ảnh đại diện</h4>
              <button
                className="edit-profile-change-btn"
                onClick={() => avatarInputRef.current?.click()}
              >
                Thay đổi
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
            </div>
            <div className="edit-profile-avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="edit-avatar-img" />
              ) : (
                <Avatar src={user?.avatarUrl} className="edit-avatar-img" />
              )}
            </div>
          </div>

          {/* Cover section */}
          <div className="edit-profile-section">
            <div className="edit-profile-section-header">
              <h4>Ảnh bìa</h4>
              <button
                className="edit-profile-change-btn"
                onClick={() => coverInputRef.current?.click()}
              >
                Thay đổi
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleCoverChange}
              />
            </div>
            <div className="edit-profile-cover-preview">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="edit-cover-img" />
              ) : user?.coverUrl ? (
                <img
                  src={getImageUrl(user.coverUrl, 'covers')}
                  alt="Cover"
                  className="edit-cover-img"
                />
              ) : (
                <div className="edit-cover-placeholder">
                  <Camera size={24} />
                  <span>Thêm ảnh bìa</span>
                </div>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="edit-profile-section">
            <h4>Thông tin cá nhân</h4>
            <div className="edit-profile-field">
              <label>Họ</label>
              <input
                type="text"
                value={lastNameState}
                onChange={(e) => { setLastNameState(e.target.value); setErrors((p) => ({ ...p, lastName: '' })); }}
                placeholder="Nhập họ"
                className={errors.lastName ? 'edit-input--error' : ''}
              />
              {errors.lastName && <span className="edit-field-error">{errors.lastName}</span>}
            </div>
            <div className="edit-profile-field">
              <label>Tên</label>
              <input
                type="text"
                value={firstNameState}
                onChange={(e) => { setFirstNameState(e.target.value); setErrors((p) => ({ ...p, firstName: '' })); }}
                placeholder="Nhập tên"
                className={errors.firstName ? 'edit-input--error' : ''}
              />
              {errors.firstName && <span className="edit-field-error">{errors.firstName}</span>}
            </div>
            <div className="edit-profile-field">
              <label>Tiểu sử</label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); setErrors((p) => ({ ...p, bio: '' })); }}
                placeholder="Mô tả về bạn"
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                className={errors.bio ? 'edit-input--error' : ''}
              />
              <span className="edit-field-counter">{bio.length}/{MAX_BIO_LENGTH}</span>
              {errors.bio && <span className="edit-field-error">{errors.bio}</span>}
            </div>
            <div className="edit-profile-field">
              <label>Nơi sống</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Nhập nơi sống"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="edit-profile-footer">
          <button className="edit-profile-cancel" onClick={onClose}>
            Hủy
          </button>
          <button
            className="edit-profile-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
