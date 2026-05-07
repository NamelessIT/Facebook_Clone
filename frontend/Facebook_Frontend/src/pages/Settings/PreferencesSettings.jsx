import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import userService from "../../services/userService";
import toast from "react-hot-toast";

const LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const PreferencesSettings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [form, setForm] = useState({
    emailNotifications: true,
    showOnlineStatus: true,
    language: "vi",
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
      toast.success("Cập nhật tùy chọn thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const toggleItems = [
    { key: "emailNotifications", label: "Thông báo qua email", description: "Nhận thông báo quan trọng qua email" },
    { key: "showOnlineStatus", label: "Hiển thị trạng thái online", description: "Cho phép người khác thấy khi bạn đang trực tuyến" },
  ];

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Tùy chọn</h3>

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
          <label className="settings-label">Ngôn ngữ</label>
          <select
            className="settings-select"
            value={form.language}
            onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="settings-toggle-desc" style={{ marginTop: 8 }}>
        Để thay đổi giao diện sáng/tối, vui lòng vào tab <strong>Giao diện</strong>.
      </p>

      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );
};

export default PreferencesSettings;
