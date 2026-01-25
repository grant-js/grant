import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  IsAuthorizedContextInput,
  IsAuthorizedPermissionInput,
  Resolver,
  Scope,
} from '@grantjs/schema';
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
import { ResourceResolver } from './types';

export interface GraphQLGuardOptions {
  resource: ResourceSlug;
  action: ResourceAction;
  resourceResolver?: ResourceResolver | keyof ResourceResolversMap;
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
      throw new AuthenticationError('Unauthorized', 'errors.auth.unauthorized');
    }

    const argsWithScope = args as { scope?: Scope; input?: { scope?: Scope } };
    const requestScope = argsWithScope.scope || argsWithScope.input?.scope;

    if (!requestScope) {
      throw new BadRequestError('Scope is required', 'errors.validation.scope_required');
    }

    let resolvedResource: Record<string, unknown> | null = null;

    if (options.resourceResolver) {
      const resolver =
        typeof options.resourceResolver === 'string'
          ? ((context as GraphqlContext).resourceResolvers[
              options.resourceResolver
            ] as unknown as ResourceResolver)
          : options.resourceResolver;

      if (resolver) {
        resolvedResource = await resolver({
          resourceSlug: options.resource,
          scope: requestScope,
          context: context as GraphqlContext,
          request: args,
        });

        if (!resolvedResource) {
          throw new NotFoundError('Resource not found', 'errors:notFound.resource');
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

    const result = await (context as GraphqlContext).handlers.auth.isAuthorized(
      {
        permission,
        context: authContext,
      },
      requestScope
    );

    if (!result.authorized) {
      throw new AuthorizationError('Forbidden', 'errors.auth.forbidden', undefined, {
        reason: result.reason,
      });
    }

    return await resolverFn(parent, args, context, info);
  };

  return (
    typeof resolver === 'function' ? guardedResolver : { resolve: guardedResolver }
  ) as Resolver<TResult, TParent, TContext, TArgs>;
}
