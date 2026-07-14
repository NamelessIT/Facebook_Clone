import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";
import Avatar from "../../components/common/Avatar";
import toast from "react-hot-toast";

const ProfileSettings = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("firstName", form.firstName);
      formData.append("lastName", form.lastName);
      formData.append("bio", form.bio);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      await userService.updateProfile(formData);
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Chỉnh sửa hồ sơ</h3>

      <div className="settings-avatar-section">
        <Avatar src={avatarPreview || user?.avatarUrl} className="w-24 h-24" />
        <label className="settings-upload-btn">
          Thay đổi ảnh đại diện
          <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
        </label>
      </div>

      <div className="settings-form">
        <div className="settings-field">
          <label className="settings-label">Họ</label>
          <input
            type="text"
            className="settings-input"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">Tên</label>
          <input
            type="text"
            className="settings-input"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">Tiểu sử</label>
          <textarea
            className="settings-textarea"
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="Giới thiệu về bạn..."
            rows={3}
          />
        </div>

        <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
