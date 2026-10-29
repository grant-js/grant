import { Scope } from '@grantjs/schema';
import { Request } from 'express';

import { validateRequestScope } from './scope-extractor';

/**
 * A scope an operation names in its own arguments, as received: not yet validated. A value that is
 * present but malformed is still returned, so that `namesOnlyTheAuthorizedScope` refuses it.
 */
type NamedScope = unknown;

const isPresent = (value: unknown): boolean => value !== undefined && value !== null;

/**
 * Every scope a GraphQL operation names in its resolver arguments: `args.scope` and
 * `args.input.scope`. Read from the arguments, not from `req.body.variables`: a literal written
 * inline in the document never appears in `variables`.
 */
export function graphqlNamedScopes(args: unknown): NamedScope[] {
  const record = (args ?? {}) as { scope?: unknown; input?: { scope?: unknown } | null };
  return [record.scope, record.input?.scope].filter(isPresent);
}

/**
 * Every scope a REST request names for the operation: `body.scope`, `body.input.scope`, the
 * `scope` query object and the `scopeId` + `tenant` query parameters.
 */
export function restNamedScopes(req: Request): NamedScope[] {
  const body = (req.body ?? {}) as { scope?: unknown; input?: { scope?: unknown } | null };
  const query = (req.query ?? {}) as { scope?: unknown; scopeId?: unknown; tenant?: unknown };

  const named: NamedScope[] = [body.scope, body.input?.scope];

  if (typeof query.scope === 'object') {
    named.push(query.scope);
  }
  if (isPresent(query.scopeId) || isPresent(query.tenant)) {
    named.push({ tenant: query.tenant, id: query.scopeId });
  }

  return named.filter(isPresent);
}

/**
 * The one comparison both transport guards make. An operation that names no scope is unaffected;
 * one that names a scope must name the scope the request was authorized in, in `tenant` and `id`.
 * A scope that does not survive the request-scope validation (unknown tenant, `system`, wrong
 * shape) is not the authorized scope either.
 *
 * Every scope the operation names is compared, not the first: the handler may act on any of them.
 */
export function namesOnlyTheAuthorizedScope(
  authorized: Scope,
  namedScopes: readonly NamedScope[]
): boolean {
  return namedScopes.every((named) => {
    const scope = validateRequestScope(named as Scope | null);
    return (
      scope !== null &&
      typeof scope.id === 'string' &&
      scope.tenant === authorized.tenant &&
      scope.id === authorized.id
    );
  });
}
