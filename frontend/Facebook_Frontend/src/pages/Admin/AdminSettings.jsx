import { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, Loader2, Save, Settings2, Store } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from '../../shared/appToast';
import { useLocalization } from '../../contexts/useLocalization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const formatMoney = (value, locale) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const AdminSettings = () => {
  const { locale, t } = useLocalization();
  const [settings, setSettings] = useState(null);
  const [displayFee, setDisplayFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getMarketplaceSettings();
      setSettings(response.data.data);
      setDisplayFee(String(response.data.data.displayFee));
    } catch (error) {
      toast.apiError(error, t('admin.settings.loadFailed'), { context: "admin.settings.marketplace.load" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    const value = Number(displayFee);
    if (!Number.isFinite(value) || value < settings.minDisplayFee || value > settings.maxDisplayFee) {
      toast.error(t('admin.settings.marketplaceFeeInvalid', undefined, {
        min: formatMoney(settings.minDisplayFee, locale),
        max: formatMoney(settings.maxDisplayFee, locale),
      }));
      return;
    }

    setSaving(true);
    try {
      const response = await adminService.updateMarketplaceSettings({ displayFee: value });
      setDisplayFee(String(response.data.data.displayFee));
      toast.success(t('admin.settings.saved'));
      await load();
    } catch (error) {
      toast.apiError(error, t('admin.settings.saveFailed'), { context: "admin.settings.marketplace.save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-feature-page admin-system-settings">
      <header className="admin-feature-header">
        <div>
          <span className="admin-feature-icon"><Settings2 /></span>
          <div>
            <h1>{t('admin.settings.title')}</h1>
            <p>{t('admin.settings.subtitle')}</p>
          </div>
        </div>
      </header>

      {loading || !settings ? (
        <div className="admin-empty-state"><Loader2 className="animate-spin" /> {t('common.loading')}</div>
      ) : (
        <form className="admin-settings-card" onSubmit={save}>
          <div className="admin-settings-card-heading">
            <span><Store /></span>
            <div>
              <h2>{t('admin.settings.marketplaceTitle')}</h2>
              <p>{t('admin.settings.marketplaceSubtitle')}</p>
            </div>
          </div>

          <div className="admin-settings-field">
            <Label htmlFor="marketplace-display-fee">{t('admin.settings.marketplaceDisplayFee')}</Label>
            <div className="admin-settings-input-wrap">
              <BadgeDollarSign />
              <Input
                id="marketplace-display-fee"
                type="number"
                min={settings.minDisplayFee}
                max={settings.maxDisplayFee}
                step="1000"
                value={displayFee}
                onChange={(event) => setDisplayFee(event.target.value)}
                required
              />
              <span>{settings.currency}</span>
            </div>
            <p>{t('admin.settings.marketplaceDisplayFeeHint', undefined, {
              min: formatMoney(settings.minDisplayFee, locale),
              max: formatMoney(settings.maxDisplayFee, locale),
            })}</p>
          </div>

          <div className="admin-settings-preview">
            <span>{t('admin.settings.marketplaceFeePreview')}</span>
            <strong>{formatMoney(displayFee, locale)}</strong>
            <p>{t('admin.settings.marketplaceFeePolicy')}</p>
          </div>

          <div className="admin-settings-actions">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

export default AdminSettings;
