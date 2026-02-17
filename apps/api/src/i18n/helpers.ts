import { isTranslationKey, SupportedLocale } from '@grantjs/i18n';
import { Request } from 'express';

import { HttpException } from '@/lib/errors';

import { defaultLocale, getFixedT } from './config';

/**
 * If message is a translation key (e.g. validation.passwordMismatch), translate via req.i18n; otherwise return as-is.
 */
export function translateMessage(
  req: Request,
  message: string,
  params?: Record<string, string>
): string {
  return isTranslationKey(message) ? t(req, message, params) : message;
}

export function translateError(req: Request, error: HttpException): string {
  if (error.translationKey && req.i18n) {
    const translated = req.i18n.t(
      error.translationKey,
      (error.translationParams as Record<string, string>) || {}
    );
    return String(translated);
  }
  return error.message;
}

export function t(req: Request, key: string, params?: Record<string, unknown>): string {
  return (req.i18n?.t(key, params) as string) || key;
}

export function getLocale(req: Request): SupportedLocale {
  return (req.i18n?.language as SupportedLocale) || defaultLocale;
}

export function translateStatic(
  key: string,
  locale: SupportedLocale = defaultLocale,
  params?: Record<string, unknown>
): string {
  const fixedT = getFixedT(locale);
  return fixedT(key, params);
}

export { isTranslationKey };
