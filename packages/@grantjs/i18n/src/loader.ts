import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { SupportedLocale } from './locale';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Directory containing locale JSON files (locales/en/, locales/de/, ...) */
const LOCALES_DIR = path.join(__dirname, '..', 'locales');

/**
 * Returns the absolute path to the package's locales directory.
 * API can use this for i18next backend loadPath (e.g. join with '{{lng}}.json' for merged file).
 */
export function getLocalesPath(): string {
  return LOCALES_DIR;
}

const NAMESPACES = ['errors', 'common', 'email'] as const;

/**
 * Merged messages for a locale: { errors: {...}, common: {...}, email: {...} }.
 * Used by API (single-namespace i18next) and web (next-intl) with dot keys (e.g. errors.auth.tokenExpired).
 */
export type MergedMessages = {
  errors: Record<string, unknown>;
  common: Record<string, unknown>;
  email: Record<string, unknown>;
};

/**
 * Loads and merges the three namespace JSONs for the given locale.
 * Sync so it can be used at init time (e.g. i18next with a custom backend that reads merged object).
 */
export function getMergedMessages(locale: SupportedLocale): MergedMessages {
  const localeDir = path.join(LOCALES_DIR, locale);
  const result: MergedMessages = { errors: {}, common: {}, email: {} };
  for (const ns of NAMESPACES) {
    const filePath = path.join(localeDir, `${ns}.json`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    (result as Record<string, Record<string, unknown>>)[ns] = JSON.parse(raw) as Record<
      string,
      unknown
    >;
  }
  return result;
}
