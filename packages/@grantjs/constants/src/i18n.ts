export const SUPPORTED_LOCALES = ['en', 'de'] as const;

export const DEFAULT_LOCALE = 'en' as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
