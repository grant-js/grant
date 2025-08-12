import { addRoleGroup } from '@/graphql/providers/role-groups/faker/addRoleGroup';
import { getRoleGroups } from '@/graphql/providers/role-groups/faker/getRoleGroups';
import { removeRoleGroup } from '@/graphql/providers/role-groups/faker/removeRoleGroup';
import { RoleGroupDataProvider } from '@/graphql/providers/role-groups/types';
export const roleGroupFakerProvider: RoleGroupDataProvider = {
  getRoleGroups,
  addRoleGroup,
  removeRoleGroup,
};
