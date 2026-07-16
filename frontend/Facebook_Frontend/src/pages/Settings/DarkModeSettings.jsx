import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './DarkModeSettings.css';
import { useLocalization } from '../../contexts/useLocalization';

const THEME_OPTIONS = [
  {
    value: 'light',
    labelKey: 'settings.themeLight',
    descKey: 'settings.themeLightDesc',
    Icon: Sun,
  },
  {
    value: 'dark',
    labelKey: 'settings.themeDark',
    descKey: 'settings.themeDarkDesc',
    Icon: Moon,
  },
  {
    value: 'auto',
    labelKey: 'settings.themeAuto',
    descKey: 'settings.themeAutoDesc',
    Icon: Monitor,
  },
];

const DarkModeSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocalization();

  return (
    <div className="dms-section">
      <h3 className="dms-title">{t('settings.themeTitle')}</h3>
      <p className="dms-subtitle">{t('settings.themeSubtitle')}</p>

      <div className="dms-options">
        {THEME_OPTIONS.map(({ value, labelKey, descKey, Icon }) => (
          <label
            key={value}
            className={`dms-option ${theme === value ? 'dms-option--active' : ''}`}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => toggleTheme(value)}
              className="dms-radio"
            />
            <span className="dms-icon-wrap">
              <Icon size={20} />
            </span>
            <span className="dms-text">
              <span className="dms-label">{t(labelKey)}</span>
              <span className="dms-desc">{t(descKey)}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default DarkModeSettings;
