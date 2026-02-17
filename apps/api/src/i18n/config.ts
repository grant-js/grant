import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@grantjs/i18n';
import { getMergedMessages } from '@grantjs/i18n/loader';
import i18next from 'i18next';
import * as middleware from 'i18next-http-middleware';

import { config } from '@/config';

export const defaultLocale = config.i18n.defaultLocale;

/** Single namespace key for merged messages (errors, common, email) with dot keys */
const NS = 'translation';

export async function initializeI18n() {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const lng of SUPPORTED_LOCALES) {
    resources[lng] = { [NS]: getMergedMessages(lng) as Record<string, unknown> };
  }

  await i18next.use(middleware.LanguageDetector).init({
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    preload: SUPPORTED_LOCALES,
    ns: [NS],
    defaultNS: NS,
    resources,
    keySeparator: '.',
    detection: {
      order: ['header'],
      lookupHeader: 'accept-language',
      caches: false,
    },
    interpolation: {
      escapeValue: false,
    },
    debug: config.app.isDevelopment,
  });

  return i18next;
}

export const i18nMiddleware = middleware.handle(i18next);

export function getFixedT(locale: SupportedLocale = defaultLocale) {
  return i18next.getFixedT(locale);
}
