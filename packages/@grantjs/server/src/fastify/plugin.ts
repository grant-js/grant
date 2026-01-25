import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

import { AuthenticationError, AuthorizationError, BadRequestError, NotFoundError } from '../errors';
import { GrantClient } from '../grant-client';
import { extractScopeFromRequest } from '../utils/scope-extractor';
import { extractTokenFromRequest } from '../utils/token-extractor';

import type { ResourceResolver, ScopeResolver, AuthorizationResult, GrantServerConfig } from '../types';

/**
 * Extended Fastify Request with authorization result
 */
export interface AuthorizedFastifyRequest extends FastifyRequest {
  authorization?: AuthorizationResult;
}

/**
 * Options for Fastify preHandler hook
 */
export interface GrantOptions {
  /** The resource slug to check (e.g., "Organization", "Project", "Document") */
  resource: string;
  /** The action to check (e.g., "Query", "Create", "Update", "Delete") */
  action: string;
  /** Custom scope resolver (overrides default extraction) */
  scopeResolver?: ScopeResolver;
  /** Custom resource resolver for condition evaluation */
  resourceResolver?: ResourceResolver;
  /** Custom error message when scope is required but missing */
  scopeRequiredMessage?: string;
}

/**
 * Create a Fastify preHandler hook to check if user is granted permission
 *
 * @example
 * ```ts
 * import { grant } from '@grantjs/server/fastify';
 * import { GrantClient } from '@grantjs/server';
 * import Fastify from 'fastify';
 *
 * const fastify = Fastify();
 * const grantClient = new GrantClient({ apiUrl: 'https://api.grant.com' });
 *
 * fastify.get('/organizations', {
 *   preHandler: grant(grantClient, {
 *     resource: 'Organization',
 *     action: 'Query',
 *   }),
 * }, async (request, reply) => {
 *   return { organizations: [] };
 * });
 * ```
 */
export function grant(
  client: GrantClient,
  options: GrantOptions
): (request: AuthorizedFastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: AuthorizedFastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // 1. Check authentication (token must be present)
      const token = await extractTokenFromRequest(request, client.config);
      if (!token) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: 'UNAUTHENTICATED',
        });
        return;
      }

      // 2. Extract scope from request
      const requestScope = await extractScopeFromRequest(request, options.scopeResolver);

      if (!requestScope) {
        reply.status(400).send({
          error: 'Scope required',
          code: 'SCOPE_REQUIRED',
          message:
            options.scopeRequiredMessage ||
            'Scope must be provided via X-Scope-Tenant and X-Scope-Id headers, or scopeId and tenant query params',
        });
        return;
      }

      // 3. Optionally resolve resource for condition evaluation
      let resolvedResource: Record<string, unknown> | null = null;

      if (options.resourceResolver) {
        resolvedResource = await options.resourceResolver({
          resourceSlug: options.resource,
          scope: requestScope,
          request: request,
        });

        if (!resolvedResource) {
          reply.status(404).send({
            error: 'Resource not found',
            code: 'NOT_FOUND',
          });
          return;
        }
      }

      // 4. Check authorization (pass request for token extraction)
      const result = await client.isAuthorized(
        options.resource,
        options.action,
        {
          scope: requestScope,
          context: {
            resource: resolvedResource || undefined,
          },
        },
        request
      );

      if (!result.authorized) {
        reply.status(403).send({
          error: 'Forbidden',
          code: 'FORBIDDEN',
          reason: result.reason,
        });
        return;
      }

      // 5. Attach authorization result to request for downstream use
      request.authorization = result;
    } catch (error) {
      // Handle known errors
      if (error instanceof AuthenticationError) {
        reply.status(401).send({
          error: error.message,
          code: error.code,
        });
        return;
      }

      if (error instanceof AuthorizationError) {
        reply.status(403).send({
          error: error.message,
          code: error.code,
          reason: error.reason,
        });
        return;
      }

      if (error instanceof BadRequestError) {
        reply.status(400).send({
          error: error.message,
          code: error.code,
        });
        return;
      }

      if (error instanceof NotFoundError) {
        reply.status(404).send({
          error: error.message,
          code: error.code,
        });
        return;
      }

      // Unknown error - rethrow to let Fastify handle it
      throw error;
    }
  };
}

/**
 * Fastify plugin options
 * Extends GrantServerConfig - plugin-specific options can be added here in the future
 */
export type GrantPluginOptions = GrantServerConfig;

/**
 * Fastify plugin that decorates the instance with GrantClient
 *
 * @example
 * ```ts
 * import Fastify from 'fastify';
 * import { grantPlugin } from '@grantjs/server/fastify';
 *
 * const fastify = Fastify();
 *
 * await fastify.register(grantPlugin, {
 *   apiUrl: 'https://api.grant.com',
 *   cookieName: 'grant-access-token',
 * });
 *
 * // GrantClient is now available on fastify.grant
 * const canEdit = await fastify.grant.isGranted('Document', 'Update', { scope });
 * ```
 */
export const grantPlugin: FastifyPluginAsync<GrantPluginOptions> = async (fastify, options) => {
  const grant = new GrantClient(options);

  // Decorate Fastify instance with GrantClient
  fastify.decorate('grant', grant);
};

// Type declaration for TypeScript
// This will work once Fastify is installed (it's a peer dependency)
declare module 'fastify' {
  interface FastifyInstance {
    grant: GrantClient;
  }
}
