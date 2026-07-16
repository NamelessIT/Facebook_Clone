import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import localizationService from '../services/localizationService';
import { LOCALIZATION, STORAGE_KEYS } from '../shared/generated/constants';
import { LOCALIZATION_CATALOG } from '../shared/generated/localizationCatalog';
import LocalizationContextValue from './localizationContextValue';
import { configureLocalizationRuntime } from '../shared/localizationRuntime';

const catalogByKey = new Map(LOCALIZATION_CATALOG.entries.map((entry) => [entry.key, entry]));

export const LocalizationProvider = ({ children }) => {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState(
    () => localStorage.getItem(STORAGE_KEYS.locale) || user?.language || LOCALIZATION.defaultLocale,
  );
  const [languages, setLanguages] = useState([]);
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  const loadBundle = useCallback(async (requestedLocale) => {
    setLoading(true);
    try {
      const response = await localizationService.getBundle(requestedLocale);
      const bundle = response.data.data;
      setLanguages(bundle.languages || []);
      setTranslations(bundle.translations || {});
      if (bundle.locale && bundle.locale !== requestedLocale) {
        setLocaleState(bundle.locale);
        localStorage.setItem(STORAGE_KEYS.locale, bundle.locale);
      }
    } catch {
      setTranslations({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const preferredLocale = localStorage.getItem(STORAGE_KEYS.locale) || user?.language || locale;
    if (preferredLocale !== locale) {
      setLocaleState(preferredLocale);
      return;
    }
    loadBundle(locale);
  }, [user?.language, locale, loadBundle]);

  const setLocale = useCallback((nextLocale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(STORAGE_KEYS.locale, nextLocale);
  }, []);

  const t = useCallback((key, fallback, variables) => {
    const catalogEntry = catalogByKey.get(key);
    let value = translations[key]
      || (locale === LOCALIZATION_CATALOG.sourceLocale
        ? catalogEntry?.sourceText
        : catalogEntry?.translations?.[locale])
      || fallback
      || catalogEntry?.sourceText
      || key;

    if (variables) {
      Object.entries(variables).forEach(([name, replacement]) => {
        value = value.replaceAll(`{{${name}}}`, String(replacement));
      });
    }
    return value;
  }, [locale, translations]);

  const value = useMemo(() => ({ locale, languages, translations, loading, setLocale, refresh: () => loadBundle(locale), t }),
    [locale, languages, translations, loading, setLocale, loadBundle, t]);

  configureLocalizationRuntime(locale, translations);

  return <LocalizationContextValue.Provider value={value}>{children}</LocalizationContextValue.Provider>;
};
