/**
 * i18n Configuration and Initialization
 *
 * This module configures i18next for internationalization support across
 * the API. It provides automatic locale detection from Accept-Language headers
 * and fallback to the default locale.
 */

import path from 'path';
import { fileURLToPath } from 'url';

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as middleware from 'i18next-http-middleware';

import { config } from '@/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const supportedLocales = ['en', 'de'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = 'en';

export const namespaces = ['common', 'errors'] as const;
export type Namespace = (typeof namespaces)[number];

export async function initializeI18n() {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: config.i18n.defaultLocale,
      supportedLngs: config.i18n.supportedLocales,
      preload: config.i18n.supportedLocales,
      ns: namespaces,
      defaultNS: 'errors',
      backend: {
        loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
      },
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
