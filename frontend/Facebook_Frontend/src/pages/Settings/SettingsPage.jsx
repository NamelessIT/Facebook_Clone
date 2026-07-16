import { useState } from "react";
import { User, Shield, Sliders, Moon } from "lucide-react";
import ProfileSettings from "./ProfileSettings";
import PrivacySettings from "./PrivacySettings";
import PreferencesSettings from "./PreferencesSettings";
import DarkModeSettings from "./DarkModeSettings";
import "./SettingsPage.css";
import { useLocalization } from "../../contexts/useLocalization";

const TABS = {
  PROFILE: "profile",
  PRIVACY: "privacy",
  PREFERENCES: "preferences",
  DISPLAY: "display",
};

const TAB_CONFIG = [
  { key: TABS.PROFILE, labelKey: "settings.profile", icon: User },
  { key: TABS.PRIVACY, labelKey: "settings.privacy", icon: Shield },
  { key: TABS.PREFERENCES, labelKey: "settings.preferences", icon: Sliders },
  { key: TABS.DISPLAY, labelKey: "settings.display", icon: Moon },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState(TABS.PROFILE);
  const { t } = useLocalization();

  return (
    <div className="settings-page">
      <div className="settings-sidebar">
        <h2 className="settings-sidebar-title">{t('settings.title')}</h2>
        <nav className="settings-nav">
          {TAB_CONFIG.map(({ key, labelKey, icon: Icon }) => (
            <button
              key={key}
              className={`settings-nav-item ${activeTab === key ? "settings-nav-item--active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={20} />
              {t(labelKey)}
            </button>
          ))}
        </nav>
      </div>

      <div className="settings-content">
        {activeTab === TABS.PROFILE && <ProfileSettings />}
        {activeTab === TABS.PRIVACY && <PrivacySettings />}
        {activeTab === TABS.PREFERENCES && <PreferencesSettings />}
        {activeTab === TABS.DISPLAY && <DarkModeSettings />}
      </div>
    </div>
  );
};

export default SettingsPage;
