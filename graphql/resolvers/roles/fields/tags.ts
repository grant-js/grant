import { RoleResolvers } from '@/graphql/generated/types';

export const roleTagsResolver: RoleResolvers['tags'] = async (parent, _args, context) => {
  const roleId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.controllers.roles.getRoleTags({
    roleId,
    requestedFields: ['tags'],
  });
};
