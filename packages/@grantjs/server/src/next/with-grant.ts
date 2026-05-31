import { NextRequest, NextResponse } from 'next/server';

import { GrantClient } from '../grant-client';
import type { AuthorizationResult, ResourceResolver } from '../types';
import { debugGrant } from '../utils/debug';
import { extractTokenFromRequest } from '../utils/token-extractor';

/**
 * Options for Next.js route handler guard
 */
export interface GrantOptions {
  /** The resource slug to check (e.g., "Organization", "Project", "Document") */
  resource: string;
  /** The action to check (e.g., "Query", "Create", "Update", "Delete") */
  action: string;
  /** Custom resource resolver for condition evaluation */
  resourceResolver?: ResourceResolver;
}

/**
 * Context passed to the handler after authorization (for downstream use)
 */
export interface WithGrantContext {
  authorization: AuthorizationResult;
}

/** Next.js 15+ App Router route context (`params` is a Promise). */
export type NextRouteContext = {
  params: Promise<Record<string, string>>;
};

/**
 * Next.js App Router route handler type (GET, POST, etc.)
 * Second argument is Grant authorization context after the guard runs.
 */
export type GrantRouteHandler = (
  request: NextRequest,
  context?: WithGrantContext
) => Promise<Response> | Response;

/**
 * Wrap a Next.js App Router route handler with Grant authorization.
 * Use for GET, POST, PUT, PATCH, DELETE in app/api/.../route.ts.
 *
 * Compatible with Next.js 13–16. In Next 15+, the route context's `params` is a Promise;
 * this wrapper does not use params (only `request` is passed to the resolver/handler).
 *
 * @example
 * ```ts
 * // app/api/documents/route.ts
 * import { withGrant } from '@grantjs/server/next';
 * import { GrantClient } from '@grantjs/server';
 *
 * const grantClient = new GrantClient({ apiUrl: process.env.GRANT_API_URL! });
 *
 * export const GET = withGrant(
 *   grantClient,
 *   { resource: 'Document', action: 'Query' },
 *   async (request) => NextResponse.json({ data: [] })
 * );
 *
 * export const POST = withGrant(
 *   grantClient,
 *   { resource: 'Document', action: 'Create' },
 *   async (request) => { ... }
 * );
 * ```
 */
export function withGrant(
  client: GrantClient,
  options: GrantOptions,
  handler: GrantRouteHandler
): (request: NextRequest, routeContext: NextRouteContext) => Promise<Response> {
  return async (request: NextRequest, _routeContext: NextRouteContext): Promise<Response> => {
    debugGrant('Next', { resource: options.resource, action: options.action });

    const token = await extractTokenFromRequest(request, client.config);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    let resolvedResource: Record<string, unknown> | null = null;

    if (options.resourceResolver) {
      resolvedResource = await options.resourceResolver({
        resourceSlug: options.resource,
        request,
      });
      if (!resolvedResource) {
        return NextResponse.json(
          { error: 'Resource not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
    }

    const result = await client.isAuthorized(
      options.resource,
      options.action,
      {
        context: {
          resource: resolvedResource ?? undefined,
        },
      },
      request
    );

    debugGrant('Next', {
      resource: options.resource,
      action: options.action,
      authorized: result.authorized,
      ...(result.authorized ? {} : { reason: result.reason }),
    });

    if (!result.authorized) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          reason: result.reason,
        },
        { status: 403 }
      );
    }

    return handler(request, { authorization: result });
  };
}
