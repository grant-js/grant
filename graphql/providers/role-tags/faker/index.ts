import { addRoleTag } from '@/graphql/providers/role-tags/faker/addRoleTag';
import { getRoleTags } from '@/graphql/providers/role-tags/faker/getRoleTags';
import { removeRoleTag } from '@/graphql/providers/role-tags/faker/removeRoleTag';
import { RoleTagDataProvider } from '@/graphql/providers/role-tags/types';
export const roleTagFakerProvider: RoleTagDataProvider = {
  getRoleTags,
  addRoleTag,
  removeRoleTag,
};
