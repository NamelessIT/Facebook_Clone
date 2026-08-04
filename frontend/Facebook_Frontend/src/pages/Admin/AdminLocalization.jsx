import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Languages, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import toast from '../../shared/appToast';
import adminService from '../../services/adminService';
import { LOCALIZATION } from '../../shared/generated/constants';
import { LOCALIZATION_CATALOG } from '../../shared/generated/localizationCatalog';
import { useConfirm } from '../../contexts/useConfirm';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const emptyEntry = {
  key: '',
  sourceLocale: LOCALIZATION.defaultLocale,
  targetLocale: LOCALIZATION.fallbackLocale,
  sourceText: '',
  value: '',
  context: '',
  isMachineTranslated: false,
  lastError: '',
};

const emptyLanguage = {
  code: '',
  displayName: '',
  nativeName: '',
  isEnabled: true,
  isDefault: false,
};

const TRANSLATION_CATALOG = LOCALIZATION_CATALOG.entries;

const hasTranslationValue = (entry) => Boolean(entry?.value?.trim());

const readApiError = (error, fallback) => {
  const data = error.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.join(' ');
  return data?.message || fallback;
};

const AdminLocalization = () => {
  const confirm = useConfirm();
  const [languages, setLanguages] = useState([]);
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [languageForm, setLanguageForm] = useState(emptyLanguage);
  const [translationError, setTranslationError] = useState('');
  const [translating, setTranslating] = useState(false);
  const [bulkTranslating, setBulkTranslating] = useState(false);

  const enabledLanguages = useMemo(
    () => languages.filter((language) => language.isEnabled),
    [languages],
  );

  const entriesForTarget = useMemo(() => {
    return entries.filter((entry) => entry.targetLocale === entryForm.targetLocale);
  }, [entries, entryForm.targetLocale]);

  const entryByKeyForTarget = useMemo(() => {
    return new Map(entriesForTarget.map((entry) => [entry.key, entry]));
  }, [entriesForTarget]);

  const keyOptions = useMemo(() => {
    const catalogKeys = new Set(TRANSLATION_CATALOG.map((item) => item.key));
    const extraEntries = entriesForTarget
      .filter((entry) => !catalogKeys.has(entry.key))
      .map((entry) => ({
        key: entry.key,
        sourceText: entry.sourceText,
        context: entry.context || 'Existing custom key',
      }));

    return [...TRANSLATION_CATALOG, ...extraEntries].map((item) => {
      const entry = entryByKeyForTarget.get(item.key);
      return {
        ...item,
        translated: hasTranslationValue(entry),
        hasEntry: Boolean(entry),
      };
    });
  }, [entriesForTarget, entryByKeyForTarget]);

  const selectedKeyOption = keyOptions.find((item) => item.key === entryForm.key);
  const visibleKeyOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return keyOptions;
    return keyOptions.filter((item) =>
      item.key.toLowerCase().includes(q) ||
      item.sourceText.toLowerCase().includes(q) ||
      item.context.toLowerCase().includes(q));
  }, [keyOptions, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getLocalization({
        page,
        pageSize: 1000,
        locale: entryForm.targetLocale || undefined,
        search: search || undefined,
      });
      setLanguages(response.data.data.languages);
      setEntries(response.data.data.entries);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.apiError(error, 'Khong the tai localization', { context: 'admin.localization.load' });
    } finally {
      setLoading(false);
    }
  }, [page, search, entryForm.targetLocale]);

  useEffect(() => {
    load();
  }, [load]);

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEntryForm(emptyEntry);
    setTranslationError('');
  };

  const selectCatalogKey = (key, targetLocale = entryForm.targetLocale) => {
    const existing = entries.find((entry) => entry.key === key && entry.targetLocale === targetLocale);
    if (existing) {
      editEntry(existing);
      return;
    }

    const catalogItem = keyOptions.find((item) => item.key === key)
      || TRANSLATION_CATALOG.find((item) => item.key === key);

    setEditingEntryId(null);
    setTranslationError('');
    setEntryForm((prev) => ({
      ...prev,
      key,
      targetLocale,
      sourceLocale: LOCALIZATION.defaultLocale,
      sourceText: catalogItem?.sourceText || '',
      value: '',
      context: catalogItem?.context || '',
      isMachineTranslated: false,
      lastError: '',
    }));
  };

  const changeTargetLocale = (targetLocale) => {
    setEntryForm((prev) => ({ ...prev, targetLocale }));
    if (entryForm.key) {
      selectCatalogKey(entryForm.key, targetLocale);
    }
  };

  const editEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEntryForm({
      key: entry.key,
      sourceLocale: entry.sourceLocale,
      targetLocale: entry.targetLocale,
      sourceText: entry.sourceText,
      value: entry.value,
      context: entry.context || '',
      isMachineTranslated: entry.isMachineTranslated,
      lastError: entry.lastError || '',
    });
    setTranslationError(entry.lastError || '');
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...entryForm,
        key: entryForm.key.trim(),
        sourceLocale: entryForm.sourceLocale.trim().toLowerCase(),
        targetLocale: entryForm.targetLocale.trim().toLowerCase(),
        sourceText: entryForm.sourceText.trim(),
        value: entryForm.value.trim(),
        context: entryForm.context.trim() || null,
        lastError: translationError || entryForm.lastError || null,
      };

      if (editingEntryId) {
        await adminService.updateLocalizationEntry(editingEntryId, payload);
        toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.da-cap-nhat-ban-dich.e93e608b'));
      } else {
        await adminService.createLocalizationEntry(payload);
        toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.da-luu-ban-dich-moi.2316af4f'));
      }

      resetEntryForm();
      load();
    } catch (error) {
      toast.apiError(error, 'Khong the luu ban dich', { context: 'admin.localization.save' });
    }
  };

  const deleteEntry = async (entry) => {
    const accepted = await confirm({
      title: translateCatalogKey('ui.pages.admin.adminlocalization.xoa-ban-dich.d5f542f5'),
      message: translateCatalogKey('admin.localization.deleteDescription', { key: entry.key, locale: entry.targetLocale }),
      detail: translateCatalogKey('ui.pages.admin.adminlocalization.giao-dien-se-quay-ve-noi-dung-mac-in.2dd04c0d'),
      confirmText: translateCatalogKey('ui.pages.admin.adminlocalization.xoa-ban-dich.7588685c'),
    });
    if (!accepted) return;
    try {
      await adminService.deleteLocalizationEntry(entry.id);
      toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.da-xoa-ban-dich.2f085b93'));
      load();
    } catch (error) {
      toast.apiError(error, 'Khong the xoa ban dich', { context: 'admin.localization.delete' });
    }
  };

  const translateEntry = async () => {
    setTranslating(true);
    setTranslationError('');
    try {
      const response = await adminService.translateLocalization({
        sourceLocale: entryForm.sourceLocale,
        targetLocale: entryForm.targetLocale,
        text: entryForm.sourceText,
      });
      setEntryForm((prev) => ({
        ...prev,
        value: response.data.data.translatedText,
        isMachineTranslated: true,
        lastError: '',
      }));
      toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.da-dich-bang-thu-vien-noi-bo.70079355'));
    } catch (error) {
      const message = readApiError(error, 'Thu vien dich noi bo chua dich duoc noi dung nay');
      setTranslationError(message);
      setEntryForm((prev) => ({ ...prev, lastError: message, isMachineTranslated: false }));
      toast.apiError(error, message, { context: 'admin.localization.translate' });
    } finally {
      setTranslating(false);
    }
  };

  const translateAll = async () => {
    const missingItems = keyOptions.filter((item) => {
      const entry = entryByKeyForTarget.get(item.key);
      return !hasTranslationValue(entry);
    });
    if (missingItems.length === 0) {
      toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.tat-ca-noi-dung-cua-ngon-ngu-nay-a-u.d56912d8'));
      return;
    }

    setBulkTranslating(true);
    setTranslationError('');
    const translatedEntries = [];
    const failures = [];

    for (const item of missingItems) {
      let value = entryForm.targetLocale === LOCALIZATION_CATALOG.sourceLocale
        ? item.sourceText
        : item.translations?.[entryForm.targetLocale];

      if (!value) {
        try {
          const response = await adminService.translateLocalization({
            sourceLocale: LOCALIZATION_CATALOG.sourceLocale,
            targetLocale: entryForm.targetLocale,
            text: item.sourceText,
          });
          value = response.data.data.translatedText;
        } catch (error) {
          failures.push(`${item.key}: ${readApiError(error, translateCatalogKey('admin.localization.noInternalRule'))}`);
          continue;
        }
      }

      translatedEntries.push({
        key: item.key,
        sourceLocale: LOCALIZATION_CATALOG.sourceLocale,
        targetLocale: entryForm.targetLocale,
        sourceText: item.sourceText,
        value,
        context: item.context || null,
        isMachineTranslated: true,
        lastError: null,
      });
    }

    try {
      let savedCount = 0;
      if (translatedEntries.length > 0) {
        const response = await adminService.upsertLocalizationEntries(translatedEntries);
        savedCount = response.data?.data?.saved ?? translatedEntries.length;
      }
      if (failures.length > 0) {
        const message = translateCatalogKey('admin.localization.bulkPartialFailure', {
          translated: savedCount,
          total: missingItems.length,
          failed: failures.length,
          reason: failures[0],
        });
        setTranslationError(message);
        toast.error(message);
      } else if (savedCount === 0) {
        toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.a-dich-va-luu-value0-noi-dung.8280a205', { value0: 0 }));
      } else {
        toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.a-dich-va-luu-value0-noi-dung.8280a205', { value0: savedCount }));
      }
      await load();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('admin.localization.bulkSaveFailed'), { context: 'admin.localization.bulkSave' });
    } finally {
      setBulkTranslating(false);
    }
  };

  const saveLanguage = async (event) => {
    event.preventDefault();
    try {
      await adminService.createLocaleLanguage({
        ...languageForm,
        code: languageForm.code.trim().toLowerCase(),
        displayName: languageForm.displayName.trim(),
        nativeName: languageForm.nativeName.trim() || languageForm.displayName.trim(),
      });
      setLanguageForm(emptyLanguage);
      toast.success(translateCatalogKey('ui.pages.admin.adminlocalization.da-them-ngon-ngu.2c4d249d'));
      load();
    } catch (error) {
      toast.apiError(error, 'Khong the them ngon ngu', { context: 'admin.localization.locale.create' });
    }
  };

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <h1 className="admin-page-title">{translateCatalogKey('admin.localization.title')}</h1>
          <p className="admin-page-subtitle">{keyOptions.length} {translateCatalogKey('ui.pages.admin.adminlocalization.noi-dung-giao-dien.b974bd28')} {keyOptions.filter((item) => item.translated).length} {translateCatalogKey('ui.pages.admin.adminlocalization.a-dich.a6bdb7c6')}</p>
        </div>
        <button className="admin-btn admin-btn--primary admin-btn--bulk" type="button" onClick={translateAll} disabled={bulkTranslating || loading}>
          <Languages size={16} /> {bulkTranslating ? translateCatalogKey('ui.pages.admin.adminlocalization.ang-dich-toan-bo.9f1b72e8') : translateCatalogKey('ui.pages.admin.adminlocalization.dich-toan-bo.bab174f6')}
        </button>
      </div>

      <div className="admin-locale-grid">
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">{translateCatalogKey('ui.pages.admin.adminlocalization.them-sua-ban-dich.dccbb4dc')}</span>
          </div>
          <form className="admin-locale-form" onSubmit={saveEntry}>
            <div className="admin-locale-key-picker">
              <select
                value={entryForm.key}
                onChange={(event) => selectCatalogKey(event.target.value)}
              >
                <option value="">{translateCatalogKey('ui.pages.admin.adminlocalization.chon-noi-dung-can-dich.6beb4d30')}</option>
                {keyOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.translated ? translateCatalogKey('ui.pages.admin.adminlocalization.da-dich.07b94543') : translateCatalogKey('ui.pages.admin.adminlocalization.chua-dich.c45f4f56')} {item.key} - {item.sourceText}
                  </option>
                ))}
              </select>
              {selectedKeyOption && (
                <span className={`badge ${selectedKeyOption.translated ? 'badge--active' : 'badge--banned'}`}>
                  {selectedKeyOption.translated ? translateCatalogKey('ui.pages.admin.adminlocalization.da-dich.a452d5c1') : translateCatalogKey('ui.pages.admin.adminlocalization.chua-dich.9924ea64')}
                </span>
              )}
            </div>
            <div className="admin-locale-row">
              <select
                value={entryForm.sourceLocale}
                onChange={(event) => setEntryForm((prev) => ({ ...prev, sourceLocale: event.target.value }))}
              >
                {enabledLanguages.map((language) => (
                  <option key={language.id} value={language.code}>{language.code}</option>
                ))}
              </select>
              <select
                value={entryForm.targetLocale}
                onChange={(event) => changeTargetLocale(event.target.value)}
              >
                {enabledLanguages.map((language) => (
                  <option key={language.id} value={language.code}>{language.code}</option>
                ))}
              </select>
            </div>
            {selectedKeyOption?.context && (
              <div className="admin-locale-context">
                {selectedKeyOption.context}
              </div>
            )}
            <textarea
              placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.noi-dung-goc.b92afb18')}
              rows={5}
              value={entryForm.sourceText}
              readOnly
            />
            <div className="admin-actions">
              <button
                className="admin-btn admin-btn--admin"
                type="button"
                disabled={!entryForm.sourceText.trim() || translating}
                onClick={translateEntry}
              >
                <Sparkles size={12} /> {translating ? translateCatalogKey('ui.pages.admin.adminlocalization.dang-dich.5acd79a2') : translateCatalogKey('ui.pages.admin.adminlocalization.dich-noi-bo.4e5cd749')}
              </button>
              {translationError && (
                <button className="admin-btn admin-btn--reset" type="button" onClick={() => setTranslationError('')}>
                  <X size={12} /> {translateCatalogKey('ui.pages.admin.adminlocalization.an-loi.4ee324ab')}
                </button>
              )}
            </div>
            {translationError && <div className="admin-locale-error">{translationError}</div>}
            <textarea
              placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.ban-dich.659d704e')}
              rows={5}
              value={entryForm.value}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, value: event.target.value, isMachineTranslated: false }))}
            />
            <input
              placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.context-ghi-chu.4228791c')}
              value={entryForm.context}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, context: event.target.value }))}
            />
            <div className="admin-role-modal-footer admin-locale-footer">
              <button className="admin-btn admin-btn--reset" type="button" onClick={resetEntryForm}>
                <X size={12} /> {translateCatalogKey('ui.pages.admin.adminlocalization.reset.c1464a9f')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit" disabled={!entryForm.key}>
                <Save size={12} /> {editingEntryId ? translateCatalogKey('ui.pages.admin.adminlocalization.cap-nhat.989fe1af') : translateCatalogKey('ui.pages.admin.adminlocalization.luu-ban-dich.7da386a2')}
              </button>
            </div>
          </form>
        </div>

        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">{translateCatalogKey('ui.pages.admin.adminlocalization.ngon-ngu.46cc93fe')}</span>
          </div>
          <div className="admin-language-list">
            {languages.map((language) => (
              <div className="admin-language-item" key={language.id}>
                <div>
                  <strong>{language.code}</strong>
                  <span>{language.displayName} / {language.nativeName}</span>
                </div>
                <div className="admin-actions">
                  {language.isDefault && <span className="badge badge--active">{translateCatalogKey('ui.pages.admin.adminlocalization.default.18882724')}</span>}
                  <span className={`badge ${language.isEnabled ? 'badge--manual' : 'badge--banned'}`}>
                    {language.isEnabled ? translateCatalogKey('ui.pages.admin.adminlocalization.enabled.c86e27c0') : translateCatalogKey('ui.pages.admin.adminlocalization.disabled.03287529')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <form className="admin-language-form" onSubmit={saveLanguage}>
            <input
              placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.code-ja.3d05b2d0')}
              value={languageForm.code}
              onChange={(event) => setLanguageForm((prev) => ({ ...prev, code: event.target.value }))}
            />
            <input
              placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.display-name.f265139c')}
              value={languageForm.displayName}
              onChange={(event) => setLanguageForm((prev) => ({ ...prev, displayName: event.target.value }))}
            />
            <input
              placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.native-name.e1057a30')}
              value={languageForm.nativeName}
              onChange={(event) => setLanguageForm((prev) => ({ ...prev, nativeName: event.target.value }))}
            />
            <label className="admin-permission-check">
              <input
                type="checkbox"
                checked={languageForm.isEnabled}
                onChange={(event) => setLanguageForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>{translateCatalogKey('ui.pages.admin.adminlocalization.enabled.c86e27c0')}</span>
            </label>
            <button className="admin-btn admin-btn--primary" type="submit">
              <Plus size={12} /> {translateCatalogKey('ui.pages.admin.adminlocalization.them-ngon-ngu.7d41b1bb')}
            </button>
          </form>
        </div>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">{translateCatalogKey('ui.pages.admin.adminlocalization.danh-sach-ban-dich.90136d93')}</span>
          <input
            className="admin-search"
            placeholder={translateCatalogKey('ui.pages.admin.adminlocalization.tim-key-noi-dung.b151c937')}
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
          <select className="admin-filter-select" value={entryForm.targetLocale} onChange={(event) => { changeTargetLocale(event.target.value); setPage(1); }}>
            {languages.map((language) => (
              <option key={language.id} value={language.code}>{language.code}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">{translateCatalogKey('ui.pages.admin.admincontent.dang-tai.8efbffa5')}</div>
        ) : visibleKeyOptions.length === 0 ? (
          <div className="admin-empty">{translateCatalogKey('ui.pages.admin.adminlocalization.chua-co-key-nao-trong-catalog.1a6584a2')}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{translateCatalogKey('ui.pages.admin.adminlocalization.key.4e182bab')}</th>
                <th>{translateCatalogKey('ui.pages.admin.adminlocalization.locale.c947b58c')}</th>
                <th>{translateCatalogKey('ui.pages.admin.adminlocalization.noi-dung-goc.b92afb18')}</th>
                <th>{translateCatalogKey('ui.pages.admin.adminlocalization.ban-dich.659d704e')}</th>
                <th>{translateCatalogKey('ui.pages.admin.admincontent.trang-thai.949ccef0')}</th>
                <th>{translateCatalogKey('ui.pages.admin.admincontent.hanh-dong.bf3443dc')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleKeyOptions.map((item) => {
                const entry = entryByKeyForTarget.get(item.key);
                return (
                <tr key={item.key}>
                  <td><code>{item.key}</code></td>
                  <td>{LOCALIZATION.defaultLocale} -&gt; {entryForm.targetLocale}</td>
                  <td className="admin-content-snippet">{entry?.sourceText || item.sourceText}</td>
                  <td className="admin-content-snippet">{entry?.value || '-'}</td>
                  <td>
                    {entry
                      ? entry.isMachineTranslated
                        ? <span className="badge badge--auto">{translateCatalogKey('ui.pages.admin.adminlocalization.auto.05922e37')}</span>
                        : <span className="badge badge--manual">{translateCatalogKey('ui.pages.admin.adminlocalization.manual.ba20e122')}</span>
                      : <span className="badge badge--banned">{translateCatalogKey('ui.pages.admin.adminlocalization.chua-dich.9924ea64')}</span>}
                    {entry?.lastError && <div className="admin-locale-inline-error">{entry.lastError}</div>}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--admin" type="button" onClick={() => selectCatalogKey(item.key)}>
                        <Edit3 size={12} /> {entry ? translateCatalogKey('ui.pages.admin.adminlocalization.sua.8b503ea2') : translateCatalogKey('ui.pages.admin.adminlocalization.dich.2f84f603')}
                      </button>
                      {entry && (
                        <button className="admin-btn admin-btn--delete" type="button" onClick={() => deleteEntry(entry)}>
                          <Trash2 size={12} /> {translateCatalogKey('ui.pages.admin.admincontent.xoa.6deddac5')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{translateCatalogKey('ui.pages.admin.adminlocalization.prev.af7045fd')}</button>
            <span className="admin-pagination-info">{translateCatalogKey('ui.components.friendship.friendlist.trang.6d3a285d')} {page} / {pagination.totalPages}</span>
            <button className="admin-pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>{translateCatalogKey('ui.pages.admin.adminlocalization.next.8f615961')}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLocalization;
