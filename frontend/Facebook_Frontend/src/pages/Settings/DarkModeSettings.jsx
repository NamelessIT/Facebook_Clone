import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './DarkModeSettings.css';

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Sáng',
    desc: 'Giao diện sáng tiêu chuẩn',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Tối',
    desc: 'Dễ nhìn trong môi trường tối',
    Icon: Moon,
  },
  {
    value: 'auto',
    label: 'Tự động',
    desc: 'Theo cài đặt hệ thống của bạn',
    Icon: Monitor,
  },
];

const DarkModeSettings = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="dms-section">
      <h3 className="dms-title">Chế độ giao diện</h3>
      <p className="dms-subtitle">Chọn chủ đề hiển thị phù hợp với bạn</p>

      <div className="dms-options">
        {THEME_OPTIONS.map(({ value, label, desc, Icon }) => (
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
              <span className="dms-label">{label}</span>
              <span className="dms-desc">{desc}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default DarkModeSettings;
