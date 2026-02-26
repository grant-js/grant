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
