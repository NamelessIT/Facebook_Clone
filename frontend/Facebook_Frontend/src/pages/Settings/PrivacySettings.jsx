import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";
import toast from '../../shared/appToast';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const PrivacySettings = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    privateProfile: false,
    hideFriendsList: false,
    onlyFriendsCanMessage: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        privateProfile: user.privateProfile || false,
        hideFriendsList: user.hideFriendsList || false,
        onlyFriendsCanMessage: user.onlyFriendsCanMessage || false,
      });
    }
  }, [user]);

  const handleToggle = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await userService.updatePrivacy(form);
      toast.success(translateCatalogKey('ui.pages.settings.privacysettings.cap-nhat-quyen-rieng-tu-thanh-cong.5b9a2ccf'));
    } catch (error) {
      toast.apiError(error, translateCatalogKey('settings.updateFailed'), { context: 'settings.privacy.update' });
    } finally {
      setLoading(false);
    }
  };

  const toggleItems = [
    { key: "privateProfile", label: translateCatalogKey('ui.pages.settings.privacysettings.ho-so-rieng-tu.2ceeb89b'), description: translateCatalogKey('ui.pages.settings.privacysettings.chi-ban-be-moi-xem-uoc-trang-ca-nhan.7ab82774') },
    { key: "hideFriendsList", label: translateCatalogKey('ui.pages.settings.privacysettings.an-danh-sach-ban-be.0f96e82f'), description: translateCatalogKey('ui.pages.settings.privacysettings.nguoi-khac-khong-the-xem-danh-sach-b.37120801') },
    { key: "onlyFriendsCanMessage", label: translateCatalogKey('ui.pages.settings.privacysettings.chi-ban-be-nhan-tin.2e537272'), description: translateCatalogKey('ui.pages.settings.privacysettings.chi-nhung-nguoi-ban-a-ket-ban-moi-gu.1980f03d') },
  ];

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{translateCatalogKey('settings.privacy')}</h3>

      <div className="settings-toggle-list">
        {toggleItems.map((item) => (
          <div key={item.key} className="settings-toggle-item">
            <div className="settings-toggle-text">
              <span className="settings-toggle-label">{item.label}</span>
              <span className="settings-toggle-desc">{item.description}</span>
            </div>
            <button
              className={`settings-toggle-switch ${form[item.key] ? "settings-toggle-switch--on" : ""}`}
              onClick={() => handleToggle(item.key)}
              role="switch"
              aria-checked={form[item.key]}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        ))}
      </div>

      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? translateCatalogKey('settings.saving') : translateCatalogKey('settings.saveChanges')}
      </button>
    </div>
  );
};

export default PrivacySettings;
