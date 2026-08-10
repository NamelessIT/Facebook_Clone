import { useState } from "react";
import { User, Shield, Sliders, Moon } from "lucide-react";
import ProfileSettings from "./ProfileSettings";
import PrivacySettings from "./PrivacySettings";
import PreferencesSettings from "./PreferencesSettings";
import DarkModeSettings from "./DarkModeSettings";
import "./SettingsPage.css";
import { useLocalization } from "../../contexts/useLocalization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="settings-page">
      <div className="settings-sidebar">
        <h2 className="settings-sidebar-title">{t('settings.title')}</h2>
        <TabsList className="settings-nav" aria-label={t('settings.title')}>
          {TAB_CONFIG.map(({ key, labelKey, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="settings-nav-item"
            >
              <Icon size={20} />
              {t(labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="settings-content">
        <TabsContent value={TABS.PROFILE}><ProfileSettings /></TabsContent>
        <TabsContent value={TABS.PRIVACY}><PrivacySettings /></TabsContent>
        <TabsContent value={TABS.PREFERENCES}><PreferencesSettings /></TabsContent>
        <TabsContent value={TABS.DISPLAY}><DarkModeSettings /></TabsContent>
      </div>
    </Tabs>
  );
};

export default SettingsPage;
