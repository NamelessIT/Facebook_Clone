import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Settings, Moon, Sun, HelpCircle, LogOut } from "lucide-react";
import Avatar from "../common/Avatar";
import "./UserDropdown.css";

const DARK_MODE_KEY = "fb_dark_mode";

const UserDropdown = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem(DARK_MODE_KEY) === "true";
  });
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
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem(DARK_MODE_KEY, String(next));
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
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
        title="Menu tài khoản"
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
              <span className="user-dropdown-sub">Xem trang cá nhân</span>
            </div>
          </Link>

          <div className="user-dropdown-divider" />

          <Link
            to="/settings"
            className="user-dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <div className="user-dropdown-item-icon"><Settings size={20} /></div>
            <span>Cài đặt & quyền riêng tư</span>
          </Link>

          <button className="user-dropdown-item" onClick={toggleDarkMode}>
            <div className="user-dropdown-item-icon">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            <span>Chế độ tối</span>
            <div className={`user-dropdown-toggle ${darkMode ? "active" : ""}`}>
              <div className="user-dropdown-toggle-knob" />
            </div>
          </button>

          <button className="user-dropdown-item" disabled>
            <div className="user-dropdown-item-icon"><HelpCircle size={20} /></div>
            <span>Trợ giúp & hỗ trợ</span>
          </button>

          <div className="user-dropdown-divider" />

          <button className="user-dropdown-item" onClick={handleLogout}>
            <div className="user-dropdown-item-icon"><LogOut size={20} /></div>
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
