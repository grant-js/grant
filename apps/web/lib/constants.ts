import { getRuntimeConfig } from '@/lib/runtime-config';

/** Platform URL rule: frontend uses relative paths only (same-origin). */
export function getAppVersion(): string {
  return getRuntimeConfig().appVersion;
}

/** Same-origin: empty string so callers build relative paths (e.g. "/api/..."). */
export function getApiBaseUrl(): string {
  return '';
}

/** Docs URL: in dev (port 3000) link to VitePress directly for HMR; otherwise same-origin /docs. */
export function getDocsUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.port === '3000' ? 'http://localhost:5173/docs' : '/docs';
  }
  return process.env.NODE_ENV === 'development' ? 'http://localhost:5173/docs' : '/docs';
}

/** API docs path (relative). */
export function getApiDocsUrl(): string {
  return '/api-docs';
}

/** GraphQL endpoint path (relative). */
export function getGraphqlPlaygroundUrl(): string {
  return '/graphql';
}
