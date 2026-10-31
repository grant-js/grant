export interface KeyTranslator {
  (key: string): string;
  has(key: string): boolean;
}

/** Permission and resource names arrive as i18n keys in some installations and as plain text in others. */
export function translateOrRaw(t: KeyTranslator, key: string | null | undefined): string {
  if (!key) return '';
  return t.has(key) ? t(key) : key;
}

export function toCamelCaseSlug(slug: string): string {
  return slug
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}
