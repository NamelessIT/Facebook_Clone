import { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import toast from '../../shared/appToast';
import reelService from '../../services/reelService';
import { useLocalization } from '../../contexts/useLocalization';
import './EditReelModal.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
      toast.apiError(error, t('reels.updateFailed'), { context: "reels.update" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="erm-dialog sm:max-w-lg" showCloseButton={!saving}>
        <DialogHeader className="erm-header">
          <DialogTitle className="erm-header-title">
            <Film size={20} />
            <span>{t('reels.editTitle')}</span>
          </DialogTitle>
          <DialogDescription>{t('reels.descriptionPlaceholder')}</DialogDescription>
        </DialogHeader>

        <form className="erm-form" onSubmit={handleSubmit}>
          <div className="erm-field">
            <Label className="erm-label" htmlFor="erm-title">
              {t('common.title')} <span className="erm-required">*</span>
            </Label>
            <Input
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
            <Label className="erm-label" htmlFor="erm-desc">{t('common.description')}</Label>
            <Textarea
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
            <Label className="erm-label" htmlFor="erm-privacy">{t('privacy.audience')}</Label>
            <Select value={String(form.privacy)} onValueChange={(value) => setForm((prev) => ({ ...prev, privacy: Number(value) }))}>
              <SelectTrigger id="erm-privacy" className="erm-select"><SelectValue /></SelectTrigger>
              <SelectContent>
              {PRIVACY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>

          <div className="erm-footer">
            <Button
              type="button"
              variant="outline"
              className="erm-btn erm-btn--secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="erm-btn erm-btn--primary"
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReelModal;
