const DEBUG_GRANT_ENV = 'DEBUG_GRANT';

/** Whether Grant debug logging is enabled (set DEBUG_GRANT=1 in development). */
function isDebugGrant(): boolean {
  return process.env[DEBUG_GRANT_ENV] === '1';
}

/**
 * Log Grant integration debug info when DEBUG_GRANT=1.
 * Used by Express middleware, Fastify grant hook, Next withGrant, and Nest GrantGuard.
 * Set DEBUG_GRANT=1 in .env or the environment to see resource, action, and outcome in development.
 */
export function debugGrant(integration: string, data: Record<string, unknown>): void {
  if (!isDebugGrant()) return;
  console.debug(`[Grant ${integration}]`, data);
}
