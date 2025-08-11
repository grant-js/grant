import { roleTagRoleResolver } from '@/graphql/resolvers/role-tags/fields/role';
import { roleTagTagResolver } from '@/graphql/resolvers/role-tags/fields/tag';

export const RoleTag = {
  role: roleTagRoleResolver,
  tag: roleTagTagResolver,
};
