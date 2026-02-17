import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@grantjs/i18n';
import { defineRouting } from 'next-intl/routing';

export const locales = SUPPORTED_LOCALES;
export const defaultLocale = DEFAULT_LOCALE;

export const routing = defineRouting({
  locales,
  defaultLocale,
});
