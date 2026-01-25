import { Scope, Tenant } from '@grantjs/schema';
import { Request } from 'express';

export function extractScopeFromRequest(req: Request): Scope | null {
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

  return null;
}
