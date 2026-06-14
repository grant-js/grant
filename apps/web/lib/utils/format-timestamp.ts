/** Formats a timestamp using the runtime default locale (browser/OS settings). */
export function formatLocalizedDateTime(timestamp: Date | string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatTimestamp(timestamp: Date | string): string {
  return formatLocalizedDateTime(timestamp);
}
