import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { BadRequestError } from '@/lib/errors';

export const createUserAuthenticationMethodResolver: MutationResolvers<GraphqlContext>['createUserAuthenticationMethod'] =
  async (_parent, { input }, context) => {
    if (!context.user) {
      throw new BadRequestError('Authentication required', 'errors:auth.required');
    }

    // Ensure the userId in the input matches the authenticated user
    if (input.userId !== context.user.id) {
      throw new BadRequestError(
        'Cannot create authentication method for another user',
        'errors:auth.unauthorized'
      );
    }

    return await context.handlers.users.createUserAuthenticationMethod(
      context.user.id,
      {
        provider: input.provider,
        providerId: input.providerId,
        providerData: input.providerData as Record<string, unknown>,
        isVerified: input.isVerified ?? undefined,
        isPrimary: input.isPrimary ?? undefined,
      },
      context.locale
    );
  };
