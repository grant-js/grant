import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { BadRequestError } from '@/lib/errors';
import { validateInput } from '@/services/common';
import { passwordChangeSchema } from '@/services/user-authentication-methods.schemas';

export const changePasswordResolver: MutationResolvers<GraphqlContext>['changePassword'] = async (
  _parent,
  { input },
  context
) => {
  if (!context.user) {
    throw new BadRequestError('Authentication required', 'errors:auth.required');
  }

  validateInput(passwordChangeSchema, input, 'changePassword');

  await context.handlers.users.changePassword(
    context.user.id,
    input.currentPassword,
    input.newPassword
  );

  return {
    success: true,
    message: 'Password changed successfully',
  };
};
