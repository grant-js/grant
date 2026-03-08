/**
 * Converts an env variable key from SCREAMING_SNAKE_CASE to title case for display.
 * e.g. SECURITY_ENABLE_RATE_LIMIT -> "Security Enable Rate Limit"
 */
export function envKeyToTitleCase(key: string): string {
  if (!key.trim()) return key;
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
