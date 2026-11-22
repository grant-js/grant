/** Hosts the config app may probe even when they resolve privately (local Grant API). */
export const LOCAL_HEALTH_CHECK_HOSTS = ['localhost', '127.0.0.1', '::1'] as const;

function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
}

export function toHealthCheckUrl(appUrl: string): string {
  return `${stripTrailingSlashes(appUrl)}/health`;
}
