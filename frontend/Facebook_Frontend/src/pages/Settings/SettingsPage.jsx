import { useState } from "react";
import { User, Shield, Sliders, Moon } from "lucide-react";
import ProfileSettings from "./ProfileSettings";
import PrivacySettings from "./PrivacySettings";
import PreferencesSettings from "./PreferencesSettings";
import DarkModeSettings from "./DarkModeSettings";
import "./SettingsPage.css";

const TABS = {
  PROFILE: "profile",
  PRIVACY: "privacy",
  PREFERENCES: "preferences",
  DISPLAY: "display",
};

const TAB_CONFIG = [
  { key: TABS.PROFILE, label: "Hồ sơ", icon: User },
  { key: TABS.PRIVACY, label: "Quyền riêng tư", icon: Shield },
  { key: TABS.PREFERENCES, label: "Tùy chọn", icon: Sliders },
  { key: TABS.DISPLAY, label: "Giao diện", icon: Moon },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState(TABS.PROFILE);

  return (
    <div className="settings-page">
      <div className="settings-sidebar">
        <h2 className="settings-sidebar-title">Cài đặt</h2>
        <nav className="settings-nav">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`settings-nav-item ${activeTab === key ? "settings-nav-item--active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={20} />
              {label}
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
