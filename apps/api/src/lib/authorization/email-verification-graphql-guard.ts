import { Resolver, Scope, TokenType } from '@grantjs/schema';
import { GraphQLResolveInfo } from 'graphql';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError, AuthorizationError } from '@/lib/errors/error-classes';

import { isAuthenticatedGraphQL } from './auth-guard';

export interface EmailVerificationGraphQLGuardOptions {
  allowPersonalContext?: boolean;
}

export function requireEmailVerificationGraphQL<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = GraphqlContext,
  TArgs = any,
>(
  options: EmailVerificationGraphQLGuardOptions,
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): Resolver<TResult, TParent, TContext, TArgs> {
  const { allowPersonalContext = true } = options;
  const resolverFn = typeof resolver === 'function' ? resolver : resolver.resolve;

  const guardedResolver = async (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
  ): Promise<TResult> => {
    const ctx = context as GraphqlContext;

    if (!isAuthenticatedGraphQL(ctx)) {
      throw new AuthenticationError('Unauthorized');
    }

    const { user, handlers } = ctx;

    if (user!.type === TokenType.ApiKey || user!.isVerified) {
      return resolverFn(parent, args, context, info);
    }

    if (allowPersonalContext) {
      const argsWithScope = args as { scope?: Scope; input?: { scope?: Scope } };
      const scope = argsWithScope.scope || argsWithScope.input?.scope;
      if (scope && (await handlers.auth.isPersonalScope(scope))) {
        return resolverFn(parent, args, context, info);
      }
    }

    throw new AuthorizationError('Email verification required', 'EMAIL_VERIFICATION_REQUIRED');
  };

  return (
    typeof resolver === 'function' ? guardedResolver : { resolve: guardedResolver }
  ) as Resolver<TResult, TParent, TContext, TArgs>;
}
