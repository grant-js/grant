import path from 'path';
import { fileURLToPath } from 'url';

import { SupportedLocale } from '@grantjs/constants';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as middleware from 'i18next-http-middleware';

import { config } from '@/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const defaultLocale = config.i18n.defaultLocale;

export const namespaces = ['common', 'errors', 'email'] as const;
export type Namespace = (typeof namespaces)[number];

export async function initializeI18n() {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: defaultLocale,
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
