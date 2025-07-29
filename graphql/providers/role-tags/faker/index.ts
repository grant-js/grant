import { RoleTagDataProvider } from '@/graphql/providers/role-tags/types';
import { getRoleTags } from '@/graphql/providers/role-tags/faker/getRoleTags';
import { addRoleTag } from '@/graphql/providers/role-tags/faker/addRoleTag';
import { removeRoleTag } from '@/graphql/providers/role-tags/faker/removeRoleTag';

export const roleTagFakerProvider: RoleTagDataProvider = {
  getRoleTags,
  addRoleTag,
  removeRoleTag,
};
