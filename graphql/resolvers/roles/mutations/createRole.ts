import { MutationResolvers } from '@/graphql/generated/types';
export const createRoleResolver: MutationResolvers['createRole'] = async (
  _parent,
  { input },
  context
) => {
  const createdRole = await context.controllers.roles.createRole({ input });
  return createdRole;
};
