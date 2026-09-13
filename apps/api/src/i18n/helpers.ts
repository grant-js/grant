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

/**
 * The user-facing sentence for an HTTP error.
 *
 * **i18next answers an unresolvable key with the key itself**, so a missing catalogue
 * entry does not fail — it ships. `errors.validation.badRequest`,
 * `errors.auth.notAuthenticated` and every `errors.conflict.<resource>` were all
 * undefined, which means the API answered real requests with a dot-separated identifier
 * in the `error` field, in both locales, with nothing anywhere reporting a problem.
 *
 * The two static ones are now defined. The resource-derived families cannot be closed
 * the same way: `mapDomainToHttp` builds `errors.notFound.<segment>` and
 * `errors.conflict.<segment>` from a runtime resource name, so the key set is unbounded
 * and any new entity adds a key nobody remembers to translate. Falling back to the
 * error's own message keeps that an untranslated sentence rather than a leaked
 * identifier — the difference between imperfect and broken.
 *
 * **Detected by comparing the result to the key, not by asking `i18n.exists()`.** The
 * `exists` call is the obvious implementation and it is the wrong one here: this runs
 * inside the error handler, so a `req.i18n` without that method — a partial mock, a
 * different i18next major, a middleware that attaches a minimal object — makes the
 * handler throw while handling, and Express answers 500 with no body for *every* error.
 * That trades a cosmetic leak for a total one. The key-echo is i18next's documented
 * behaviour for a miss and needs nothing of the object beyond `t`.
 *
 * `errors.conflict.<segment>` having no defined member at all is recorded as a finding
 * rather than fixed here; it wants a decision about whether the mapper should stop
 * deriving keys it cannot guarantee, and that is not this slice's decision to take.
 */
export function translateError(req: Request, error: HttpException): string {
  if (error.translationKey && req.i18n) {
    const translated = String(
      req.i18n.t(error.translationKey, (error.translationParams as Record<string, string>) || {})
    );
    return translated === error.translationKey ? error.message : translated;
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
