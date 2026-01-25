import { Resolver } from '@grantjs/schema';
import { Request, Response, NextFunction } from 'express';
import { GraphQLResolveInfo } from 'graphql';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors/error-classes';
import { ContextRequest } from '@/types';

export function isAuthenticatedRest(req: Request): boolean {
  const contextReq = req as ContextRequest;
  return !!contextReq.context?.user;
}

export function authenticateRestRoute(req: Request, res: Response, next: NextFunction) {
  if (!isAuthenticatedRest(req)) {
    throw new AuthenticationError('Unauthorized', 'errors.auth.unauthorized');
  }
  next();
}

export function isAuthenticatedGraphQL(context: GraphqlContext): boolean {
  return !!context.user;
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

export function authenticateGraphQLResolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = GraphqlContext,
  TArgs = any,
>(
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

    return await resolverFn(parent, args, context, info);
  };

  return (
    typeof resolver === 'function' ? guardedResolver : { resolve: guardedResolver }
  ) as Resolver<TResult, TParent, TContext, TArgs>;
}
