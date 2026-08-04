import { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import Avatar from '../common/Avatar';
import { getImageUrl } from '../../utils/formatUrl';
import userService from '../../services/userService';
import toast from '../../shared/appToast';
import { LIMITS } from '../../shared/generated/constants';
import './EditProfileModal.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const MAX_BIO_LENGTH = LIMITS.profileBioMaxLength;

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
    if (!firstNameState.trim()) newErrors.firstName = translateCatalogKey('profile.validation.firstNameRequired');
    if (!lastNameState.trim()) newErrors.lastName = translateCatalogKey('profile.validation.lastNameRequired');
    if (bio.length > MAX_BIO_LENGTH) {
      newErrors.bio = translateCatalogKey('profile.validation.bioMaxLength', { count: MAX_BIO_LENGTH });
    }
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

      toast.success(translateCatalogKey('ui.components.profile.editprofilemodal.cap-nhat-trang-ca-nhan-thanh-cong.8ea089f1'));
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
      toast.apiError(error, translateCatalogKey('settings.updateFailed'), { context: 'profile.update' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile-overlay" onMouseDown={onClose}>
      <div className="edit-profile-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-profile-header">
          <h3>{translateCatalogKey('ui.components.profile.editprofilemodal.chinh-sua-trang-ca-nhan.f8a69cb6')}</h3>
          <button className="edit-profile-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="edit-profile-body">
          {/* Avatar section */}
          <div className="edit-profile-section">
            <div className="edit-profile-section-header">
              <h4>{translateCatalogKey('ui.components.profile.editprofilemodal.anh-ai-dien.61f86663')}</h4>
              <button
                className="edit-profile-change-btn"
                onClick={() => avatarInputRef.current?.click()}
              >
                {translateCatalogKey('ui.components.profile.editprofilemodal.thay-oi.256b481a')}
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
                <img src={avatarPreview} alt={translateCatalogKey('ui.components.profile.editprofilemodal.preview.d501aad8')} className="edit-avatar-img" />
              ) : (
                <Avatar src={user?.avatarUrl} className="edit-avatar-img" />
              )}
            </div>
          </div>

          {/* Cover section */}
          <div className="edit-profile-section">
            <div className="edit-profile-section-header">
              <h4>{translateCatalogKey('ui.components.profile.editprofilemodal.anh-bia.a7de18b3')}</h4>
              <button
                className="edit-profile-change-btn"
                onClick={() => coverInputRef.current?.click()}
              >
                {translateCatalogKey('ui.components.profile.editprofilemodal.thay-oi.256b481a')}
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
                <img src={coverPreview} alt={translateCatalogKey('ui.components.profile.editprofilemodal.cover-preview.1b1479be')} className="edit-cover-img" />
              ) : user?.coverUrl ? (
                <img
                  src={getImageUrl(user.coverUrl, 'covers')}
                  alt={translateCatalogKey('ui.components.profile.editprofilemodal.cover.7ebe1ce8')}
                  className="edit-cover-img"
                />
              ) : (
                <div className="edit-cover-placeholder">
                  <Camera size={24} />
                  <span>{translateCatalogKey('ui.components.profile.editprofilemodal.them-anh-bia.14be138e')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="edit-profile-section">
            <h4>{translateCatalogKey('ui.components.profile.editprofilemodal.thong-tin-ca-nhan.e548f1a7')}</h4>
            <div className="edit-profile-field">
              <label>{translateCatalogKey('ui.components.profile.editprofilemodal.ho.10d03a7e')}</label>
              <input
                type="text"
                value={lastNameState}
                onChange={(e) => { setLastNameState(e.target.value); setErrors((p) => ({ ...p, lastName: '' })); }}
                placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.nhap-ho.5801f915')}
                className={errors.lastName ? 'edit-input--error' : ''}
              />
              {errors.lastName && <span className="edit-field-error">{errors.lastName}</span>}
            </div>
            <div className="edit-profile-field">
              <label>{translateCatalogKey('ui.components.profile.editprofilemodal.ten.918728cd')}</label>
              <input
                type="text"
                value={firstNameState}
                onChange={(e) => { setFirstNameState(e.target.value); setErrors((p) => ({ ...p, firstName: '' })); }}
                placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.nhap-ten.3ea322e8')}
                className={errors.firstName ? 'edit-input--error' : ''}
              />
              {errors.firstName && <span className="edit-field-error">{errors.firstName}</span>}
            </div>
            <div className="edit-profile-field">
              <label>{translateCatalogKey('ui.components.profile.editprofilemodal.tieu-su.1e5eed2f')}</label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); setErrors((p) => ({ ...p, bio: '' })); }}
                placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.mo-ta-ve-ban.ad70a81f')}
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                className={errors.bio ? 'edit-input--error' : ''}
              />
              <span className="edit-field-counter">{bio.length}/{MAX_BIO_LENGTH}</span>
              {errors.bio && <span className="edit-field-error">{errors.bio}</span>}
            </div>
            <div className="edit-profile-field">
              <label>{translateCatalogKey('ui.components.profile.editprofilemodal.noi-song.288dc34f')}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.nhap-noi-song.e1c62ad1')}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="edit-profile-footer">
          <button className="edit-profile-cancel" onClick={onClose}>
            {translateCatalogKey('common.cancel')}
          </button>
          <button
            className="edit-profile-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? translateCatalogKey('settings.saving') : translateCatalogKey('settings.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
