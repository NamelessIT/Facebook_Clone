import { useState, useEffect } from 'react';
import { X, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import reelService from '../../services/reelService';
import './EditReelModal.css';

const PRIVACY_OPTIONS = [
  { value: 0, label: 'Công khai' },
  { value: 1, label: 'Bạn bè' },
  { value: 2, label: 'Riêng tư' },
];

const EditReelModal = ({ reel, isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ title: '', description: '', privacy: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reel) {
      setForm({
        title: reel.title || '',
        description: reel.description || '',
        privacy: reel.privacy ?? 0,
      });
    }
  }, [reel]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'privacy' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Tiêu đề không được để trống');
      return;
    }
    setSaving(true);
    try {
      const res = await reelService.updateReel(reel.id, form);
      const updated = res.data?.data || res.data;
      toast.success('Đã cập nhật Reel');
      onSuccess?.({ ...reel, ...updated, ...form });
    } catch {
      toast.error('Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="erm-overlay" onClick={onClose}>
      <div className="erm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="erm-header">
          <div className="erm-header-title">
            <Film size={20} />
            <span>Chỉnh sửa Reel</span>
          </div>
          <button className="erm-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <form className="erm-form" onSubmit={handleSubmit}>
          <div className="erm-field">
            <label className="erm-label" htmlFor="erm-title">
              Tiêu đề <span className="erm-required">*</span>
            </label>
            <input
              id="erm-title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={100}
              placeholder="Nhập tiêu đề Reel"
              className="erm-input"
              autoFocus
            />
            <span className="erm-char-count">{form.title.length}/100</span>
          </div>

          <div className="erm-field">
            <label className="erm-label" htmlFor="erm-desc">Mô tả</label>
            <textarea
              id="erm-desc"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
              placeholder="Mô tả ngắn về Reel (tùy chọn)"
              className="erm-textarea"
              rows={3}
            />
            <span className="erm-char-count">{form.description.length}/500</span>
          </div>

          <div className="erm-field">
            <label className="erm-label" htmlFor="erm-privacy">Đối tượng</label>
            <select
              id="erm-privacy"
              name="privacy"
              value={form.privacy}
              onChange={handleChange}
              className="erm-select"
            >
              {PRIVACY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="erm-footer">
            <button
              type="button"
              className="erm-btn erm-btn--secondary"
              onClick={onClose}
              disabled={saving}
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="erm-btn erm-btn--primary"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReelModal;
