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

/** An untranslated i18n key (dotted, no spaces) is not something to show a user. */
export function isKeyLike(value: string): boolean {
  return value.includes('.') && !/\s/.test(value);
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

interface LabelledPermission {
  name: string;
  description?: string | null;
  action: string;
  resource?: { slug: string } | null;
}

/**
 * A permission's name or description. The API sends an i18n key whose casing does not always match
 * the catalogue (`permissions.names.ApiKey.Create` against `permissions.names.apiKey.create`), so
 * the camel-cased key is tried too. A name no catalogue knows reads as `Action Resource` rather
 * than as a raw key.
 */
export function translatePermissionField(
  t: KeyTranslator,
  permission: LabelledPermission,
  field: 'name' | 'description'
): string {
  const sent = permission[field];
  if (sent && t.has(sent)) return t(sent);
  if (permission.resource) {
    const bucket = field === 'name' ? 'names' : 'descriptions';
    const derived = `permissions.${bucket}.${lowerFirst(toCamelCaseSlug(permission.resource.slug))}.${lowerFirst(toCamelCaseSlug(permission.action))}`;
    if (t.has(derived)) return t(derived);
  }
  if (field === 'name' && sent && isKeyLike(sent) && permission.resource) {
    return `${permission.action} ${permission.resource.slug}`;
  }
  return sent ?? '';
}
