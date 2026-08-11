import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";
import Avatar from "../../components/common/Avatar";
import toast from '../../shared/appToast';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const ProfileSettings = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("firstName", form.firstName);
      formData.append("lastName", form.lastName);
      formData.append("bio", form.bio);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      await userService.updateProfile(formData);
      toast.success(translateCatalogKey('ui.pages.settings.profilesettings.cap-nhat-ho-so-thanh-cong.94b910c2'));
    } catch (error) {
      toast.apiError(error, translateCatalogKey('settings.updateFailed'), { context: "settings.profile.update" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{translateCatalogKey('ui.pages.settings.profilesettings.chinh-sua-ho-so.7ab71428')}</h3>

      <div className="settings-avatar-section">
        <Avatar src={avatarPreview || user?.avatarUrl} className="w-24 h-24" />
        <label className="settings-upload-btn">
          {translateCatalogKey('ui.pages.settings.profilesettings.thay-oi-anh-ai-dien.ec96db9f')}
          <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
        </label>
      </div>

      <div className="settings-form">
        <div className="settings-field">
          <label className="settings-label">{translateCatalogKey('ui.components.profile.editprofilemodal.ho.10d03a7e')}</label>
          <input
            type="text"
            className="settings-input"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">{translateCatalogKey('ui.components.profile.editprofilemodal.ten.918728cd')}</label>
          <input
            type="text"
            className="settings-input"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">{translateCatalogKey('ui.components.profile.editprofilemodal.tieu-su.1e5eed2f')}</label>
          <textarea
            className="settings-textarea"
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder={translateCatalogKey('ui.pages.settings.profilesettings.gioi-thieu-ve-ban.40549cdb')}
            rows={3}
          />
        </div>

        <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
          {loading ? translateCatalogKey('settings.saving') : translateCatalogKey('settings.saveChanges')}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
