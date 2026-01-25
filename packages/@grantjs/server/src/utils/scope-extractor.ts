import type { ScopeResolver } from '../types';
import type { Scope, Tenant } from '@grantjs/schema';

/**
 * Extract scope from Express request
 * Follows the same pattern as the API's extractScopeFromRequest
 */
export function extractScopeFromExpressRequest(request: unknown): Scope | null {
  const req = request as {
    headers?: {
      'x-scope-tenant'?: string;
      'x-scope-id'?: string;
    };
    query?: {
      scopeId?: string;
      tenant?: string;
      scope?: Scope | { tenant?: string; id?: string };
    };
    body?: {
      scope?: Scope;
    };
  };

  if (!req) return null;

  // Try headers first (X-Scope-Tenant and X-Scope-Id)
  if (req.headers) {
    const tenantHeader = req.headers['x-scope-tenant'];
    const idHeader = req.headers['x-scope-id'];

    if (tenantHeader && idHeader) {
      return {
        tenant: tenantHeader as Tenant,
        id: idHeader,
      };
    }
  }

  // Try query parameters
  if (req.query) {
    const scopeId = req.query.scopeId;
    const tenant = req.query.tenant;

    if (scopeId && tenant && typeof scopeId === 'string' && typeof tenant === 'string') {
      return {
        tenant: tenant as Tenant,
        id: scopeId,
      };
    }

    // Try scope object in query
    const scopeQuery = req.query.scope;
    if (scopeQuery && typeof scopeQuery === 'object') {
      const scopeObj = scopeQuery as { tenant?: string; id?: string };
      if (scopeObj.tenant && scopeObj.id) {
        return {
          tenant: scopeObj.tenant as Tenant,
          id: scopeObj.id,
        };
      }
    }
  }

  // Try request body
  if (req.body?.scope) {
    return req.body.scope as Scope;
  }

  return null;
}

/**
 * Extract scope from request using custom resolver or default extraction
 */
export async function extractScopeFromRequest(
  request: unknown,
  scopeResolver?: ScopeResolver
): Promise<Scope | null> {
  // Use custom scope resolver if provided
  if (scopeResolver) {
    return await scopeResolver(request);
  }

  // Default: try Express request extraction
  return extractScopeFromExpressRequest(request);
}
