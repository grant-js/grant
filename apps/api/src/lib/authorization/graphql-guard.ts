import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { IsAuthorizedContextInput, IsAuthorizedPermissionInput, Resolver } from '@grantjs/schema';
import { GraphQLResolveInfo } from 'graphql';

import { GraphqlContext } from '@/graphql/types';
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  NotFoundError,
} from '@/lib/errors/error-classes';
import { ResourceResolversMap } from '@/resource-resolvers';

import { isAuthenticatedGraphQL } from './auth-guard';
import { graphqlNamedScopes, namesOnlyTheAuthorizedScope } from './operation-scope';
import { ResourceResolver } from './types';

/**
 * Set on every function `authorizeGraphQLResolver` returns, and carried outwards by the gates that
 * wrap it (`inheritAuthorizationMark`), so a test can tell a resolver that is authorized from one
 * that is not without calling it.
 */
const AUTHORIZED_GRAPHQL_RESOLVER = Symbol('grant.authorizedGraphQLResolver');

type MarkedFunction = ((...args: never[]) => unknown) & { [AUTHORIZED_GRAPHQL_RESOLVER]?: true };

function resolverFunction(resolver: unknown): MarkedFunction | undefined {
  const candidate =
    typeof resolver === 'function' ? resolver : (resolver as { resolve?: unknown })?.resolve;
  return typeof candidate === 'function' ? (candidate as MarkedFunction) : undefined;
}

export function isAuthorizedGraphQLResolver(resolver: unknown): boolean {
  return resolverFunction(resolver)?.[AUTHORIZED_GRAPHQL_RESOLVER] === true;
}

/** Carries the authorization mark from a wrapped resolver to the function that wraps it. */
export function inheritAuthorizationMark(
  inner: unknown,
  outer: (...args: never[]) => unknown
): void {
  if (isAuthorizedGraphQLResolver(inner)) {
    (outer as MarkedFunction)[AUTHORIZED_GRAPHQL_RESOLVER] = true;
  }
}

export interface GraphQLGuardOptions {
  resource: ResourceSlug;
  action: ResourceAction;
  resourceResolver?: ResourceResolver | keyof ResourceResolversMap;
  /** When set, overrides `action`. Ignored if `resolveActions` is provided. */
  resolveAction?: (args: Record<string, unknown>) => ResourceAction;
  /** Ordered actions to try; first match wins. Falls back to `[action]` when omitted. */
  resolveActions?: (args: Record<string, unknown>) => ResourceAction[];
}

function extractResolverFn<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult> {
  if (typeof resolver === 'function') {
    return resolver;
  }
  return resolver.resolve;
}

export function authorizeGraphQLResolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = GraphqlContext,
  TArgs = any,
>(
  options: GraphQLGuardOptions,
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): Resolver<TResult, TParent, TContext, TArgs> {
  const resolverFn = extractResolverFn(resolver);

  const guardedResolver = async (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
  ): Promise<TResult> => {
    if (!isAuthenticatedGraphQL(context as GraphqlContext)) {
      throw new AuthenticationError('Unauthorized');
    }

    const gqlContext = context as GraphqlContext;
    const scope = gqlContext.user?.scope ?? null;

    if (!scope) {
      throw new BadRequestError('Scope is required');
    }

    if (!namesOnlyTheAuthorizedScope(scope, graphqlNamedScopes(args))) {
      throw new AuthorizationError('Forbidden');
    }

    let resolvedResource: Record<string, unknown> | null = null;

    if (options.resourceResolver) {
      const resolver =
        typeof options.resourceResolver === 'string'
          ? (gqlContext.resourceResolvers[options.resourceResolver] as unknown as ResourceResolver)
          : options.resourceResolver;

      if (resolver) {
        resolvedResource = await resolver({
          resourceSlug: options.resource,
          scope,
          context: gqlContext,
          request: args,
        });

        if (!resolvedResource) {
          throw new NotFoundError('Resource');
        }
      }
    }

    const authContext: IsAuthorizedContextInput = {
      resource: resolvedResource || undefined,
    };

    const argsRecord = args as Record<string, unknown>;
    const actions = options.resolveActions?.(argsRecord) ?? [
      options.resolveAction?.(argsRecord) ?? options.action,
    ];

    let lastReason: string | undefined;
    for (const action of actions) {
      const permission: IsAuthorizedPermissionInput = {
        resource: options.resource,
        action,
      };

      const result = await gqlContext.handlers.auth.isAuthorized({
        permission,
        context: authContext,
      });

      if (result.authorized) {
        return await resolverFn(parent, args, context, info);
      }

      lastReason = result.reason ?? undefined;
    }

    throw new AuthorizationError('Forbidden', lastReason);
  };

  (guardedResolver as MarkedFunction)[AUTHORIZED_GRAPHQL_RESOLVER] = true;

  return (
    typeof resolver === 'function' ? guardedResolver : { resolve: guardedResolver }
  ) as Resolver<TResult, TParent, TContext, TArgs>;
}
