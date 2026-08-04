import { useState, useEffect } from 'react';
import { X, Film } from 'lucide-react';
import toast from '../../shared/appToast';
import reelService from '../../services/reelService';
import { useLocalization } from '../../contexts/useLocalization';
import './EditReelModal.css';

const PRIVACY_OPTIONS = [
  { value: 0, labelKey: 'privacy.public' },
  { value: 1, labelKey: 'privacy.friends' },
  { value: 2, labelKey: 'privacy.onlyMe' },
];

const EditReelModal = ({ reel, isOpen, onClose, onSuccess }) => {
  const { t } = useLocalization();
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
      toast.error(t('reels.titleRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await reelService.updateReel(reel.id, form);
      const updated = res.data?.data || res.data;
      toast.success(t('reels.updateSuccess'));
      onSuccess?.({ ...reel, ...updated, ...form });
    } catch (error) {
      toast.apiError(error, t('reels.updateFailed'), { context: 'reels.update' });
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
            <span>{t('reels.editTitle')}</span>
          </div>
          <button className="erm-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form className="erm-form" onSubmit={handleSubmit}>
          <div className="erm-field">
            <label className="erm-label" htmlFor="erm-title">
              {t('common.title')} <span className="erm-required">*</span>
            </label>
            <input
              id="erm-title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={100}
              placeholder={t('reels.titlePlaceholder')}
              className="erm-input"
              autoFocus
            />
            <span className="erm-char-count">{form.title.length}/100</span>
          </div>

          <div className="erm-field">
            <label className="erm-label" htmlFor="erm-desc">{t('common.description')}</label>
            <textarea
              id="erm-desc"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
              placeholder={t('reels.descriptionPlaceholder')}
              className="erm-textarea"
              rows={3}
            />
            <span className="erm-char-count">{form.description.length}/500</span>
          </div>

          <div className="erm-field">
            <label className="erm-label" htmlFor="erm-privacy">{t('privacy.audience')}</label>
            <select
              id="erm-privacy"
              name="privacy"
              value={form.privacy}
              onChange={handleChange}
              className="erm-select"
            >
              {PRIVACY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="erm-btn erm-btn--primary"
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReelModal;
