import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import userService from "../../services/userService";
import toast from '../../shared/appToast';
import { useLocalization } from "../../contexts/useLocalization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PreferencesSettings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { languages, locale, setLocale, t } = useLocalization();

  const [form, setForm] = useState({
    emailNotifications: true,
    showOnlineStatus: true,
    language: locale,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        emailNotifications: user.emailNotifications ?? true,
        showOnlineStatus: user.showOnlineStatus ?? true,
        language: user.language || "vi",
      });
      // Sync theme từ server về ThemeContext nếu chưa có localStorage
      if (user.theme && !localStorage.getItem('app_theme_mode')) {
        const mapped = user.theme === 'system' ? 'auto' : user.theme;
        toggleTheme(mapped);
      }
    }
  }, [user]);

  const handleToggle = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Map ThemeContext value sang server value
      const serverTheme = theme === 'auto' ? 'system' : theme;
      await userService.updatePreferences({ ...form, theme: serverTheme });
      await setLocale(form.language);
      toast.success(t('settings.updated'));
    } catch (error) {
      toast.apiError(error, t('settings.updateFailed'), { context: 'settings.preferences.update' });
    } finally {
      setLoading(false);
    }
  };

  const toggleItems = [
    { key: "emailNotifications", label: t('settings.emailNotifications'), description: t('settings.emailNotificationsDesc') },
    { key: "showOnlineStatus", label: t('settings.onlineStatus'), description: t('settings.onlineStatusDesc') },
  ];

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('settings.preferences')}</h3>

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

      <div className="settings-form" style={{ marginTop: 16 }}>
        <div className="settings-field">
          <label className="settings-label">{t('settings.language')}</label>
          <Select value={form.language} onValueChange={(language) => setForm((prev) => ({ ...prev, language }))}>
            <SelectTrigger className="settings-select"><SelectValue /></SelectTrigger>
            <SelectContent>
            {languages.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                {language.nativeName} ({language.displayName})
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="settings-toggle-desc" style={{ marginTop: 8 }}>
        {t('settings.themeHint')}
      </p>

      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? t('settings.saving') : t('settings.saveChanges')}
      </button>
    </div>
  );
};

export default PreferencesSettings;
