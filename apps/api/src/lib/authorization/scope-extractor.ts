import { Scope, Tenant } from '@grantjs/schema';
import { Request } from 'express';

const KNOWN_TENANTS: ReadonlySet<string> = new Set(Object.values(Tenant));

/**
 * Rejects a scope whose tenant is not a `Tenant` enum member.
 *
 * Every extraction path below casts `tenant` out of a header, query param, or
 * request body with `as Tenant` and no check, so until this ran the value on
 * `context.user.scope` was whatever the caller sent. Downstream that value
 * indexes the `CacheHandler` scoped-id dispatch, where an unrecognised key used
 * to reach `Object.prototype` and resolve instead of being rejected.
 *
 * The dispatch is now hardened independently. This is the other half: an
 * unknown tenant should never have been admitted to a request context in the
 * first place, and treating it as absent makes the caller fail authorization
 * rather than fail some deeper invariant.
 */
function validated(scope: Scope | null): Scope | null {
  if (!scope || typeof scope.tenant !== 'string' || !KNOWN_TENANTS.has(scope.tenant)) {
    return null;
  }
  return scope;
}

export function extractScopeFromRequest(req: Request): Scope | null {
  return validated(readScopeFromRequest(req));
}

function readScopeFromRequest(req: Request): Scope | null {
  const tenantHeader = req.headers['x-scope-tenant'];
  const idHeader = req.headers['x-scope-id'];

  if (tenantHeader && idHeader) {
    return {
      tenant: tenantHeader as Tenant,
      id: idHeader as string,
    };
  }

  const scopeId = req.query.scopeId;
  const tenant = req.query.tenant;
  if (scopeId && tenant && typeof scopeId === 'string' && typeof tenant === 'string') {
    return {
      tenant: tenant as Tenant,
      id: scopeId,
    };
  }

  const scopeQuery = req.query.scope;
  if (scopeQuery && typeof scopeQuery === 'object') {
    const nestedTenant = (scopeQuery as any).tenant;
    const nestedId = (scopeQuery as any).id;
    if (nestedTenant && nestedId) {
      return {
        tenant: nestedTenant as Tenant,
        id: nestedId as string,
      };
    }
  }

  if (req.body?.scope) {
    return req.body.scope as Scope;
  }

  // GraphQL: scope may be in body.variables.scope or body.variables.input.scope
  const variables = req.body?.variables;
  if (variables && typeof variables === 'object') {
    const varsScope = (variables as { scope?: Scope; input?: { scope?: Scope } }).scope;
    if (varsScope && typeof varsScope === 'object' && 'tenant' in varsScope && 'id' in varsScope) {
      return varsScope as Scope;
    }
    const inputScope = (variables as { input?: { scope?: Scope } }).input?.scope;
    if (
      inputScope &&
      typeof inputScope === 'object' &&
      'tenant' in inputScope &&
      'id' in inputScope
    ) {
      return inputScope as Scope;
    }
  }

  return null;
}

/**
 * Resolver request: Express Request (REST) or GraphQL resolver args.
 * Use when the same resolver is called from both transports (REST passes req, GraphQL passes args).
 */
function isExpressRequest(request: Request | Record<string, unknown>): request is Request {
  const r = request as Request;
  return typeof r?.get === 'function' && r.body !== undefined;
}

/**
 * Extract scope from either Express Request (REST) or resolver args (GraphQL).
 * Scope must include both id and tenant; no default tenant is applied.
 */
export function extractScopeFromResolverRequest(
  request: Request | Record<string, unknown>
): Scope | null {
  if (isExpressRequest(request)) {
    return extractScopeFromRequest(request);
  }

  const r = request as Record<string, unknown>;
  const fromScope = r?.scope;
  if (
    fromScope &&
    typeof fromScope === 'object' &&
    typeof (fromScope as { id?: string }).id === 'string' &&
    typeof (fromScope as { tenant?: string }).tenant === 'string'
  ) {
    const scope = fromScope as { id: string; tenant: string };
    return { id: scope.id, tenant: scope.tenant as Tenant };
  }
  const fromInput =
    r?.input && typeof r.input === 'object'
      ? (r.input as { scope?: { id: string; tenant?: string } }).scope
      : undefined;
  if (
    fromInput &&
    typeof fromInput === 'object' &&
    typeof fromInput.id === 'string' &&
    typeof fromInput.tenant === 'string'
  ) {
    return { id: fromInput.id, tenant: fromInput.tenant as Tenant };
  }
  const scopeId =
    r?.query && typeof r.query === 'object'
      ? (r.query as { scopeId?: string; tenant?: string }).scopeId
      : undefined;
  const tenant =
    r?.query && typeof r.query === 'object' ? (r.query as { tenant?: string }).tenant : undefined;
  if (typeof scopeId === 'string' && typeof tenant === 'string') {
    return { id: scopeId, tenant: tenant as Tenant };
  }
  return null;
}
