/**
 * i18n Module
 *
 * Central export point for internationalization functionality.
 */

export {
  defaultLocale,
  getFixedT,
  i18nMiddleware,
  initializeI18n,
  namespaces,
  supportedLocales,
  type Namespace,
  type SupportedLocale,
} from './config';

export { getLocale, isSupportedLocale, t, translateError, translateStatic } from './helpers';
