import { LOCALIZATION_CATALOG } from './generated/localizationCatalog';

const catalogByKey = new Map(LOCALIZATION_CATALOG.entries.map((entry) => [entry.key, entry]));

let activeLocale = LOCALIZATION_CATALOG.sourceLocale;
let activeTranslations = {};

export const configureLocalizationRuntime = (locale, translations) => {
  activeLocale = locale || LOCALIZATION_CATALOG.sourceLocale;
  activeTranslations = translations || {};
};

export const translateCatalogKey = (key, variables) => {
  const entry = catalogByKey.get(key);
  let value = activeTranslations[key]
    || (activeLocale === LOCALIZATION_CATALOG.sourceLocale
      ? entry?.sourceText
      : entry?.translations?.[activeLocale])
    || entry?.sourceText
    || key;

  if (variables) {
    Object.entries(variables).forEach(([name, replacement]) => {
      value = value.replaceAll(`{{${name}}}`, String(replacement));
    });
  }

  return value;
};
