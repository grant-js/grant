import { SupportedLocale } from '@grantjs/constants';
import { Request } from 'express';

import { ApiError } from '@/lib/errors';

import { defaultLocale, getFixedT } from './config';

export function translateError(req: Request, error: ApiError): string {
  if (error.translationKey && req.i18n) {
    const translated = req.i18n.t(error.translationKey, error.translationParams || {});
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
