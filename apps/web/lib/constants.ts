import { getRuntimeConfig } from '@/lib/runtime-config';

/** Platform URL rule: frontend uses relative paths only (same-origin). */
export function getAppVersion(): string {
  return getRuntimeConfig().appVersion;
}

/** Same-origin: empty string so callers build relative paths (e.g. "/api/..."). */
export function getApiBaseUrl(): string {
  return '';
}

/**
 * Docs site base URL, without a trailing slash, so callers append `/<page>`.
 *
 * `DOCS_URL` (from `GET /api/config`) wins when the deployment sets it, e.g. an install that
 * links to the public docs instead of hosting `/docs` itself. Otherwise: in dev (port 3000) the
 * VitePress dev server for HMR, else same-origin `/docs`.
 */
export function getDocsUrl(docsUrl: string | null = getRuntimeConfig().docsUrl): string {
  if (docsUrl) return docsUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    return window.location.port === '3000' ? 'http://localhost:5173/docs' : '/docs';
  }
  return process.env.NODE_ENV === 'development' ? 'http://localhost:5173/docs' : '/docs';
}

/** API docs path (relative). Only served when `apiReferenceEnabled`. */
export function getApiDocsUrl(): string {
  return '/api-docs';
}

/** GraphQL endpoint path (relative). Opens the Apollo Sandbox only when `graphqlPlaygroundEnabled`. */
export function getGraphqlPlaygroundUrl(): string {
  return '/graphql';
}
