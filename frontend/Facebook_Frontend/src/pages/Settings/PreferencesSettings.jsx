import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";
import toast from "react-hot-toast";

const LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
  { value: "system", label: "Theo hệ thống" },
];

const PreferencesSettings = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    emailNotifications: true,
    showOnlineStatus: true,
    language: "vi",
    theme: "light",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        emailNotifications: user.emailNotifications ?? true,
        showOnlineStatus: user.showOnlineStatus ?? true,
        language: user.language || "vi",
        theme: user.theme || "light",
      });
    }
  }, [user]);

  const handleToggle = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSelect = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await userService.updatePreferences(form);
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
            onChange={(e) => handleSelect("language", e.target.value)}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-field">
          <label className="settings-label">Giao diện</label>
          <select
            className="settings-select"
            value={form.theme}
            onChange={(e) => handleSelect("theme", e.target.value)}
          >
            {THEME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );
};

export default PreferencesSettings;
