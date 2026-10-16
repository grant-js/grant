import { config } from '@/config';

/**
 * A frontend URL for `path` under the configured frontend origin, prefixed with a locale:
 * the requested one when supported, else the one `configuredUrl` already carries as its first
 * path segment, else the default locale.
 */
export function buildFrontendUrlWithLocale(
  configuredUrl: string,
  path: string,
  locale?: string | null
): string {
  const supported = new Set<string>(config.i18n.supportedLocales);
  const effectiveLocale =
    locale && supported.has(locale)
      ? locale
      : (() => {
          try {
            const parsed = new URL(configuredUrl);
            const firstSegment = parsed.pathname.replace(/^\//, '').split('/')[0];
            if (firstSegment && supported.has(firstSegment)) {
              return firstSegment;
            }
          } catch {
            // invalid URL, fall through
          }
          return config.i18n.defaultLocale;
        })();
  const base = config.security.frontendUrl.replace(/\/$/, '');
  return `${base}/${effectiveLocale}${path.startsWith('/') ? path : `/${path}`}`;
}
