export function getInitials(
  name: string | null | undefined,
  maxLength: number = 2,
  fallback: string = 'U'
): string {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return fallback.toUpperCase();
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return fallback.toUpperCase();
  }

  const initials = words
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength);

  return initials || fallback.toUpperCase();
}
