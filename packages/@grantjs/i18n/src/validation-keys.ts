/**
 * Convention for Zod (and other) validation messages that are i18n keys.
 * A string is treated as a translation key if it contains a dot and no spaces,
 * e.g. "validation.passwordMismatch" or "errors.validation.required".
 * This allows mixing keys with legacy plain messages during migration.
 */
export function isTranslationKey(msg: string): boolean {
  if (typeof msg !== 'string' || msg.length === 0) return false;
  return msg.includes('.') && !msg.includes(' ');
}
