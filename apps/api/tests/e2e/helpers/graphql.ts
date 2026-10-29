/**
 * GraphQL request helper for E2E tests.
 *
 * POSTs to /graphql with optional Authorization header.
 * Use for operations that are only exposed via GraphQL (e.g. projectApps).
 */
import { apiClient } from './api-client';

export interface GraphqlResponse<T = unknown> {
  status: number;
  body: {
    data?: T;
    errors?: Array<{ message: string; path?: string[]; extensions?: Record<string, unknown> }>;
  };
}

/**
 * Run a GraphQL query or mutation.
 *
 * @param options.query - GraphQL document string
 * @param options.variables - Optional variables
 * @param options.accessToken - Optional Bearer token (required for protected operations)
 * @param options.headers - Optional extra request headers (for example `x-scope-tenant` / `x-scope-id`)
 */
export async function graphqlRequest<T = unknown>(options: {
  query: string;
  variables?: Record<string, unknown>;
  accessToken?: string;
  headers?: Record<string, string>;
}): Promise<GraphqlResponse<T>> {
  const req = apiClient()
    .post('/graphql')
    .set('Content-Type', 'application/json')
    .send({ query: options.query, variables: options.variables ?? {} });

  if (options.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    req.set(name, value);
  }

  const res = await req;
  return {
    status: res.status,
    body: res.body as GraphqlResponse<T>['body'],
  };
}
