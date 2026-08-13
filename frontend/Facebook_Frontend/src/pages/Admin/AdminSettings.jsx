import { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, Building2, CreditCard, Languages, Loader2, Mail, Monitor, Moon, Plus, QrCode, Save, Settings2, Store, Sun, Trash2, UserRound } from 'lucide-react';
import adminService from '../../services/adminService';
import userService from '../../services/userService';
import toast from '../../shared/appToast';
import { useLocalization } from '../../contexts/useLocalization';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatMoney = (value, locale) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const AdminSettings = () => {
  const { user } = useAuth();
  const { locale, languages, setLocale, t } = useLocalization();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(null);
  const [displayFee, setDisplayFee] = useState('');
  const [categories, setCategories] = useState([]);
  const [payment, setPayment] = useState({ bankBin: '', bankName: '', accountNumber: '', accountName: '', supportEmail: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [adminLocale, setAdminLocale] = useState(locale);
  const [adminTheme, setAdminTheme] = useState(theme);

  useEffect(() => { setAdminLocale(locale); }, [locale]);
  useEffect(() => { setAdminTheme(theme); }, [theme]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getMarketplaceSettings();
      setSettings(response.data.data);
      setDisplayFee(String(response.data.data.displayFee));
      setCategories((response.data.data.categories || []).map((item) => ({ name: item.name, displayFee: String(item.displayFee) })));
      setPayment(response.data.data.payment || { bankBin: '', bankName: '', accountNumber: '', accountName: '', supportEmail: '' });
    } catch (error) {
      toast.apiError(error, t('admin.settings.loadFailed'), { context: "admin.settings.marketplace.load" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const changeLocale = (nextLocale) => {
    setAdminLocale(nextLocale);
    setLocale(nextLocale);
  };

  const changeTheme = (nextTheme) => {
    setAdminTheme(nextTheme);
    toggleTheme(nextTheme);
  };

  const saveAppearance = async () => {
    setAppearanceSaving(true);
    try {
      await userService.updatePreferences({
        emailNotifications: user?.emailNotifications ?? true,
        showOnlineStatus: user?.showOnlineStatus ?? true,
        language: adminLocale,
        theme: adminTheme === 'auto' ? 'system' : adminTheme,
      });
      toast.success(t('admin.settings.saved'));
    } catch (error) {
      toast.apiError(error, t('admin.settings.saveFailed'), { context: 'admin.settings.appearance.save' });
    } finally {
      setAppearanceSaving(false);
    }
  };

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
    if (!/^\d{6}$/.test(payment.bankBin) || !/^\d{6,24}$/.test(payment.accountNumber) ||
        !payment.bankName.trim() || !payment.accountName.trim() || !/^\S+@\S+\.\S+$/.test(payment.supportEmail)) {
      toast.error(t('admin.settings.paymentInvalid'));
      return;
    }

    setSaving(true);
    try {
      const normalizedCategories = categories.map((item) => ({ name: item.name.trim(), displayFee: Number(item.displayFee) }));
      if (!normalizedCategories.length || normalizedCategories.some((item) => !item.name || !Number.isFinite(item.displayFee) || item.displayFee < settings.minDisplayFee || item.displayFee > settings.maxDisplayFee) || new Set(normalizedCategories.map((item) => item.name.toLocaleLowerCase(locale))).size !== normalizedCategories.length) {
        toast.error('Danh mục phải có tên duy nhất và mức phí hợp lệ.');
        return;
      }
      const response = await adminService.updateMarketplaceSettings({ displayFee: value, categories: normalizedCategories, ...payment });
      setDisplayFee(String(response.data.data.displayFee));
      toast.success(t('admin.settings.saved'));
      await load();
    } catch (error) {
      toast.apiError(error, t('admin.settings.saveFailed'), { context: "admin.settings.marketplace.save" });
    } finally {
      setSaving(false);
    }
  };

  const updatePayment = (key, value) => setPayment((current) => ({ ...current, [key]: value }));
  const updateCategory = (index, key, value) => setCategories((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const previewReference = 'MKT-DEMO-001';
  const qrPreviewUrl = /^\d{6}$/.test(payment.bankBin) && /^\d{6,24}$/.test(payment.accountNumber)
    ? `https://img.vietqr.io/image/${payment.bankBin}-${payment.accountNumber}-compact2.png?amount=${Number(displayFee) || 0}&addInfo=${encodeURIComponent(previewReference)}&accountName=${encodeURIComponent(payment.accountName)}`
    : '';

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
          <section className="admin-appearance-settings" aria-labelledby="admin-appearance-title">
            <div className="admin-settings-card-heading admin-settings-card-heading--nested">
              <span><Monitor /></span>
              <div><h2 id="admin-appearance-title">{t('admin.settings.appearanceTitle')}</h2><p>{t('admin.settings.appearanceSubtitle')}</p></div>
            </div>
            <div className="admin-appearance-grid">
              <div className="admin-settings-field">
                <Label><Languages /> {t('admin.settings.interfaceLanguage')}</Label>
                <Select value={adminLocale} onValueChange={changeLocale}>
                  <SelectTrigger className="admin-appearance-select"><SelectValue placeholder={t('admin.settings.interfaceLanguage')} /></SelectTrigger>
                  <SelectContent>{languages.filter((item) => item.isEnabled !== false).map((item) => <SelectItem key={item.code} value={item.code}>{item.nativeName} ({item.displayName})</SelectItem>)}</SelectContent>
                </Select>
                <p>{t('admin.settings.interfaceLanguageHint')}</p>
              </div>
              <div className="admin-settings-field">
                <Label><Monitor /> {t('admin.settings.colorTheme')}</Label>
                <div className="admin-theme-options">
                  {[['light', Sun, t('settings.themeLight')], ['dark', Moon, t('settings.themeDark')], ['auto', Monitor, t('settings.themeAuto')]].map(([value, Icon, label]) => (
                    <button type="button" key={value} className={adminTheme === value ? 'is-active' : ''} onClick={() => changeTheme(value)}><Icon /><span>{label}</span></button>
                  ))}
                </div>
              </div>
            </div>
            <div className="admin-appearance-actions">
              <Button type="button" onClick={saveAppearance} disabled={appearanceSaving}>
                {appearanceSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {appearanceSaving ? t('common.loading') : t('common.saveChanges')}
              </Button>
            </div>
          </section>

          <div className="admin-settings-divider" />
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

          <section className="admin-category-settings" aria-labelledby="marketplace-category-title">
            <div className="admin-settings-card-heading admin-settings-card-heading--nested">
              <span><Store /></span>
              <div><h2 id="marketplace-category-title">Danh mục và phí trưng bày</h2><p>Mỗi danh mục có mức phí riêng. Xóa danh mục chỉ ngăn mặt hàng mới; dữ liệu mặt hàng cũ vẫn được giữ.</p></div>
              <Button type="button" variant="outline" onClick={() => setCategories((current) => [...current, { name: '', displayFee }])}><Plus /> Thêm danh mục</Button>
            </div>
            <div className="admin-category-list">
              {categories.map((item, index) => <div className="admin-category-row" key={`${index}-${item.name}`}>
                <div className="admin-settings-field"><Label htmlFor={`marketplace-category-${index}`}>Tên danh mục</Label><Input id={`marketplace-category-${index}`} maxLength={80} value={item.name} onChange={(event) => updateCategory(index, 'name', event.target.value)} /></div>
                <div className="admin-settings-field"><Label htmlFor={`marketplace-category-fee-${index}`}>Phí trưng bày (VND)</Label><Input id={`marketplace-category-fee-${index}`} type="number" min={settings.minDisplayFee} max={settings.maxDisplayFee} step="1000" value={item.displayFee} onChange={(event) => updateCategory(index, 'displayFee', event.target.value)} /></div>
                <Button type="button" size="icon" variant="destructive" aria-label="Xóa danh mục" disabled={categories.length === 1} onClick={() => setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></Button>
              </div>)}
            </div>
          </section>

          <section className="admin-payment-settings" aria-labelledby="marketplace-payment-title">
            <div className="admin-settings-card-heading admin-settings-card-heading--nested">
              <span><CreditCard /></span>
              <div>
                <h2 id="marketplace-payment-title">{t('admin.settings.paymentTitle')}</h2>
                <p>{t('admin.settings.paymentSubtitle')}</p>
              </div>
            </div>

            <div className="admin-payment-settings-layout">
              <div className="admin-payment-fields">
                <div className="admin-settings-field">
                  <Label htmlFor="marketplace-bank-bin">{t('admin.settings.bankBin')}</Label>
                  <div className="admin-settings-input-wrap"><Building2 /><Input id="marketplace-bank-bin" inputMode="numeric" maxLength={6} value={payment.bankBin} onChange={(event) => updatePayment('bankBin', event.target.value.replace(/\D/g, ''))} required /></div>
                  <p>{t('admin.settings.bankBinHint')}</p>
                </div>
                <div className="admin-settings-field">
                  <Label htmlFor="marketplace-bank-name">{t('admin.settings.bankName')}</Label>
                  <div className="admin-settings-input-wrap"><Building2 /><Input id="marketplace-bank-name" maxLength={120} value={payment.bankName} onChange={(event) => updatePayment('bankName', event.target.value)} required /></div>
                </div>
                <div className="admin-settings-field">
                  <Label htmlFor="marketplace-account-number">{t('admin.settings.accountNumber')}</Label>
                  <div className="admin-settings-input-wrap"><CreditCard /><Input id="marketplace-account-number" inputMode="numeric" maxLength={24} value={payment.accountNumber} onChange={(event) => updatePayment('accountNumber', event.target.value.replace(/\D/g, ''))} required /></div>
                </div>
                <div className="admin-settings-field">
                  <Label htmlFor="marketplace-account-name">{t('admin.settings.accountName')}</Label>
                  <div className="admin-settings-input-wrap"><UserRound /><Input id="marketplace-account-name" maxLength={160} value={payment.accountName} onChange={(event) => updatePayment('accountName', event.target.value.toUpperCase())} required /></div>
                </div>
                <div className="admin-settings-field admin-settings-field--wide">
                  <Label htmlFor="marketplace-support-email">{t('admin.settings.paymentSupportEmail')}</Label>
                  <div className="admin-settings-input-wrap"><Mail /><Input id="marketplace-support-email" type="email" maxLength={254} value={payment.supportEmail} onChange={(event) => updatePayment('supportEmail', event.target.value)} required /></div>
                  <p>{t('admin.settings.paymentSupportEmailHint')}</p>
                </div>
              </div>

              <aside className="admin-payment-qr-preview">
                <div><QrCode /><span>{t('admin.settings.qrPreview')}</span></div>
                {qrPreviewUrl ? <img src={qrPreviewUrl} alt={t('admin.settings.qrPreviewAlt')} /> : <div className="admin-payment-qr-empty"><QrCode /><span>{t('admin.settings.qrIncomplete')}</span></div>}
                <dl>
                  <div><dt>{t('admin.settings.bankName')}</dt><dd>{payment.bankName || '—'}</dd></div>
                  <div><dt>{t('admin.settings.accountNumber')}</dt><dd>{payment.accountNumber || '—'}</dd></div>
                  <div><dt>{t('admin.settings.accountName')}</dt><dd>{payment.accountName || '—'}</dd></div>
                  <div><dt>{t('admin.settings.transferContent')}</dt><dd>{previewReference}</dd></div>
                </dl>
              </aside>
            </div>
          </section>

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
