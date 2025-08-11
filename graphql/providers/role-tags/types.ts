import {
  MutationAddRoleTagArgs,
  MutationRemoveRoleTagArgs,
  QueryRoleTagsArgs,
  RoleTag,
} from '@/graphql/generated/types';

export interface RoleTagDataProvider {
  getRoleTags(params: QueryRoleTagsArgs): Promise<RoleTag[]>;
  addRoleTag(params: MutationAddRoleTagArgs): Promise<RoleTag>;
  removeRoleTag(params: MutationRemoveRoleTagArgs): Promise<RoleTag>;
}
