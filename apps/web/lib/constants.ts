/** App version: from NEXT_PUBLIC_APP_VERSION at build time, or package.json version (see next.config.ts). */
export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function getDocsUrl(): string {
  return process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:5173';
}

export function getApiDocsUrl(): string {
  return `${getApiBaseUrl()}/api-docs`;
}

export function getGraphqlPlaygroundUrl(): string {
  return `${getApiBaseUrl()}/graphql`;
}
