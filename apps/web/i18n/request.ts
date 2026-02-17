import { getMergedMessages } from '@grantjs/i18n/loader';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

/**
 * Merge shared and web messages. For top-level keys that exist in both (e.g. errors, common),
 * we deep-merge so shared validation/auth keys are not lost when web has its own errors/common.
 */
function mergeMessages(
  shared: Record<string, unknown>,
  web: Record<string, unknown>
): Record<string, unknown> {
  const allKeys = new Set([...Object.keys(shared), ...Object.keys(web)]);
  const result: Record<string, unknown> = {};
  for (const key of allKeys) {
    const sharedVal = shared[key];
    const webVal = web[key];
    const sharedObj =
      sharedVal != null && typeof sharedVal === 'object' && !Array.isArray(sharedVal);
    const webObj = webVal != null && typeof webVal === 'object' && !Array.isArray(webVal);
    if (sharedObj && webObj) {
      result[key] = {
        ...(sharedVal as Record<string, unknown>),
        ...(webVal as Record<string, unknown>),
      };
    } else {
      result[key] = webVal !== undefined ? webVal : sharedVal;
    }
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const sharedMessages = getMergedMessages(locale) as Record<string, unknown>;
  const webOnlyModule = await import(`@/i18n/locales/${locale}.json`).catch(
    () => import('@/i18n/locales/en.json')
  );
  const webOnly = webOnlyModule.default as Record<string, unknown>;
  const messages = mergeMessages(sharedMessages, webOnly);

  return {
    locale,
    messages,
  };
});
