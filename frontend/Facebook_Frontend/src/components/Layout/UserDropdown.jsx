import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Settings, Moon, Sun, HelpCircle, LogOut } from "lucide-react";
import Avatar from "../common/Avatar";
import { useLocalization } from "../../contexts/useLocalization";
import "./UserDropdown.css";

const UserDropdown = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleDarkMode = () => {
    toggleTheme(isDark ? "light" : "dark");
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="user-dropdown-wrapper" ref={dropdownRef}>
      <Avatar
        src={user?.avatarUrl}
        className="user-avatar"
        onClick={() => setIsOpen((prev) => !prev)}
        title={t('account.menu')}
      />

      {isOpen && (
        <div className="user-dropdown-menu">
          <Link
            to={`/profile/${user?.id}`}
            className="user-dropdown-header"
            onClick={() => setIsOpen(false)}
          >
            <Avatar src={user?.avatarUrl} className="user-dropdown-avatar" />
            <div className="user-dropdown-header-info">
              <span className="user-dropdown-name">{user?.fullName}</span>
              <span className="user-dropdown-sub">{t('account.viewProfile')}</span>
            </div>
          </Link>

          <div className="user-dropdown-divider" />

          <Link
            to="/settings"
            className="user-dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <div className="user-dropdown-item-icon"><Settings size={20} /></div>
            <span>{t('account.settingsPrivacy')}</span>
          </Link>

          <button className="user-dropdown-item" onClick={toggleDarkMode}>
            <div className="user-dropdown-item-icon">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            <span>{t('account.darkMode')}</span>
            <div className={`user-dropdown-toggle ${isDark ? "active" : ""}`}>
              <div className="user-dropdown-toggle-knob" />
            </div>
          </button>

          <button className="user-dropdown-item" disabled>
            <div className="user-dropdown-item-icon"><HelpCircle size={20} /></div>
            <span>{t('account.helpSupport')}</span>
          </button>

          <div className="user-dropdown-divider" />

          <button className="user-dropdown-item" onClick={handleLogout}>
            <div className="user-dropdown-item-icon"><LogOut size={20} /></div>
            <span>{t('account.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
