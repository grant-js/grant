import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { IsAuthorizedContextInput, IsAuthorizedPermissionInput } from '@grantjs/schema';
import { Request, Response, NextFunction } from 'express';

import { ResourceResolversMap } from '@/resource-resolvers';
import { ContextRequest } from '@/types';

import { isAuthenticatedRest } from './auth-guard';
import { ResourceResolver } from './types';

export interface RestGuardOptions {
  resource: ResourceSlug;
  action: ResourceAction;
  scopeRequiredMessage?: string;
  resourceResolver?: ResourceResolver | keyof ResourceResolversMap;
}

export function authorizeRestRoute(options: RestGuardOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const contextReq = req as ContextRequest;

    if (!isAuthenticatedRest(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHENTICATED',
      });
    }

    const { context } = contextReq;
    const scope = context.user?.scope ?? null;

    if (!scope) {
      return res.status(400).json({
        error: 'Scope required',
        code: 'SCOPE_REQUIRED',
        message:
          options.scopeRequiredMessage ||
          'Scope must be provided via X-Scope-Tenant and X-Scope-Id headers, or scopeId and tenant query params',
      });
    }

    let resolvedResource: Record<string, unknown> | null = null;

    if (options.resourceResolver) {
      const resolver =
        typeof options.resourceResolver === 'string'
          ? (context.resourceResolvers[options.resourceResolver] as unknown as ResourceResolver)
          : options.resourceResolver;

      if (resolver) {
        resolvedResource = await resolver({
          resourceSlug: options.resource,
          scope,
          context,
          request: req,
        });

        if (!resolvedResource) {
          return res.status(404).json({
            error: 'Resource not found',
            code: 'NOT_FOUND',
          });
        }
      }
    }

    const authContext: IsAuthorizedContextInput = {
      resource: resolvedResource || undefined,
    };

    const permission: IsAuthorizedPermissionInput = {
      resource: options.resource,
      action: options.action,
    };

    const result = await context.handlers.auth.isAuthorized({
      permission,
      context: authContext,
    });

    if (!result.authorized) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        reason: result.reason,
      });
    }

    (req as any).authorization = result;

    next();
  };
}
