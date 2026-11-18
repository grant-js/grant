/**
 * Whether a GraphQL failure carries the domain error `code` in its extensions (`CONFLICT`,
 * `NOT_FOUND`, …). Reads Apollo's combined error (`errors`) and the older `graphQLErrors`,
 * so a caller can act on the code without parsing the message.
 */
export function hasGraphQLErrorCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { errors?: unknown; graphQLErrors?: unknown };
  for (const list of [record.errors, record.graphQLErrors]) {
    if (!Array.isArray(list)) continue;
    for (const candidate of list) {
      const extensions = (candidate as { extensions?: Record<string, unknown> } | null)?.extensions;
      if (extensions?.code === code) return true;
    }
  }
  return false;
}
