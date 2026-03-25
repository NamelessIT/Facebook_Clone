import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";
import toast from "react-hot-toast";

const PrivacySettings = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    privateProfile: false,
    hideFriendsList: false,
    onlyFriendsCanMessage: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        privateProfile: user.privateProfile || false,
        hideFriendsList: user.hideFriendsList || false,
        onlyFriendsCanMessage: user.onlyFriendsCanMessage || false,
      });
    }
  }, [user]);

  const handleToggle = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await userService.updatePrivacy(form);
      toast.success("Cập nhật quyền riêng tư thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const toggleItems = [
    { key: "privateProfile", label: "Hồ sơ riêng tư", description: "Chỉ bạn bè mới xem được trang cá nhân của bạn" },
    { key: "hideFriendsList", label: "Ẩn danh sách bạn bè", description: "Người khác không thể xem danh sách bạn bè của bạn" },
    { key: "onlyFriendsCanMessage", label: "Chỉ bạn bè nhắn tin", description: "Chỉ những người bạn đã kết bạn mới gửi được tin nhắn" },
  ];

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Quyền riêng tư</h3>

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

      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );
};

export default PrivacySettings;
