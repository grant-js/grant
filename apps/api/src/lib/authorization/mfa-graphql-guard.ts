import { Resolver, Scope, Tenant, TokenType } from '@grantjs/schema';
import { GraphQLResolveInfo } from 'graphql';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError, AuthorizationError } from '@/lib/errors/error-classes';

import { isAuthenticatedGraphQL } from './auth-guard';
import { resolveOrgRequiresMfaForSensitiveActions } from './mfa-org-requirement';

export interface MfaGraphQLGuardOptions {
  allowPersonalContext?: boolean;
}

export function requireMfaGraphQL<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = GraphqlContext,
  TArgs = any,
>(
  options: MfaGraphQLGuardOptions,
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
    if (user!.type === TokenType.ApiKey || user!.type === TokenType.ProjectApp) {
      return resolverFn(parent, args, context, info);
    }
    const argsWithScope = args as { scope?: Scope; input?: { scope?: Scope } };
    const scope = user!.scope ?? argsWithScope.scope ?? argsWithScope.input?.scope ?? null;
    if (!scope) {
      return resolverFn(parent, args, context, info);
    }
    const isOrganizationScope =
      scope.tenant === Tenant.Organization ||
      scope.tenant === Tenant.OrganizationProject ||
      scope.tenant === Tenant.OrganizationProjectUser;
    if (!isOrganizationScope) {
      return resolverFn(parent, args, context, info);
    }
    if (allowPersonalContext && (await handlers.auth.isPersonalScope(scope))) {
      return resolverFn(parent, args, context, info);
    }
    const orgRequiresMfa = await resolveOrgRequiresMfaForSensitiveActions(
      scope,
      handlers.organizations.getOrganizations.bind(handlers.organizations)
    );
    const userRequiresMfa = await handlers.me.hasActiveMfaEnrollmentForUser(user!.userId);
    const requiresMfa = orgRequiresMfa || userRequiresMfa;
    if (!requiresMfa || user!.mfaVerified) {
      return resolverFn(parent, args, context, info);
    }
    throw new AuthorizationError('MFA required', 'MFA_REQUIRED', {
      hasActiveEnrollment: userRequiresMfa,
    });
  };

  return (
    typeof resolver === 'function' ? guardedResolver : { resolve: guardedResolver }
  ) as Resolver<TResult, TParent, TContext, TArgs>;
}
